// services/candidateService.ts
import { Candidate, PaginatedResponse } from './types';

// Configuração da API do Google Sheets
const SPREADSHEET_ID = '1NaetcGUJ5_HYsQ-NCK3V3zFEnDfyfwmjX4wrUwI7NFw';
const SHEET_NAME = 'Form responses'; // ou o nome da sua planilha
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '';


export const candidateService = {
  async getCandidates(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      status?: string;
      area?: string;
      flagged?: boolean;
      search?: string;
      assignedTo?: string;
    }
  ): Promise<PaginatedResponse<Candidate>> {
    try {
      // Busca todos os dados da planilha
      const allCandidates = await this.loadFromSpreadsheet();
      
      // Aplica filtros
      let filteredCandidates = allCandidates;
      
      if (filters?.status) {
        if (filters.status === 'pending') {
          filteredCandidates = filteredCandidates.filter(c => 
            !c.status_triagem || c.status_triagem === ''
          );
        } else {
          filteredCandidates = filteredCandidates.filter(c => 
            c.status_triagem === filters.status
          );
        }
      }

      if (filters?.area) {
        filteredCandidates = filteredCandidates.filter(c => 
          c.area === filters.area
        );
      }

      if (filters?.flagged !== undefined) {
        filteredCandidates = filteredCandidates.filter(c => 
          c.flagged === filters.flagged
        );
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredCandidates = filteredCandidates.filter(c => 
          c.name?.toLowerCase().includes(searchLower) ||
          c.registration_number?.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.assignedTo) {
        filteredCandidates = filteredCandidates.filter(c => 
          c.assigned_to === filters.assignedTo
        );
      }

      // Paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const paginatedData = filteredCandidates.slice(from, to);

      return {
        data: paginatedData,
        count: filteredCandidates.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredCandidates.length / pageSize)
      };
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error);
      throw error;
    }
  },

  async loadFromSpreadsheet(): Promise<Candidate[]> {
    try {
      // URL da API do Google Sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.values) {
        return [];
      }

      // Converte os dados da planilha para objetos Candidate
      const headers = data.values[0]; // Primeira linha são os cabeçalhos
      const rows = data.values.slice(1); // Restante são os dados

      return rows.map((row: any[], index: number) => {
        const candidate: any = {};
        headers.forEach((header: string, colIndex: number) => {
          const key = this.mapHeaderToKey(header);
          candidate[key] = row[colIndex] || '';
        });
        
        // Garante que tenha um ID único
        candidate.id = candidate.id || `candidate-${index}`;
        
        // Converte valores booleanos
        if (candidate.flagged === 'TRUE' || candidate.flagged === 'true') {
          candidate.flagged = true;
        } else {
          candidate.flagged = false;
        }

        return candidate as Candidate;
      });
    } catch (error) {
      console.error('Erro ao carregar dados do Google Sheets:', error);
      throw error;
    }
  },

  // Mapeia cabeçalhos da planilha para keys do objeto Candidate
  mapHeaderToKey(header: string): string {
    const mapping: { [key: string]: string } = {
      'ID': 'id',
      'Número de Inscrição': 'registration_number',
      'Nome': 'name',
      'Área': 'area',
      'Status Triagem': 'status_triagem',
      'Data/Hora Triagem': 'data_hora_triagem',
      'Analista Triagem': 'analista_triagem',
      'Motivos de Rejeição': 'rejection_reasons',
      'Observações': 'notes',
      'Prioridade': 'priority',
      'Marcado': 'flagged',
      'Atribuído a': 'assigned_to',
      'Criado em': 'created_at',
      'Atualizado em': 'updated_at'
    };

    return mapping[header] || header.toLowerCase();
  },

  async getStatistics(analystEmail?: string) {
  try {
    const allCandidates = await this.loadFromSpreadsheet();
    
    let filteredCandidates = allCandidates;
    if (analystEmail) {
      filteredCandidates = allCandidates.filter(c => c.analista_triagem === analystEmail);
    }

    return {
      total: filteredCandidates.length,
      approved: filteredCandidates.filter(c => c.status_triagem === 'Aprovado').length,
      rejected: filteredCandidates.filter(c => c.status_triagem === 'Reprovado').length,
      revisar: filteredCandidates.filter(c => c.status_triagem === 'Revisar').length,
      pending: filteredCandidates.filter(c => 
        !c.status_triagem || c.status_triagem === '' || c.status_triagem === 'pending'
      ).length
    };
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    throw error;
  }
  },

  async updateCandidateStatus(
    registrationNumber: string,
    status: string,
    analystEmail: string,
    rejectionReasons: string[] = [],
    notes: string = ''
  ): Promise<void> {
    try {
      // Para atualizar no Google Sheets, você precisaria da API de escrita
      // Esta é uma implementação simplificada - você precisará adaptar para sua API
      console.log('Atualizando candidato:', {
        registrationNumber,
        status,
        analystEmail,
        rejectionReasons,
        notes
      });

      // Aqui você implementaria a chamada para atualizar a planilha
      // usando Google Apps Script ou API de escrita do Google Sheets
      await this.updateSheetRow(registrationNumber, {
        status_triagem: status,
        data_hora_triagem: new Date().toISOString(),
        analista_triagem: analystEmail,
        rejection_reasons: rejectionReasons.join(', '),
        notes: notes,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao atualizar status do candidato:', error);
      throw error;
    }
  },

  async updateSheetRow(registrationNumber: string, updates: any): Promise<void> {
    // Implemente a lógica para atualizar a linha na planilha
    // Isso pode ser feito via Google Apps Script ou API de escrita do Google Sheets
    // Exemplo simplificado:
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbyTdC3A6X2uT9ihyc0u-cLfFyTI8wZjWtNbet1bUY-bkeFkzBF3z7v59Ab2zzcpom9c/exec';
    
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateCandidate',
        registrationNumber,
        updates
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar planilha');
    }
  },

  async flagCandidate(registrationNumber: string, flagged: boolean): Promise<void> {
    try {
      await this.updateSheetRow(registrationNumber, {
        flagged: flagged,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao marcar candidato:', error);
      throw error;
    }
  },

  async getNextUnassignedBatch(analystEmail: string, batchSize: number = 10): Promise<Candidate[]> {
    const allCandidates = await this.loadFromSpreadsheet();
    
    const unassigned = allCandidates
      .filter(c => !c.status_triagem || c.status_triagem === '')
      .filter(c => !c.assigned_to)
      .sort((a, b) => {
        // Ordena por prioridade (maior primeiro) e depois por data de criação
        if (b.priority !== a.priority) {
          return (b.priority || 0) - (a.priority || 0);
        }
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      })
      .slice(0, batchSize);

    // Atualiza a planilha atribuindo os candidatos
    for (const candidate of unassigned) {
      await this.updateSheetRow(candidate.registration_number, {
        assigned_to: analystEmail
      });
    }

    return unassigned;
  },

  async getRejectionReasons(): Promise<any[]> {
    // Você pode ter uma aba separada para os motivos de rejeição
    // Implemente conforme sua estrutura
    return [
      { id: 1, reason: 'Documentação incompleta', active: true, order_index: 1 },
      { id: 2, reason: 'Fora do perfil', active: true, order_index: 2 },
      { id: 3, reason: 'Experiência insuficiente', active: true, order_index: 3 }
    ];
  }
};
