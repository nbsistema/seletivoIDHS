export interface Candidate {
  submissionDate: string;
  name: string;
  phone: string;
  area: 'Administrativa' | 'Assistencial';
  cargoAdministrativo?: string;
  cargoAssistencial?: string;
  admCurriculo?: string;
  admDiploma?: string;
  admDocumentos?: string;
  admCursos?: string;
  assistCurriculo?: string;
  assistDiploma?: string;
  assistCarteira?: string;
  assistCursos?: string;
  assistDocumentos?: string;
  registrationNumber: string;
  statusTriagem?: 'Classificado' | 'Desclassificado' | 'Revisar';
  dataHoraTriagem?: string;
  analistaTriagem?: string;
}

export interface AnalystSession {
  id: string;
  analyst_id: string;
  analyst_email: string;
  started_at: string;
  ended_at?: string;
  total_reviewed: number;
}

export interface CandidateReview {
  id: string;
  candidate_registration_number: string;
  analyst_id: string;
  analyst_email: string;
  status: 'Classificado' | 'Desclassificado' | 'Revisar';
  reviewed_at: string;
  session_id: string;
  review_duration_seconds?: number;
}

export interface SessionMetrics {
  totalReviewed: number;
  averageTimePerCandidate: number;
  classified: number;
  disqualified: number;
  review: number;
}
