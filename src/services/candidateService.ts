import { supabase, Candidate, RejectionReasonTemplate, PaginatedResponse } from './supabaseClient';

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
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('candidates')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(from, to);

    if (filters?.status) {
      if (filters.status === 'pending') {
        query = query.or('status_triagem.is.null,status_triagem.eq.');
      } else {
        query = query.eq('status_triagem', filters.status);
      }
    }

    if (filters?.area) {
      query = query.eq('area', filters.area);
    }

    if (filters?.flagged !== undefined) {
      query = query.eq('flagged', filters.flagged);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,registration_number.ilike.%${filters.search}%`);
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  },

  async getNextUnassignedBatch(analystEmail: string, batchSize: number = 10): Promise<Candidate[]> {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .or('status_triagem.is.null,status_triagem.eq.')
      .is('assigned_to', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (error) throw error;

    if (data && data.length > 0) {
      const ids = data.map(c => c.id);
      await supabase
        .from('candidates')
        .update({ assigned_to: analystEmail })
        .in('id', ids);
    }

    return data || [];
  },

  async updateCandidateStatus(
    registrationNumber: string,
    status: string,
    analystEmail: string,
    rejectionReasons: string[] = [],
    notes: string = ''
  ): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .update({
        status_triagem: status,
        data_hora_triagem: new Date().toISOString(),
        analista_triagem: analystEmail,
        rejection_reasons: rejectionReasons,
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('registration_number', registrationNumber);

    if (error) throw error;
  },

  async flagCandidate(registrationNumber: string, flagged: boolean): Promise<void> {
    const { error } = await supabase
      .from('candidates')
      .update({
        flagged: flagged,
        updated_at: new Date().toISOString()
      })
      .eq('registration_number', registrationNumber);

    if (error) throw error;
  },

  async getRejectionReasons(): Promise<RejectionReasonTemplate[]> {
    const { data, error } = await supabase
      .from('rejection_reason_templates')
      .select('*')
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getStatistics(analystEmail?: string) {
    let totalQuery = supabase.from('candidates').select('*', { count: 'exact', head: true });
    let approvedQuery = supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status_triagem', 'Aprovado');
    let rejectedQuery = supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('status_triagem', 'Reprovado');
    let pendingQuery = supabase.from('candidates').select('*', { count: 'exact', head: true }).or('status_triagem.is.null,status_triagem.eq.');

    if (analystEmail) {
      totalQuery = totalQuery.eq('assigned_to', analystEmail);
      approvedQuery = approvedQuery.eq('assigned_to', analystEmail);
      rejectedQuery = rejectedQuery.eq('assigned_to', analystEmail);
      pendingQuery = pendingQuery.eq('assigned_to', analystEmail);
    }

    const [total, approved, rejected, pending] = await Promise.all([
      totalQuery,
      approvedQuery,
      rejectedQuery,
      pendingQuery
    ]);

    return {
      total: total.count || 0,
      approved: approved.count || 0,
      rejected: rejected.count || 0,
      pending: pending.count || 0
    };
  }
};
