import { Candidate } from '../types/candidate';

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export async function fetchCandidates(): Promise<Candidate[]> {
  const SPREADSHEET_ID = '1NaetcGUJ5_HYsQ-NCK3V3zFEnDfyfwmjX4wrUwI7NFw';
  const API_KEY = 'AIzaSyAepavxoe3uYwe6KRZ_RJdCmFS5DmgNjuY';

  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ Variáveis de ambiente faltando:', {
      VITE_GOOGLE_SHEETS_ID: SPREADSHEET_ID ? '✅' : '❌',
      VITE_GOOGLE_API_KEY: API_KEY ? '✅' : '❌'
    });
    return [];
  }

  try {
    const range = 'Sheet1!A:S'; // Incluindo todas as colunas até S
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    console.log('📥 Buscando candidatos...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro na API Google Sheets:', errorData);
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      console.warn('⚠️ Nenhum dado de candidato encontrado');
      return [];
    }

    const headers = rows[0];
    console.log('📋 Colunas disponíveis:', headers);
    
    const candidates: Candidate[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Pular linhas completamente vazias
      if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
        continue;
      }

      const candidate: Candidate = {
        submissionDate: row[0] || '',
        name: row[1]?.trim() || '',
        phone: row[2] || '',
        area: (row[3] as 'Administrativa' | 'Assistencial') || '',
        cargoAdministrativo: row[4] || '',
        cargoAssistencial: row[5] || '',
        admCurriculo: row[6] || '',
        admDiploma: row[7] || '',
        admDocumentos: row[8] || '',
        admCursos: row[9] || '',
        assistCurriculo: row[10] || '',
        assistDiploma: row[11] || '',
        assistCarteira: row[12] || '',
        assistCursos: row[13] || '',
        assistDocumentos: row[14] || '',
        registrationNumber: row[15] || `temp-${i + 1}`,
        statusTriagem: (row[16] as 'Classificado' | 'Desclassificado' | 'Revisar') || 'Revisar',
        dataHoraTriagem: row[17] || '',
        analistaTriagem: row[18] || '',
      };

      // Só adiciona se tiver nome (evita linhas inválidas)
      if (candidate.name) {
        candidates.push(candidate);
      }
    }

    console.log(`✅ ${candidates.length} candidatos carregados com sucesso`);
    return candidates;
  } catch (error) {
    console.error('💥 Erro crítico ao buscar candidatos:', error);
    throw error;
  }
}

export async function updateCandidateStatus(
  registrationNumber: string,
  status: 'Classificado' | 'Desclassificado' | 'Revisar',
  analystEmail: string
): Promise<boolean> {
  if (!SPREADSHEET_ID) {
    console.error('❌ SPREADSHEET_ID não configurado');
    return false;
  }

  // Verifica se temos token OAuth para escrita
  if (!cachedAccessToken) {
    console.error('❌ Token OAuth não disponível para escrita');
    return false;
  }

  try {
    console.log(`🔄 Atualizando status do candidato ${registrationNumber} para: ${status}`);
    
    // Primeiro busca todos os candidatos para encontrar a linha correta
    const range = 'Sheet1!A:S';
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
    
    const readResponse = await fetch(readUrl);
    if (!readResponse.ok) {
      throw new Error(`Falha ao ler dados: ${readResponse.statusText}`);
    }

    const data = await readResponse.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    // Encontra o índice da linha do candidato
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][15] === registrationNumber) {
        rowIndex = i + 1; // +1 porque a planilha começa na linha 1
        break;
      }
    }

    if (rowIndex === -1) {
      console.error(`❌ Candidato não encontrado: ${registrationNumber}`);
      return false;
    }

    // Prepara dados para atualização
    const now = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const updateRange = `Sheet1!Q${rowIndex}:S${rowIndex}`;
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${updateRange}?valueInputOption=USER_ENTERED`;

    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[status, now, analystEmail]]
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ Erro na escrita:', errorData);
      throw new Error(`Falha na atualização: ${updateResponse.statusText}`);
    }

    console.log(`✅ Status atualizado: ${registrationNumber} → ${status}`);
    return true;

  } catch (error) {
    console.error('💥 Erro ao atualizar status:', error);
    return false;
  }
}

// Sistema de gerenciamento de token OAuth
let cachedAccessToken: string | null = null;

export function setAccessToken(token: string) {
  cachedAccessToken = token;
  console.log('🔑 Token OAuth configurado para escrita');
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}

export function clearAccessToken() {
  cachedAccessToken = null;
  console.log('🔒 Token OAuth removido');
}

// Utilitário para verificar configuração
export function getConfigStatus() {
  return {
    sheets: {
      id: SPREADSHEET_ID ? '✅ Configurado' : '❌ Faltando',
      canRead: !!(SPREADSHEET_ID && API_KEY),
      canWrite: !!(SPREADSHEET_ID && cachedAccessToken)
    },
    auth: {
      apiKey: API_KEY ? '✅ Configurada' : '❌ Faltando',
      oauthToken: cachedAccessToken ? '✅ Ativo' : '❌ Inativo'
    }
  };
}

// Função para teste rápido da conexão
export async function testConnection(): Promise<boolean> {
  try {
    const candidates = await fetchCandidates();
    console.log('🧪 Teste de conexão:', candidates.length > 0 ? '✅ SUCESSO' : '⚠️ SEM DADOS');
    return true;
  } catch (error) {
    console.error('🧪 Teste de conexão: ❌ FALHA', error);
    return false;
  }
}
