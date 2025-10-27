import { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface CandidateDetailViewProps {
  candidate: any;
  onClose: () => void;
}

export default function CandidateDetailView({ candidate, onClose }: CandidateDetailViewProps) {
  const [activeTab, setActiveTab] = useState('info');

  const isURL = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const renderValue = (value: any) => {
    if (!value) return <span className="text-gray-400 italic">Vazio</span>;

    const strValue = String(value);

    if (isURL(strValue)) {
      return (
        <a
          href={strValue}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1 break-all"
        >
          {strValue}
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
        </a>
      );
    }

    return <span className="break-words">{strValue}</span>;
  };

  const getNonEmptyFields = (obj: any, prefix = ''): Array<{ key: string; label: string; value: any }> => {
    const fields: Array<{ key: string; label: string; value: any }> = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value && value !== '' && key !== 'data' && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        const label = formatLabel(key);
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && !Array.isArray(value)) {
          fields.push(...getNonEmptyFields(value, fullKey));
        } else {
          fields.push({ key: fullKey, label, value });
        }
      }
    }

    return fields;
  };

  const formatLabel = (key: string): string => {
    const labelMap: { [key: string]: string } = {
      registration_number: 'Número de Inscrição',
      name: 'Nome Completo',
      nome_social: 'Nome Social',
      cpf: 'CPF',
      area: 'Área de Atuação',
      status: 'Status',
      priority: 'Prioridade',
      assigned_to: 'Atribuído a',
      assigned_at: 'Data de Atribuição',
      cargo_administrativo: 'Cargo Administrativo',
      cargo_assistencial: 'Cargo Assistencial',
      adm_curriculo: 'ADM - Currículo',
      adm_diploma: 'ADM - Diploma',
      adm_documentos: 'ADM - Documentos',
      adm_cursos: 'ADM - Cursos',
      assist_curriculo: 'ASSIST - Currículo',
      assist_diploma: 'ASSIST - Diploma',
      assist_carteira: 'ASSIST - Carteira',
      assist_cursos: 'ASSIST - Cursos',
      assist_documentos: 'ASSIST - Documentos',
      submission_date: 'Data de Submissão',
      status_triagem: 'Status da Triagem',
      data_hora_triagem: 'Data/Hora da Triagem',
      analista_triagem: 'Analista da Triagem'
    };

    return labelMap[key] || key.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const allFields = getNonEmptyFields(candidate);

  const personalFields = allFields.filter(f =>
    ['name', 'nome_social', 'cpf', 'registration_number', 'area', 'submission_date'].includes(f.key.split('.').pop() || '')
  );

  const cargoFields = allFields.filter(f =>
    ['cargo_administrativo', 'cargo_assistencial'].includes(f.key.split('.').pop() || '')
  );

  const admFields = allFields.filter(f =>
    f.key.includes('adm_')
  );

  const assistFields = allFields.filter(f =>
    f.key.includes('assist_')
  );

  const statusFields = allFields.filter(f =>
    ['status', 'priority', 'assigned_to', 'assigned_at', 'status_triagem', 'data_hora_triagem', 'analista_triagem'].includes(f.key.split('.').pop() || '')
  );

  const otherFields = allFields.filter(f =>
    !personalFields.includes(f) &&
    !cargoFields.includes(f) &&
    !admFields.includes(f) &&
    !assistFields.includes(f) &&
    !statusFields.includes(f)
  );

  const tabs = [
    { id: 'info', label: 'Informações Pessoais', count: personalFields.length },
    { id: 'cargo', label: 'Cargo', count: cargoFields.length },
    { id: 'adm', label: 'Documentos ADM', count: admFields.length },
    { id: 'assist', label: 'Documentos ASSIST', count: assistFields.length },
    { id: 'status', label: 'Status', count: statusFields.length },
    { id: 'other', label: 'Outros', count: otherFields.length }
  ].filter(tab => tab.count > 0);

  const getActiveFields = () => {
    switch (activeTab) {
      case 'info': return personalFields;
      case 'cargo': return cargoFields;
      case 'adm': return admFields;
      case 'assist': return assistFields;
      case 'status': return statusFields;
      case 'other': return otherFields;
      default: return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{candidate.name || 'Candidato'}</h2>
            <p className="text-blue-100 text-sm mt-1">
              Nº {candidate.registration_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {getActiveFields().map(field => (
              <div key={field.key} className="border-b border-gray-200 pb-4 last:border-b-0">
                <dt className="text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </dt>
                <dd className="text-sm text-gray-900">
                  {renderValue(field.value)}
                </dd>
              </div>
            ))}

            {getActiveFields().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum campo disponível nesta seção</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
