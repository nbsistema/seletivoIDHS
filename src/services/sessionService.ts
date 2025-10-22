import { SessionMetrics } from '../types/candidate';

const sessions = new Map<string, {
  analystEmail: string;
  startTime: number;
  reviews: Array<{
    status: 'Classificado' | 'Desclassificado' | 'Revisar';
    duration: number;
  }>;
}>();

export async function createSession(analystEmail: string): Promise<string | null> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  sessions.set(sessionId, {
    analystEmail,
    startTime: Date.now(),
    reviews: []
  });

  return sessionId;
}

export async function createReview(
  candidateRegistrationNumber: string,
  status: 'Classificado' | 'Desclassificado' | 'Revisar',
  sessionId: string,
  analystEmail: string,
  durationSeconds: number
): Promise<boolean> {
  const session = sessions.get(sessionId);

  if (!session) {
    console.error('Session not found');
    return false;
  }

  session.reviews.push({
    status,
    duration: durationSeconds
  });

  return true;
}

export async function getSessionMetrics(sessionId: string): Promise<SessionMetrics | null> {
  const session = sessions.get(sessionId);

  if (!session) {
    return {
      totalReviewed: 0,
      averageTimePerCandidate: 0,
      classified: 0,
      disqualified: 0,
      review: 0
    };
  }

  const reviews = session.reviews;
  const totalReviewed = reviews.length;
  const totalDuration = reviews.reduce((sum, review) => sum + review.duration, 0);
  const averageTimePerCandidate = totalReviewed > 0 ? Math.round(totalDuration / totalReviewed) : 0;

  const classified = reviews.filter(r => r.status === 'Classificado').length;
  const disqualified = reviews.filter(r => r.status === 'Desclassificado').length;
  const review = reviews.filter(r => r.status === 'Revisar').length;

  return {
    totalReviewed,
    averageTimePerCandidate,
    classified,
    disqualified,
    review
  };
}

export async function endSession(sessionId: string, totalReviewed: number): Promise<boolean> {
  sessions.delete(sessionId);
  return true;
}
