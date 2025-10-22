import { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { candidateService } from '../services/candidateService';

export default function StatsPanel() {
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    revisar: 0 // Adicionei o status "revisar" que estava faltando
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Carrega todos os candidatos com seus status persistidos
      const candidates = await candidateService.getCandidates();
      
      // Calcula as estatísticas baseadas nos status salvos
      const statistics = {
        total: candidates.length,
        approved: candidates.filter(c => c.status === 'Aprovado').length,
        rejected: candidates.filter(c => c.status === 'Reprovado').length,
        pending: candidates.filter(c => c.status === 'pending' || !c.status).length,
        revisar: candidates.filter(c => c.status === 'Revisar').length
      };
      
      setStats(statistics);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (value: number) => {
    if (stats.total === 0) return 0;
    return Math.round((value / stats.total) * 100);
  };

  const getProgressPercentage = () => {
    if (stats.total === 0) return 0;
    const reviewed = stats.approved + stats.rejected + stats.revisar;
    return Math.round((reviewed / stats.total) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white border-b border-slate-200 p-4">
        <div className="animate-pulse flex gap-4">
          <div className="h-20 bg-slate-200 rounded-lg flex-1"></div>
          <div className="h-20 bg-slate-200 rounded-lg flex-1"></div>
          <div className="h-20 bg-slate-200 rounded-lg flex-1"></div>
          <div className="h-20 bg-slate-200 rounded-lg flex-1"></div>
          <div className="h-20 bg-slate-200 rounded-lg flex-1"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="grid grid-cols-5 gap-4"> {/* Mudei para 5 colunas */}
        {/* Total */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-800">Total</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{stats.total.toLocaleString()}</p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>Progresso</span>
              <span className="font-semibold">{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Aprovados */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-800">Aprovados</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{stats.approved.toLocaleString()}</p>
          <p className="text-xs text-green-700 mt-2">
            {getPercentage(stats.approved)}% do total
          </p>
        </div>

        {/* Reprovados */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-red-800">Reprovados</span>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{stats.rejected.toLocaleString()}</p>
          <p className="text-xs text-red-700 mt-2">
            {getPercentage(stats.rejected)}% do total
          </p>
        </div>

        {/* Revisar */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-purple-800">Revisar</span>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">{stats.revisar.toLocaleString()}</p>
          <p className="text-xs text-purple-700 mt-2">
            {getPercentage(stats.revisar)}% do total
          </p>
        </div>

        {/* Pendentes */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-amber-800">Pendentes</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-amber-900">{stats.pending.toLocaleString()}</p>
          <p className="text-xs text-amber-700 mt-2">
            {getPercentage(stats.pending)}% do total
          </p>
        </div>
      </div>
    </div>
  );
}
