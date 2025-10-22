import { useEffect, useState } from 'react';
import { SessionMetrics } from '../types/candidate';
import { TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';
import { candidateService } from '../services/candidateService';
import { useAuth } from '../contexts/AuthContext'; // Supondo que você tem um contexto de autenticação

interface MetricsPanelProps {
  sessionMetrics?: SessionMetrics; // Métricas da sessão atual (opcional)
  showHistorical?: boolean; // Se deve mostrar dados históricos
}

interface HistoricalMetrics {
  totalReviewed: number;
  classified: number;
  disqualified: number;
  review: number;
  averageTimePerCandidate: number;
}

export default function MetricsPanel({ sessionMetrics, showHistorical = true }: MetricsPanelProps) {
  const [historicalMetrics, setHistoricalMetrics] = useState<HistoricalMetrics>({
    totalReviewed: 0,
    classified: 0,
    disqualified: 0,
    review: 0,
    averageTimePerCandidate: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const metrics = showHistorical ? historicalMetrics : sessionMetrics;

  useEffect(() => {
    if (showHistorical && user) {
      loadHistoricalMetrics();
    }
  }, [showHistorical, user]);

  const loadHistoricalMetrics = async () => {
    try {
      setLoading(true);
      const candidates = await candidateService.getCandidates();
      
      // Filtra apenas os candidatos avaliados pelo usuário logado
      const userCandidates = candidates.data.filter(candidate => 
        candidate.analista_triagem === user?.email
      );

      const classified = userCandidates.filter(c => c.status_triagem === 'Aprovado').length;
      const disqualified = userCandidates.filter(c => c.status_triagem === 'Reprovado').length;
      const review = userCandidates.filter(c => c.status_triagem === 'Revisar').length;
      const totalReviewed = classified + disqualified + review;

      // Calcula tempo médio (simplificado - você pode ajustar com dados reais)
      const averageTimePerCandidate = totalReviewed > 0 ? 
        Math.round((8 * 60) / totalReviewed) : 0; // Exemplo: 8 minutos em média

      setHistoricalMetrics({
        totalReviewed,
        classified,
        disqualified,
        review,
        averageTimePerCandidate
      });
    } catch (error) {
      console.error('Erro ao carregar métricas históricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (loading && showHistorical) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="animate-pulse flex items-center justify-between">
          <div className="h-6 bg-blue-500 rounded w-32"></div>
          <div className="flex gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-blue-500 rounded w-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {showHistorical ? <User className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          <span className="font-semibold text-sm">
            {showHistorical ? 'Métricas do Usuário' : 'Métricas da Sessão'}
          </span>
          {showHistorical && user && (
            <span className="text-xs opacity-80 ml-2">({user.email})</span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 opacity-80" />
            <div className="text-right">
              <div className="text-xs opacity-80">Tempo médio</div>
              <div className="text-sm font-bold">
                {formatTime(metrics.averageTimePerCandidate)}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-blue-400 opacity-50" />

          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-300" />
            <div className="text-right">
              <div className="text-xs opacity-80">Classificados</div>
              <div className="text-sm font-bold">{metrics.classified}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-300" />
            <div className="text-right">
              <div className="text-xs opacity-80">Desclassificados</div>
              <div className="text-sm font-bold">{metrics.disqualified}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-300" />
            <div className="text-right">
              <div className="text-xs opacity-80">Revisar</div>
              <div className="text-sm font-bold">{metrics.review}</div>
            </div>
          </div>

          <div className="h-8 w-px bg-blue-400 opacity-50" />

          <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
            <div className="text-xs opacity-80">Total triados</div>
            <div className="text-2xl font-bold">{metrics.totalReviewed}</div>
          </div>

          {showHistorical && (
            <button
              onClick={loadHistoricalMetrics}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-3 py-1 text-xs font-medium transition-all"
            >
              Atualizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
