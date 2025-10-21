/*
  # Sistema de Triagem de Candidatos - Database Schema

  1. Tabelas Criadas
    - `analyst_sessions`
      - `id` (uuid, primary key)
      - `analyst_id` (uuid, foreign key to auth.users)
      - `analyst_email` (text)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `total_reviewed` (integer, default 0)
      
    - `candidate_reviews`
      - `id` (uuid, primary key)
      - `candidate_registration_number` (text) - Número de inscrição do Google Sheets
      - `analyst_id` (uuid, foreign key to auth.users)
      - `analyst_email` (text)
      - `status` (text) - 'Classificado', 'Desclassificado', 'Revisar'
      - `reviewed_at` (timestamptz)
      - `session_id` (uuid, foreign key to analyst_sessions)
      - `review_duration_seconds` (integer, nullable)
      
  2. Segurança
    - Enable RLS em todas as tabelas
    - Analistas autenticados podem criar e visualizar suas próprias sessões
    - Analistas podem criar e visualizar suas próprias avaliações
    - Analistas podem visualizar estatísticas gerais
*/

-- Tabela de sessões de analistas
CREATE TABLE IF NOT EXISTS analyst_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analyst_id uuid REFERENCES auth.users(id) NOT NULL,
  analyst_email text NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  total_reviewed integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Tabela de avaliações de candidatos
CREATE TABLE IF NOT EXISTS candidate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_registration_number text NOT NULL,
  analyst_id uuid REFERENCES auth.users(id) NOT NULL,
  analyst_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('Classificado', 'Desclassificado', 'Revisar')),
  reviewed_at timestamptz DEFAULT now() NOT NULL,
  session_id uuid REFERENCES analyst_sessions(id) NOT NULL,
  review_duration_seconds integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_analyst_sessions_analyst_id ON analyst_sessions(analyst_id);
CREATE INDEX IF NOT EXISTS idx_candidate_reviews_analyst_id ON candidate_reviews(analyst_id);
CREATE INDEX IF NOT EXISTS idx_candidate_reviews_session_id ON candidate_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_candidate_reviews_registration_number ON candidate_reviews(candidate_registration_number);

-- Enable RLS
ALTER TABLE analyst_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_reviews ENABLE ROW LEVEL SECURITY;

-- Policies para analyst_sessions
CREATE POLICY "Analysts can view own sessions"
  ON analyst_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = analyst_id);

CREATE POLICY "Analysts can create own sessions"
  ON analyst_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = analyst_id);

CREATE POLICY "Analysts can update own sessions"
  ON analyst_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = analyst_id)
  WITH CHECK (auth.uid() = analyst_id);

-- Policies para candidate_reviews
CREATE POLICY "Analysts can view own reviews"
  ON candidate_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = analyst_id);

CREATE POLICY "Analysts can create own reviews"
  ON candidate_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = analyst_id);

CREATE POLICY "Analysts can view all reviews for statistics"
  ON candidate_reviews FOR SELECT
  TO authenticated
  USING (true);