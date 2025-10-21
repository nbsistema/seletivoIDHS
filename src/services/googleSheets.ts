import { Candidate } from '../types/candidate';

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export async function fetchCandidates(): Promise<Candidate[]> {
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('Google Sheets configuration missing');
    return [];
  }

  try {
    const range = 'A:Q';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch candidates: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return [];
    }

    const headers = rows[0];
    const candidates: Candidate[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const candidate: Candidate = {
        submissionDate: row[0] || '',
        name: row[1] || '',
        phone: row[2] || '',
        area: row[3] as 'Administrativa' | 'Assistencial',
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
        registrationNumber: row[15] || '',
        statusTriagem: row[16] as 'Classificado' | 'Desclassificado' | 'Revisar' | undefined,
        dataHoraTriagem: row[17] || '',
        analistaTriagem: row[18] || '',
      };

      if (candidate.registrationNumber) {
        candidates.push(candidate);
      }
    }

    return candidates;
  } catch (error) {
    console.error('Error fetching candidates:', error);
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

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const candidates = await fetchCandidates();
    const candidateIndex = candidates.findIndex(
      c => c.registrationNumber === registrationNumber
    );

    if (candidateIndex === -1) {
      throw new Error('Candidate not found');
    }

    const rowIndex = candidateIndex + 2;
    const now = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const range = `Q${rowIndex}:S${rowIndex}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[status, now, analystEmail]]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating candidate status:', error);
    return false;
  }
}

let cachedAccessToken: string | null = null;

export function setAccessToken(token: string) {
  cachedAccessToken = token;
}

export function getAccessToken(): string | null {
  return cachedAccessToken;
}
