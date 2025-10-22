import { AnalystSession, CandidateReview, SessionMetrics } from '../types/candidate';

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Funções auxiliares para Google Sheets
async function appendToSheet(sheetName: string, values: any[][]): Promise<boolean> {
  if (!SPREADSHEET_ID || !cachedAccessToken) {
    console.error('❌ Configuração faltando para escrita');
    return false;
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values })
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao adicionar dados:', error);
    return false;
  }
}

async function updateSheet(sheetName: string, range: string, values: any[][]): Promise<boolean> {
  if (!SPREADSHEET_ID || !cachedAccessToken) {
    console.error('❌ Configuração faltando para escrita');
    return false;
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!${range}?valueInputOption=USER_ENTERED`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values })
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao atualizar dados:', error);
    return false;
  }
}

async function readSheet(sheetName: string, range: string = 'A:Z'): Promise<any[][] | null> {
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ Configuração faltando para leitura');
    return null;
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!${range}?key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('❌ Erro ao ler dados:', error);
    return null;
  }
}

// Sistema de token OAuth (já existente)
let cachedAccessToken: string | null = null;

export function setAccessToken(token: string) {
  cachedAccessToken = token;
  console.log('🔑 Token OAuth configurado para sessões');
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

// Geração de ID único
function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function createSession(analystEmail: string): Promise<string | null> {
  try {
    const sessionId = generateId();
    const startedAt = new Date().toISOString();

    const success = await appendToSheet('Sessions', [[
      sessionId,
      analystEmail, // analyst_email
      startedAt,    // started_at
      '',           // ended_at (vazio inicialmente)
      0,            // total_reviewed
      'ativa'       // status
    ]]);

    if (!success) {
      throw new Error('Falha ao criar sessão na planilha');
    }

    console.log('✅ Sessão criada:', sessionId);
    return sessionId;
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error);
    return null;
  }
}

export async function endSession(sessionId: string): Promise<boolean> {
  try {
    // Buscar todas as sessões para encontrar a linha correta
    const sessions = await readSheet('Sessions');
    if (!sessions || sessions.length < 2) {
      throw new Error('Nenhuma sessão encontrada');
    }

    const headers = sessions[0];
    let rowIndex = -1;

    // Encontrar a linha com o sessionId (coluna A)
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i][0] === sessionId) {
        rowIndex = i + 1; // +1 porque Sheets começa na linha 1
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Sessão não encontrada');
    }

    const endedAt = new Date().toISOString();
    const success = await updateSheet('Sessions', `D${rowIndex}:E${rowIndex}`, [[
      endedAt, // ended_at
      'finalizada' // status
    ]]);

    if (!success) {
      throw new Error('Falha ao atualizar sessão');
    }

    console.log('✅ Sessão finalizada:', sessionId);
    return true;
  } catch (error) {
    console.error('❌ Erro ao finalizar sessão:', error);
    return false;
  }
}

export async function updateSessionReviewCount(sessionId: string): Promise<boolean> {
  try {
    const sessions = await readSheet('Sessions');
    if (!sessions || sessions.length < 2) {
      throw new Error('Nenhuma sessão encontrada');
    }

    let rowIndex = -1;
    let currentCount = 0;

    // Encontrar a sessão e contar reviews atual
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i][0] === sessionId) {
        rowIndex = i + 1;
        currentCount = parseInt(sessions[i][4]) || 0;
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Sessão não encontrada');
    }

    const newCount = currentCount + 1;
    const success = await updateSheet('Sessions', `E${rowIndex}`, [[newCount]]);

    if (!success) {
      throw new Error('Falha ao atualizar contador');
    }

    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar contador de sessão:', error);
    return false;
  }
}

export async function createReview(
  candidateRegistrationNumber: string,
  status: 'Classificado' | 'Desclassificado' | 'Revisar',
  sessionId: string,
  analystEmail: string,
  durationSeconds?: number
): Promise<boolean> {
  try {
    const reviewedAt = new Date().toISOString();

    const success = await appendToSheet('Reviews', [[
      candidateRegistrationNumber,
      analystEmail,        // analyst_email
      status,
      sessionId,
      durationSeconds || '',
      reviewedAt,
      new Date().toLocaleDateString('pt-BR') // data para agrupamento
    ]]);

    if (!success) {
      throw new Error('Falha ao criar review na planilha');
    }

    // Atualizar contador da sessão
    await updateSessionReviewCount(sessionId);
    
    console.log('✅ Review criado para candidato:', candidateRegistrationNumber);
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar review:', error);
    return false;
  }
}

export async function getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
  try {
    const reviews = await readSheet('Reviews');
    
    if (!reviews || reviews.length < 2) {
      return {
        totalReviewed: 0,
        averageTimePerCandidate: 0,
        classified: 0,
        disqualified: 0,
        review: 0
      };
    }

    const sessionReviews = reviews.filter((row, index) => 
      index > 0 && row[3] === sessionId // row[3] = session_id
    );

    if (sessionReviews.length === 0) {
      return {
        totalReviewed: 0,
        averageTimePerCandidate: 0,
        classified: 0,
        disqualified: 0,
        review: 0
      };
    }

    const totalDuration = sessionReviews.reduce((sum, review) => {
      const duration = parseInt(review[4]) || 0; // review[4] = duration_seconds
      return sum + duration;
    }, 0);

    const validDurations = sessionReviews.filter(review => review[4] && parseInt(review[4]) > 0).length;

    return {
      totalReviewed: sessionReviews.length,
      averageTimePerCandidate: validDurations > 0 ? totalDuration / validDurations : 0,
      classified: sessionReviews.filter(review => review[2] === 'Classificado').length,
      disqualified: sessionReviews.filter(review => review[2] === 'Desclassificado').length,
      review: sessionReviews.filter(review => review[2] === 'Revisar').length
    };
  } catch (error) {
    console.error('❌ Erro ao obter métricas da sessão:', error);
    return null;
  }
}

export async function getCandidateLastReview(registrationNumber: string): Promise<CandidateReview | null> {
  try {
    const reviews = await readSheet('Reviews');
    
    if (!reviews || reviews.length < 2) {
      return null;
    }

    const candidateReviews = reviews.filter((row, index) => 
      index > 0 && row[0] === registrationNumber // row[0] = registration_number
    );

    if (candidateReviews.length === 0) {
      return null;
    }

    // Ordenar por data (mais recente primeiro)
    candidateReviews.sort((a, b) => new Date(b[5]).getTime() - new Date(a[5]).getTime());
    
    const lastReview = candidateReviews[0];

    return {
      candidate_registration_number: lastReview[0],
      analyst_email: lastReview[1],
      status: lastReview[2],
      session_id: lastReview[3],
      review_duration_seconds: lastReview[4] ? parseInt(lastReview[4]) : null,
      reviewed_at: lastReview[5]
    };
  } catch (error) {
    console.error('❌ Erro ao obter último review do candidato:', error);
    return null;
  }
}

// Função para inicializar as abas necessárias
export async function initializeSheets(): Promise<boolean> {
  try {
    // Verificar se as abas existem, se não, criar cabeçalhos
    const sessions = await readSheet('Sessions');
    if (!sessions || sessions.length === 0) {
      const success = await appendToSheet('Sessions', [[
        'session_id',
        'analyst_email', 
        'started_at',
        'ended_at',
        'total_reviewed',
        'status'
      ]]);
      if (!success) {
        console.warn('⚠️ Não foi possível criar cabeçalho da aba Sessions');
      }
    }

    const reviews = await readSheet('Reviews');
    if (!reviews || reviews.length === 0) {
      const success = await appendToSheet('Reviews', [[
        'candidate_registration_number',
        'analyst_email',
        'status',
        'session_id', 
        'review_duration_seconds',
        'reviewed_at',
        'review_date'
      ]]);
      if (!success) {
        console.warn('⚠️ Não foi possível criar cabeçalho da aba Reviews');
      }
    }

    console.log('✅ Abas de sessão e reviews inicializadas');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar abas:', error);
    return false;
  }
}
