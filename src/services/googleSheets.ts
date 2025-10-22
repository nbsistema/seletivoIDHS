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
      const errorData = await response.json();
      console.error('Error updating sheet:', errorData);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating sheet:', error);
    return false;
  }
}

export async function fetchCandidates(): Promise<Candidate[]> {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'your_spreadsheet_id_here') {
    console.warn('Google Sheets ID not configured. Please set VITE_GOOGLE_SHEETS_ID in .env');
    return [];
  }

  if (!API_KEY || API_KEY === 'your_api_key_here') {
    console.warn('Google API Key not configured. Please set VITE_GOOGLE_API_KEY in .env');
    return [];
  }

  try {
    const range = 'A:Z';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    console.log('Fetching candidates from Google Sheets...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Sheets API error:', errorData);

      if (response.status === 403) {
        throw new Error('Acesso negado. Verifique se a API Key está correta e se a Google Sheets API está habilitada.');
      }
      if (response.status === 404) {
        throw new Error('Planilha não encontrada. Verifique o ID da planilha.');
      }

      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      console.warn('No candidate data found');
      return [];
    }

    const headers = rows[0];
    console.log('Available columns:', headers);

    const candidates: Candidate[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
        continue;
      }

      const rowData = new Array(19).fill('');
      for (let j = 0; j < row.length; j++) {
        rowData[j] = row[j] || '';
      }

      const candidate: Candidate = {
        submissionDate: rowData[0],
        name: rowData[1]?.trim() || '',
        phone: rowData[2],
        area: (rowData[3] as 'Administrativa' | 'Assistencial') || '',
        cargoAdministrativo: rowData[4],
        cargoAssistencial: rowData[5],
        admCurriculo: rowData[6],
        admDiploma: rowData[7],
        admDocumentos: rowData[8],
        admCursos: rowData[9],
        assistCurriculo: rowData[10],
        assistDiploma: rowData[11],
        assistCarteira: rowData[12],
        assistCursos: rowData[13],
        assistDocumentos: rowData[14],
        registrationNumber: rowData[15] || `temp-${i + 1}`,
        statusTriagem: (rowData[16] as 'Classificado' | 'Desclassificado' | 'Revisar') || '',
        dataHoraTriagem: rowData[17],
        analistaTriagem: rowData[18],
      };

      if (candidate.name) {
        candidates.push(candidate);
      }
    }

    console.log(`${candidates.length} candidates loaded successfully`);
    return candidates;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Erro de rede ao conectar com Google Sheets. Verifique sua conexão.');
      throw new Error('Erro de conexão. Verifique sua internet e as configurações do Google Sheets.');
    }
    console.error('Critical error fetching candidates:', error);
    throw error;
  }
}

export async function updateCandidateStatus(
  registrationNumber: string,
  status: 'Classificado' | 'Desclassificado' | 'Revisar',
  analystEmail: string
): Promise<boolean> {
  if (!SPREADSHEET_ID) {
    console.error('Google Sheets ID not configured');
    return false;
  }

  if (!cachedAccessToken) {
    console.error('Access token not available for write operation');
    return false;
  }

  try {
    const range = 'A:Z';
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    const readResponse = await fetch(readUrl);
    if (!readResponse.ok) {
      throw new Error(`Failed to read sheet: ${readResponse.statusText}`);
    }

    const data = await readResponse.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      throw new Error('No data found in sheet');
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][15] === registrationNumber) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      console.error(`Candidate with registration number ${registrationNumber} not found`);
      return false;
    }

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
      console.log(`Candidate ${registrationNumber} status updated to ${status}`);
    } else {
      console.error('Failed to update candidate status');
    }

    return success;

  } catch (error) {
    console.error('Error updating candidate status:', error);
    return false;
  }
}
