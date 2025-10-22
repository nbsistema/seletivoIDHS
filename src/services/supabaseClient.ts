import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Candidate {
  id: string;
  registration_number: string;
  submission_date: string;
  name: string;
  phone: string;
  area: string;
  cargo_administrativo: string;
  cargo_assistencial: string;
  adm_curriculo: string;
  adm_diploma: string;
  adm_documentos: string;
  adm_cursos: string;
  assist_curriculo: string;
  assist_diploma: string;
  assist_carteira: string;
  assist_cursos: string;
  assist_documentos: string;
  status_triagem: string;
  data_hora_triagem: string;
  analista_triagem: string;
  rejection_reasons: string[];
  notes: string;
  priority: number;
  flagged: boolean;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface RejectionReasonTemplate {
  id: string;
  category: string;
  reason: string;
  description: string;
  shortcut_key: string;
  order_index: number;
  active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
