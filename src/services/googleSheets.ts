import { Candidate } from '../types/candidate';

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;


export async function fetchCandidates(): Promise<Candidate[]> {
  const SPREADSHEET_ID = '1NaetcGUJ5_HYsQ-NCK3V3zFEnDfyfwmjX4wrUwI7NFw'; // Use a variável de ambiente
  const API_KEY = 'AIzaSyAepavxoe3uYwe6KRZ_RJdCmFS5DmgNjuY'; // Use a variável de ambiente

  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ Variáveis de ambiente faltando:', {
      VITE_GOOGLE_SHEETS_ID: SPREADSHEET_ID ? '✅' : '❌',
      VITE_GOOGLE_API_KEY: API_KEY ? '✅' : '❌'
    });
    return [];
  }

  try {
    const range = 'A:Z'; // Agora vamos ler até a Z para capturar as colunas de triagem
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

      // Garantir que a linha tem pelo menos 19 colunas, preenchendo com strings vazias
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
        statusTriagem: (rowData[16] as 'Classificado' | 'Desclassificado' | 'Revisar') || 'Revisar',
        dataHoraTriagem: rowData[17],
        analistaTriagem: rowData[18],
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
