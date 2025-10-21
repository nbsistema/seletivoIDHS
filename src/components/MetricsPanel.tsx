import { SessionMetrics } from '../types/candidate';
import { TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface MetricsPanelProps {
  metrics: SessionMetrics;
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold text-sm">Métricas da Sessão</span>
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
        </div>
      </div>
    </div>
  );
}
