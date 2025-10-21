import { supabase } from '../lib/supabase';
import { AnalystSession, CandidateReview, SessionMetrics } from '../types/candidate';

export async function createSession(analystEmail: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('analyst_sessions')
      .insert({
        analyst_id: user.id,
        analyst_email: analystEmail,
        started_at: new Date().toISOString(),
        total_reviewed: 0
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

export async function endSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('analyst_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

export async function updateSessionReviewCount(sessionId: string): Promise<boolean> {
  try {
    const { data: session, error: fetchError } = await supabase
      .from('analyst_sessions')
      .select('total_reviewed')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('analyst_sessions')
      .update({ total_reviewed: (session.total_reviewed || 0) + 1 })
      .eq('id', sessionId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error updating session review count:', error);
    return false;
  }
}

export async function createReview(
  candidateRegistrationNumber: string,
  status: 'Classificado' | 'Desclassificado' | 'Revisar',
  sessionId: string,
  analystEmail: string,
  durationSeconds?: number
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('candidate_reviews')
      .insert({
        candidate_registration_number: candidateRegistrationNumber,
        analyst_id: user.id,
        analyst_email: analystEmail,
        status,
        session_id: sessionId,
        review_duration_seconds: durationSeconds,
        reviewed_at: new Date().toISOString()
      });

    if (error) throw error;

    await updateSessionReviewCount(sessionId);
    return true;
  } catch (error) {
    console.error('Error creating review:', error);
    return false;
  }
}

export async function getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
  try {
    const { data: reviews, error } = await supabase
      .from('candidate_reviews')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;

    if (!reviews || reviews.length === 0) {
      return {
        totalReviewed: 0,
        averageTimePerCandidate: 0,
        classified: 0,
        disqualified: 0,
        review: 0
      };
    }

    const totalDuration = reviews.reduce((sum, r) => sum + (r.review_duration_seconds || 0), 0);
    const validDurations = reviews.filter(r => r.review_duration_seconds).length;

    return {
      totalReviewed: reviews.length,
      averageTimePerCandidate: validDurations > 0 ? totalDuration / validDurations : 0,
      classified: reviews.filter(r => r.status === 'Classificado').length,
      disqualified: reviews.filter(r => r.status === 'Desclassificado').length,
      review: reviews.filter(r => r.status === 'Revisar').length
    };
  } catch (error) {
    console.error('Error getting session metrics:', error);
    return null;
  }
}

export async function getCandidateLastReview(registrationNumber: string): Promise<CandidateReview | null> {
  try {
    const { data, error } = await supabase
      .from('candidate_reviews')
      .select('*')
      .eq('candidate_registration_number', registrationNumber)
      .order('reviewed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting candidate last review:', error);
    return null;
  }
}
