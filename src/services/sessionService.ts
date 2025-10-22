// sheetsService.ts

import { Candidate } from '../types/candidate';

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

let cachedAccessToken: string | null = null;

export function setAccessToken(token: string) {
  cachedAccessToken = token;
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

// Função para atualizar a planilha (usando OAuth para escrita)
async function updateSheet(range: string, values: any[][]): Promise<boolean> {
  if (!SPREADSHEET_ID || !cachedAccessToken) {
    console.error('Missing configuration for write operation');
    return false;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating sheet:', error);
    return false;
  }
}

// Função para processar URLs de documentos (quando múltiplos URLs estão em uma célula)
function processDocumentUrls(urlString: string): string[] {
  if (!urlString) return [];
  
  if (Array.isArray(urlString)) return urlString;
  
  const separators = /<br>|,|\n/;
  return urlString.split(separators)
    .map(url => url.trim())
    .filter(url => url.length > 0 && url !== 'undefined');
}

// Inicializar colunas de triagem se não existirem
export async function initializeSpreadsheet(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/A1:Z1?key=${API_KEY}`
    );
    
    const data = await response.json();
    const headers = data.values?.[0] || [];
    
    const missingHeaders: { range: string, value: string }[] = [];
    if (!headers.includes('Status Triagem')) missingHeaders.push({ range: 'Q1', value: 'Status Triagem' });
    if (!headers.includes('Data/Hora Triagem')) missingHeaders.push({ range: 'R1', value: 'Data/Hora Triagem' }); 
    if (!headers.includes('Analista Triagem')) missingHeaders.push({ range: 'S1', value: 'Analista Triagem' });
    
    if (missingHeaders.length > 0 && cachedAccessToken) {
      console.log('Adicionando colunas de triagem...');
      
      for (const header of missingHeaders) {
        await updateSheet(header.range, [[header.value]]);
      }
      
      console.log('Colunas de triagem adicionadas com sucesso');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao inicializar planilha:', error);
    return false;
  }
}

export async function fetchCandidates(): Promise<Candidate[]> {
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('Variáveis de ambiente faltando:', {
      VITE_GOOGLE_SHEETS_ID: SPREADSHEET_ID ? '✅' : '❌',
      VITE_GOOGLE_API_KEY: API_KEY ? '✅' : '❌'
    });
    return [];
  }

  try {
    // Inicializar colunas se necessário
    await initializeSpreadsheet();

    const range = 'A:S';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    console.log('Buscando candidatos...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erro na API Google Sheets:', errorData);
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      console.warn('Nenhum candidato encontrado na planilha');
      return [];
    }

    const headers = rows[0];
    console.log('Cabeçalhos:', headers);
    
    const candidates: Candidate[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Pular linhas vazias ou sem nome
      if (!row || !row[1]?.trim()) {
        continue;
      }

      // Processar documentos com múltiplos URLs
      const admDocumentos = processDocumentUrls(row[8]);
      const assistDocumentos = processDocumentUrls(row[14]);

      const candidate: Candidate = {
        submissionDate: row[0] || '',
        name: row[1].trim(),
        phone: row[2] || '',
        area: (row[3] as 'Administrativa' | 'Assistencial') || '',
        cargoAdministrativo: row[4] || '',
        cargoAssistencial: row[5] || '',
        admCurriculo: row[6] || '',
        admDiploma: row[7] || '',
        admDocumentos: admDocumentos.join(', '),
        admCursos: row[9] || '',
        assistCurriculo: row[10] || '',
        assistDiploma: row[11] || '',
        assistCarteira: row[12] || '',
        assistCursos: row[13] || '',
        assistDocumentos: assistDocumentos.join(', '),
        registrationNumber: row[15] || `temp-${i}`,
        statusTriagem: (row[16] as 'Classificado' | 'Desclassificado' | 'Revisar') || 'Revisar',
        dataHoraTriagem: row[17] || '',
        analistaTriagem: row[18] || '',
      };

      candidates.push(candidate);
    }

    console.log(`Total de candidatos carregados: ${candidates.length}`);
    return candidates;

  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    return [];
  }
}

export async function updateCandidateStatus(
  registrationNumber: string,
  status: 'Classificado' | 'Desclassificado' | 'Revisar',
  analystEmail: string
): Promise<boolean> {
  if (!SPREADSHEET_ID) {
    console.error('Google Sheets ID não configurado');
    return false;
  }

  if (!cachedAccessToken) {
    console.error('Token de acesso não disponível para escrita');
    return false;
  }

  try {
    // Primeiro, buscar a planilha para encontrar a linha do candidato
    const range = 'A:S';
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
    
    const readResponse = await fetch(readUrl);
    if (!readResponse.ok) {
      throw new Error(`Falha ao ler planilha: ${readResponse.statusText}`);
    }

    const data = await readResponse.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    // Encontrar o índice da linha do candidato
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][15] === registrationNumber) {
        rowIndex = i + 1; // +1 porque a planilha começa na linha 1
        break;
      }
    }

    if (rowIndex === -1) {
      console.error(`Candidato com número de inscrição ${registrationNumber} não encontrado`);
      return false;
    }

    // Atualizar as colunas Q, R, S (Status Triagem, Data/Hora Triagem, Analista Triagem)
    const now = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const updateRange = `Q${rowIndex}:S${rowIndex}`;
    const values = [[status, now, analystEmail]];

    const success = await updateSheet(updateRange, values);

    if (success) {
      console.log(`Status do candidato ${registrationNumber} atualizado para ${status}`);
    } else {
      console.error('Falha ao atualizar status do candidato');
    }

    return success;

  } catch (error) {
    console.error('Erro ao atualizar status do candidato:', error);
    return false;
  }
}
