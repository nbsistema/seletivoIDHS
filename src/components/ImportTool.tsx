import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ImportToolProps {
  onImportComplete: () => void;
  onClose: () => void;
}

export default function ImportTool({ onImportComplete, onClose }: ImportToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split('\t').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      data.push(row);
    }

    return data;
  };

  const mapToCandidate = (row: any) => {
    const area = row['Área'] || row['Area'] || row['Cargo'] || '';
    return {
      registration_number: row['Número de Inscrição'] || row['ID de Envio'] || '',
      submission_date: row['Data de Envio'] || '',
      name: row['Nome Completo'] || row['Nome'] || '',
      phone: row['Telefone'] || row['Celular'] || '',
      area: area,
      cargo_administrativo: area === 'Administrativa' ? (row['Cargo Administrativo'] || '') : '',
      cargo_assistencial: area === 'Assistencial' ? (row['Cargo Assistencial'] || '') : '',
      adm_curriculo: area === 'Administrativa' ? (row['Currículo (Administrativo)'] || '') : '',
      adm_diploma: area === 'Administrativa' ? (row['Diploma (Administrativo)'] || '') : '',
      adm_documentos: area === 'Administrativa' ? (row['Documentos Pessoais (Administrativo)'] || '') : '',
      adm_cursos: area === 'Administrativa' ? (row['Cursos (Administrativo)'] || '') : '',
      assist_curriculo: area === 'Assistencial' ? (row['Currículo (Assistencial)'] || '') : '',
      assist_diploma: area === 'Assistencial' ? (row['Diploma (Assistencial)'] || '') : '',
      assist_carteira: area === 'Assistencial' ? (row['Carteira do Conselho'] || '') : '',
      assist_cursos: area === 'Assistencial' ? (row['Cursos (Assistencial)'] || '') : '',
      assist_documentos: area === 'Assistencial' ? (row['Documentos Pessoais (Assistencial)'] || '') : '',
      status_triagem: '',
      data_hora_triagem: '',
      analista_triagem: '',
      rejection_reasons: [],
      notes: '',
      priority: 0,
      flagged: false
    };
  };

  const handleImport = async () => {
    if (!file) {
      setError('Selecione um arquivo primeiro');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('Arquivo vazio ou formato inválido');
      }

      const candidates = rows
        .map(mapToCandidate)
        .filter(c => c.registration_number && c.name);

      if (candidates.length === 0) {
        throw new Error('Nenhum candidato válido encontrado no arquivo');
      }

      const { error: insertError } = await supabase
        .from('candidates')
        .upsert(candidates, { onConflict: 'registration_number' });

      if (insertError) throw insertError;

      setResult({
        success: candidates.length,
        errors: rows.length - candidates.length
      });

      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao importar arquivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Importar Candidatos do Jotform</h2>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Instruções:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Acesse o Jotform e exporte as respostas em formato Excel (.xls ou .xlsx)</li>
            <li>Abra o arquivo no Google Sheets</li>
            <li>Selecione tudo (Ctrl+A) e copie (Ctrl+C)</li>
            <li>Cole em um editor de texto e salve como .txt ou .csv</li>
            <li>Faça upload do arquivo aqui</li>
          </ol>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Arquivo de dados
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all">
              <Upload className="w-5 h-5 text-slate-400 mr-2" />
              <span className="text-sm text-slate-600">
                {file ? file.name : 'Selecionar arquivo'}
              </span>
              <input
                type="file"
                accept=".txt,.csv,.tsv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Erro na importação</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">Importação concluída!</p>
              <p className="text-sm text-green-700">
                {result.success} candidatos importados com sucesso
                {result.errors > 0 && ` • ${result.errors} linhas ignoradas`}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={importing}
            className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />}
            {importing ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
