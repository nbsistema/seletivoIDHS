import { useState, useEffect } from 'react';
import { Candidate } from '../types/candidate';
import {
  FileText,
  GraduationCap,
  CreditCard,
  Award,
  FolderOpen,
  ExternalLink,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';

interface DocumentViewerProps {
  candidate: Candidate;
  onFocusDocument?: (docKey: string) => void;
}

interface Document {
  key: string;
  label: string;
  url?: string;
  icon: React.ReactNode;
  isPrimary?: boolean;
}

export default function DocumentViewer({ candidate, onFocusDocument }: DocumentViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const documents: Document[] = candidate.area === 'Administrativa'
    ? [
        { key: 'curriculo', label: 'Currículo', url: candidate.admCurriculo, icon: <FileText className="w-5 h-5" />, isPrimary: true },
        { key: 'diploma', label: 'Diploma', url: candidate.admDiploma, icon: <GraduationCap className="w-5 h-5" />, isPrimary: true },
        { key: 'documentos', label: 'Documentos Pessoais', url: candidate.admDocumentos, icon: <CreditCard className="w-5 h-5" /> },
        { key: 'cursos', label: 'Cursos', url: candidate.admCursos, icon: <Award className="w-5 h-5" /> }
      ]
    : [
        { key: 'curriculo', label: 'Currículo', url: candidate.assistCurriculo, icon: <FileText className="w-5 h-5" />, isPrimary: true },
        { key: 'diploma', label: 'Diploma', url: candidate.assistDiploma, icon: <GraduationCap className="w-5 h-5" />, isPrimary: true },
        { key: 'carteira', label: 'Carteira do Conselho', url: candidate.assistCarteira, icon: <CreditCard className="w-5 h-5" />, isPrimary: true },
        { key: 'cursos', label: 'Cursos', url: candidate.assistCursos, icon: <Award className="w-5 h-5" /> },
        { key: 'documentos', label: 'Documentos Pessoais', url: candidate.assistDocumentos, icon: <FolderOpen className="w-5 h-5" /> }
      ];

  const availableDocs = documents.filter(doc => doc.url);

  useEffect(() => {
    if (availableDocs.length > 0 && !selectedDoc) {
      const firstPrimary = availableDocs.find(d => d.isPrimary);
      setSelectedDoc(firstPrimary ? firstPrimary.key : availableDocs[0].key);
    }
  }, [candidate.registrationNumber]);

  useEffect(() => {
    setZoom(100);
    setRotation(0);
  }, [selectedDoc]);

  const handleDocumentSelect = (docKey: string) => {
    setSelectedDoc(docKey);
    onFocusDocument?.(docKey);
  };

  const selectedDocument = availableDocs.find(d => d.key === selectedDoc);

  const extractJotformId = (url?: string): string | null => {
    if (!url) return null;
    const match = url.match(/jotform\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  const getFileType = (url?: string): 'pdf' | 'image' | 'jotform' | 'unknown' => {
    if (!url) return 'unknown';
    if (extractJotformId(url)) return 'jotform';
    const lower = url.toLowerCase();
    if (lower.includes('.pdf')) return 'pdf';
    if (lower.match(/\.(jpg|jpeg|png|gif|webp)/)) return 'image';
    return 'unknown';
  };

  useEffect(() => {
    if (fileType === 'jotform' && selectedDocument?.url) {
      const jotformId = extractJotformId(selectedDocument.url);
      if (jotformId) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          if (window.jotformEmbedHandler) {
            window.jotformEmbedHandler(`iframe[id='JotFormIFrame-${jotformId}']`, "https://form.jotform.com/");
          }
        };

        return () => {
          document.body.removeChild(script);
        };
      }
    }
  }, [fileType, selectedDocument?.url]);

  const fileType = getFileType(selectedDocument?.url);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">Documentos</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm text-slate-600 font-medium w-16 text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setRotation((rotation + 90) % 360)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Rotacionar"
            >
              <RotateCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableDocs.map((doc) => (
            <button
              key={doc.key}
              onClick={() => handleDocumentSelect(doc.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                selectedDoc === doc.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
              } ${doc.isPrimary ? 'font-semibold' : ''}`}
            >
              {doc.icon}
              <span className="text-sm">{doc.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {selectedDocument?.url ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden h-full">
            {fileType === 'jotform' ? (
              <iframe
                id={`JotFormIFrame-${extractJotformId(selectedDocument.url)}`}
                title={selectedDocument.label}
                onLoad={(e) => {
                  const iframe = e.target as HTMLIFrameElement;
                  if (window.parent) window.parent.scrollTo(0, 0);
                }}
                allow="geolocation; microphone; camera; fullscreen; payment"
                src={selectedDocument.url}
                className="w-full h-full border-none"
                style={{
                  minWidth: '100%',
                  maxWidth: '100%',
                  minHeight: '100%',
                  border: 'none'
                }}
                scrolling="no"
              />
            ) : fileType === 'pdf' ? (
              <iframe
                src={`${selectedDocument.url}#view=FitH`}
                className="w-full h-full"
                title={selectedDocument.label}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'top left',
                  width: `${100 / (zoom / 100)}%`,
                  height: `${100 / (zoom / 100)}%`
                }}
              />
            ) : fileType === 'image' ? (
              <div className="flex items-center justify-center h-full p-4 bg-slate-100">
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.label}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="text-center text-slate-600">
                        <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-200 rounded-full mb-3">
                          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <p class="text-sm font-medium">Erro ao carregar imagem</p>
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 p-8">
                <AlertCircle className="w-16 h-16 mb-4 text-slate-400" />
                <p className="text-center mb-4">Formato de arquivo não suportado para visualização</p>
                <a
                  href={selectedDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir em nova aba
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg shadow-lg">
            <FolderOpen className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-500">Nenhum documento disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}
