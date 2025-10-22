import { useState, useEffect, useRef } from 'react';
import { Candidate, SessionMetrics } from '../types/candidate';
import { fetchCandidates, updateCandidateStatus } from '../services/googleSheets';
import { createReview, getSessionMetrics } from '../services/sessionService';
import CandidateList from './CandidateList';
import DocumentViewer from './DocumentViewer';
import MetricsPanel from './MetricsPanel';
import ActionPanel from './ActionPanel';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface DashboardProps {
  sessionId: string;
  analystEmail: string;
  onLogout: () => void;
}

export default function Dashboard({ sessionId, analystEmail, onLogout }: DashboardProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SessionMetrics>({
    totalReviewed: 0,
    averageTimePerCandidate: 0,
    classified: 0,
    disqualified: 0,
    review: 0
  });
  const [reviewStartTime, setReviewStartTime] = useState<number>(Date.now());
  const documentViewerRef = useRef<{ focusDocument: (key: string) => void }>(null);

  useEffect(() => {
    loadCandidates();
    loadMetrics();
  }, []);

  useEffect(() => {
    const filtered = candidates.filter(candidate => {
      const areaMatch = filterArea === 'all' || candidate.area === filterArea;
      const cargoMatch = filterCargo === 'all' ||
        (candidate.area === 'Administrativa' && candidate.cargoAdministrativo === filterCargo) ||
        (candidate.area === 'Assistencial' && candidate.cargoAssistencial === filterCargo);

      let statusMatch = true;
      if (filterStatus === 'pending') {
        statusMatch = !candidate.statusTriagem || candidate.statusTriagem === '';
      } else if (filterStatus === 'all') {
        statusMatch = true;
      } else {
        statusMatch = candidate.statusTriagem === filterStatus;
      }

      return areaMatch && cargoMatch && statusMatch;
    });
    setFilteredCandidates(filtered);

    if (filtered.length > 0 && !selectedCandidate) {
      setSelectedCandidate(filtered[0]);
      setReviewStartTime(Date.now());
    }
  }, [candidates, filterArea, filterCargo, filterStatus]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCandidates();
      setCandidates(data);

      if (data.length === 0) {
        setError('Nenhum candidato encontrado. Verifique se a planilha está configurada corretamente.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Error loading candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    const data = await getSessionMetrics(sessionId);
    if (data) {
      setMetrics(data);
    }
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setReviewStartTime(Date.now());
  };

  const handleClassifyCandidate = async (status: 'Classificado' | 'Desclassificado' | 'Revisar') => {
    if (!selectedCandidate) return;

    const durationSeconds = Math.floor((Date.now() - reviewStartTime) / 1000);

    const success = await updateCandidateStatus(
      selectedCandidate.registrationNumber,
      status,
      analystEmail
    );

    if (success) {
      await createReview(
        selectedCandidate.registrationNumber,
        status,
        sessionId,
        analystEmail,
        durationSeconds
      );

      setCandidates(prev =>
        prev.map(c =>
          c.registrationNumber === selectedCandidate.registrationNumber
            ? { ...c, statusTriagem: status, analistaTriagem: analystEmail }
            : c
        )
      );

      await loadMetrics();
      moveToNextCandidate();
    } else {
      alert('Erro ao atualizar status do candidato');
    }
  };

  const moveToNextCandidate = () => {
    const currentIndex = filteredCandidates.findIndex(
      c => c.registrationNumber === selectedCandidate?.registrationNumber
    );

    if (currentIndex < filteredCandidates.length - 1) {
      setSelectedCandidate(filteredCandidates[currentIndex + 1]);
      setReviewStartTime(Date.now());
    }
  };

  const moveToPreviousCandidate = () => {
    const currentIndex = filteredCandidates.findIndex(
      c => c.registrationNumber === selectedCandidate?.registrationNumber
    );

    if (currentIndex > 0) {
      setSelectedCandidate(filteredCandidates[currentIndex - 1]);
      setReviewStartTime(Date.now());
    }
  };

  const generateReport = () => {
    const totalCandidates = candidates.length;
    const classified = candidates.filter(c => c.statusTriagem === 'Classificado').length;
    const disqualified = candidates.filter(c => c.statusTriagem === 'Desclassificado').length;
    const review = candidates.filter(c => c.statusTriagem === 'Revisar').length;
    const pending = candidates.filter(c => !c.statusTriagem || c.statusTriagem === '').length;

    const byArea = {
      Administrativa: candidates.filter(c => c.area === 'Administrativa').length,
      Assistencial: candidates.filter(c => c.area === 'Assistencial').length
    };

    const classifiedByArea = {
      Administrativa: candidates.filter(c => c.area === 'Administrativa' && c.statusTriagem === 'Classificado').length,
      Assistencial: candidates.filter(c => c.area === 'Assistencial' && c.statusTriagem === 'Classificado').length
    };

    const reportText = `
RELATÓRIO DE TRIAGEM DE CANDIDATOS
====================================
Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}
Analista: ${analystEmail}

RESUMO GERAL
------------
Total de candidatos: ${totalCandidates}
Classificados: ${classified} (${((classified / totalCandidates) * 100).toFixed(1)}%)
Desclassificados: ${disqualified} (${((disqualified / totalCandidates) * 100).toFixed(1)}%)
Para revisar: ${review} (${((review / totalCandidates) * 100).toFixed(1)}%)
Pendentes: ${pending} (${((pending / totalCandidates) * 100).toFixed(1)}%)

POR ÁREA
--------
Administrativa: ${byArea.Administrativa} candidatos (${classifiedByArea.Administrativa} classificados)
Assistencial: ${byArea.Assistencial} candidatos (${classifiedByArea.Assistencial} classificados)

CANDIDATOS CLASSIFICADOS
------------------------
${candidates
  .filter(c => c.statusTriagem === 'Classificado')
  .map(c => `${c.name} - ${c.area} - ${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial} - Registro: ${c.registrationNumber}`)
  .join('\n')}

CANDIDATOS DESCLASSIFICADOS
---------------------------
${candidates
  .filter(c => c.statusTriagem === 'Desclassificado')
  .map(c => `${c.name} - ${c.area} - ${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial} - Registro: ${c.registrationNumber}`)
  .join('\n')}

CANDIDATOS PARA REVISAR
-----------------------
${candidates
  .filter(c => c.statusTriagem === 'Revisar')
  .map(c => `${c.name} - ${c.area} - ${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial} - Registro: ${c.registrationNumber}`)
  .join('\n')}

CANDIDATOS PENDENTES
--------------------
${candidates
  .filter(c => !c.statusTriagem || c.statusTriagem === '')
  .map(c => `${c.name} - ${c.area} - ${c.area === 'Administrativa' ? c.cargoAdministrativo : c.cargoAssistencial} - Registro: ${c.registrationNumber}`)
  .join('\n')}
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-triagem-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case '1':
          handleClassifyCandidate('Classificado');
          break;
        case '2':
          handleClassifyCandidate('Desclassificado');
          break;
        case '3':
          handleClassifyCandidate('Revisar');
          break;
        case 'ArrowRight':
          moveToNextCandidate();
          break;
        case 'ArrowLeft':
          moveToPreviousCandidate();
          break;
        case 'r':
        case 'R':
          documentViewerRef.current?.focusDocument('curriculo');
          break;
        case 'd':
        case 'D':
          documentViewerRef.current?.focusDocument('diploma');
          break;
        case 'c':
        case 'C':
          documentViewerRef.current?.focusDocument('carteira');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedCandidate, filteredCandidates, reviewStartTime]);

  const currentIndex = filteredCandidates.findIndex(
    c => c.registrationNumber === selectedCandidate?.registrationNumber
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Carregando candidatos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Erro</h2>
          <p className="text-slate-600 text-center mb-4">{error}</p>
          <button
            onClick={loadCandidates}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <MetricsPanel metrics={metrics} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 flex-shrink-0">
          <CandidateList
            candidates={candidates}
            selectedCandidate={selectedCandidate}
            onSelectCandidate={handleSelectCandidate}
            filterArea={filterArea}
            filterCargo={filterCargo}
            filterStatus={filterStatus}
            onFilterAreaChange={setFilterArea}
            onFilterCargoChange={setFilterCargo}
            onFilterStatusChange={setFilterStatus}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedCandidate ? (
            <DocumentViewer
              candidate={selectedCandidate}
              onFocusDocument={(key) => {}}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">Selecione um candidato para visualizar</p>
            </div>
          )}
        </div>
      </div>

      {selectedCandidate && (
        <ActionPanel
          onClassify={() => handleClassifyCandidate('Classificado')}
          onDisqualify={() => handleClassifyCandidate('Desclassificado')}
          onReview={() => handleClassifyCandidate('Revisar')}
          onPrevious={moveToPreviousCandidate}
          onNext={moveToNextCandidate}
          onLogout={onLogout}
          onGenerateReport={generateReport}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < filteredCandidates.length - 1}
          currentIndex={currentIndex}
          totalCandidates={filteredCandidates.length}
          analystEmail={analystEmail}
        />
      )}
    </div>
  );
}
