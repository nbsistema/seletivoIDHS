import { supabase } from './supabaseClient';

export interface Candidate {
  id: string;
  registration_number: string;
  name: string;
  area: string;
  status: 'pendente' | 'em_analise' | 'concluido';
  assigned_to?: string;
  assigned_at?: string;
  assigned_by?: string;
  priority?: number;
  data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CandidateFilters {
  status?: string;
  area?: string;
  search?: string;
  assignedTo?: string;
}

export const candidateService = {
  async getCandidates(
    page: number = 1,
    pageSize: number = 50,
    filters?: CandidateFilters,
    userId?: string
  ): Promise<PaginatedResponse<Candidate>> {
    try {
      let query = supabase
        .from('candidates')
        .select('*', { count: 'exact' });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.area) {
        query = query.eq('area', filters.area);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,registration_number.ilike.%${filters.search}%`);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    } catch (error) {
      console.error('Erro ao buscar candidatos:', error);
      throw error;
    }
  },

  async getCandidateById(id: string): Promise<Candidate | null> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getUnassignedCandidates(
    page: number = 1,
    pageSize: number = 50
  ): Promise<PaginatedResponse<Candidate>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('candidates')
      .select('*', { count: 'exact' })
      .is('assigned_to', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async getStatistics(userId?: string) {
    try {
      let query = supabase.from('candidates').select('status');

      if (userId) {
        query = query.eq('assigned_to', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pendente: data?.filter(c => c.status === 'pendente').length || 0,
        em_analise: data?.filter(c => c.status === 'em_analise').length || 0,
        concluido: data?.filter(c => c.status === 'concluido').length || 0,
      };

      return stats;
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      throw error;
    }
  },

  async updateCandidateStatus(
    id: string,
    status: 'pendente' | 'em_analise' | 'concluido',
    notes?: string
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (notes !== undefined) {
        updates.data = { notes };
      }

      const { error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar status do candidato:', error);
      throw error;
    }
  },

  async createCandidate(candidate: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>): Promise<Candidate> {
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        registration_number: candidate.registration_number,
        name: candidate.name,
        area: candidate.area,
        status: candidate.status || 'pendente',
        priority: candidate.priority || 0,
        data: candidate.data || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCandidate(id: string): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAreas(): Promise<string[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('area')
      .order('area');

    if (error) throw error;

    const uniqueAreas = [...new Set(data?.map(c => c.area) || [])];
    return uniqueAreas;
  },
};
