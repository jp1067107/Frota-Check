import React, { useState, useEffect, useRef } from 'react';
import { X, Wrench, CheckCircle, AlertTriangle, Clock, ZoomIn, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { Machine, Checklist } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Props {
  machine: Machine;
  onClose: () => void;
}

export const MachineAuditModal: React.FC<Props> = ({ machine, onClose }) => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!machine.id) return;
    setLoading(true);

    const q = query(
      collection(db, 'checklists'),
      where('maquinaId', '==', machine.id),
      orderBy('dataHora', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Checklist[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Checklist);
      });
      setChecklists(list);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'checklists');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [machine.id]);

  const handleUpdateStatus = async (newStatus: 'active' | 'maintenance') => {
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'maquinas', machine.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      // A UI pai será atualizada via onSnapshot no BD, não precisamos alterar estado local manualmente aqui a não ser que tenhamos um snapshot do machine
      machine.status = newStatus; // Optimistic local update para feedback visual
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `maquinas/${machine.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'maintenance': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'pendente': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Operacional';
      case 'maintenance': return 'Em Manutenção';
      case 'pendente': return 'Pendente';
      default: return 'Desconhecido';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Data não disponível';
    let d = date;
    if (date.toDate) d = date.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d);
  };

  const gerarPDF = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    try {
      // Temporarily make the hidden div visible for html2canvas
      pdfRef.current.style.display = 'block';

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2, // better quality
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const safeName = machine.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Intl.DateTimeFormat('pt-BR').format(new Date()).replace(/\//g, '-');
      
      pdf.save(`Relatorio_${safeName}_${dateStr}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Não foi possível gerar o PDF.');
    } finally {
      if (pdfRef.current) pdfRef.current.style.display = 'none';
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#09090b] border-l border-white/10 w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 sm:p-8 pt-10 sm:pt-12 border-b border-white/5 shrink-0 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {machine.name}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] px-3 py-1 rounded-full border font-bold tracking-widest uppercase ${getStatusColor(machine.status)}`}>
                  {getStatusLabel(machine.status)}
                </span>
                <span className="text-zinc-500 font-medium text-xs bg-white/5 px-2 py-1 rounded-md">
                  ID: <span className="font-mono text-zinc-300">{machine.id.split('_')[1]?.toUpperCase() || machine.id.toUpperCase()}</span>
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {machine.status === 'active' ? (
              <Button 
                onClick={() => handleUpdateStatus('maintenance')}
                disabled={updating}
                className="flex-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-zinc-950 border border-amber-500/20 font-bold uppercase tracking-widest text-xs py-5 rounded-xl transition-all"
              >
                {updating ? 'Atualizando...' : 'Enviar para Oficina'}
              </Button>
            ) : machine.status === 'maintenance' ? (
              <Button 
                onClick={() => handleUpdateStatus('active')}
                disabled={updating}
                className="flex-1 bg-[#1DA851]/10 text-[#1DA851] hover:bg-[#1DA851] hover:text-[#09090b] border border-[#1DA851]/20 font-bold uppercase tracking-widest text-xs py-5 rounded-xl transition-all"
              >
                {updating ? 'Atualizando...' : 'Retornar à Operação'}
              </Button>
            ) : <div className="flex-1"></div>}

            <Button 
              onClick={gerarPDF}
              disabled={exporting || checklists.length === 0}
              variant="outline"
              icon={FileText}
              className="px-6 border-white/10 text-zinc-300 bg-white/5 hover:bg-white/10 hover:text-white font-bold uppercase tracking-widest text-xs py-5 rounded-xl transition-all"
            >
              {exporting ? 'Gerando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          <h3 className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-6">Histórico de Checklists</h3>
          
          {loading ? (
            <div className="py-12 text-center text-zinc-500 font-medium animate-pulse text-sm">
              Carregando histórico...
            </div>
          ) : checklists.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-[#18181b]/50">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 font-medium text-sm">Nenhum checklist registrado para esta máquina.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[17px] before:w-px before:bg-white/5">
              {checklists.map((checklist, index) => (
                <div key={checklist.id} className="relative flex gap-6 z-10">
                  <div className="w-9 h-9 rounded-full bg-[#09090b] border border-white/10 shadow-inner flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle className="w-4 h-4 text-[#1DA851]" />
                  </div>
                  <div className="flex-1 bg-[#18181b] rounded-2xl p-5 border border-white/5 shadow-lg shadow-black/20 hover:bg-[#18181b]/80 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-1">
                        <span className="text-sm font-bold text-white">
                          {formatDate(checklist.dataHora)}
                        </span>
                        <div className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
                          Operador: <span className="text-zinc-300 font-mono">{checklist.operadorNome || checklist.operadorId}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 bg-[#1DA851]/10 text-[#1DA851] rounded-md border border-[#1DA851]/20 font-bold uppercase tracking-widest">
                        Verificado
                      </span>
                    </div>

                    {checklist.fotos && (
                      <div className="grid grid-cols-3 gap-3">
                        <div 
                          className="aspect-square bg-[#09090b] rounded-xl border border-white/5 overflow-hidden relative group cursor-pointer shadow-inner"
                          onClick={() => setZoomedImage(checklist.fotos.painel)}
                        >
                          <img src={checklist.fotos.painel} alt="Painel" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <ZoomIn className="text-white w-6 h-6" />
                          </div>
                        </div>
                        <div 
                          className="aspect-square bg-[#09090b] rounded-xl border border-white/5 overflow-hidden relative group cursor-pointer shadow-inner"
                          onClick={() => setZoomedImage(checklist.fotos.oleo)}
                        >
                          <img src={checklist.fotos.oleo} alt="Óleo" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <ZoomIn className="text-white w-6 h-6" />
                          </div>
                        </div>
                        <div 
                          className="aspect-square bg-[#09090b] rounded-xl border border-white/5 overflow-hidden relative group cursor-pointer shadow-inner"
                          onClick={() => setZoomedImage(checklist.fotos.radiador)}
                        >
                          <img src={checklist.fotos.radiador} alt="Radiador" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <ZoomIn className="text-white w-6 h-6" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 mt-3 text-center px-1">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest">Painel/Hor.</span>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest">Nível Óleo</span>
                      <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest">Radiador</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button 
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-sm transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
      {/* Hidden View for PDF Export */}
      <div 
        ref={pdfRef} 
        style={{ 
          display: 'none', 
          width: '800px', 
          backgroundColor: 'white', 
          color: 'black', 
          padding: '40px',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ borderBottom: '2px solid #ccc', paddingBottom: '20px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Relatório de Auditoria - FrotaCheck</h1>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Máquina:</strong> {machine.name} (PIN: {machine.pin || 'N/A'})</p>
          <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Status Atual:</strong> {getStatusLabel(machine.status)}</p>
          <p style={{ margin: '0', fontSize: '14px' }}><strong>Data da Geração:</strong> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}</p>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Histórico de Checklists</h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Data/Hora</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Operador</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>Fotos (Painel / Óleo / Radiador)</th>
            </tr>
          </thead>
          <tbody>
            {checklists.map(checklist => (
              <tr key={checklist.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(checklist.dataHora)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{checklist.operadorNome || checklist.operadorId}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>Verificado</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {checklist.fotos ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <img src={checklist.fotos.painel} alt="Painel" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      <img src={checklist.fotos.oleo} alt="Óleo" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      <img src={checklist.fotos.radiador} alt="Radiador" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                    </div>
                  ) : 'N/A'}
                </td>
              </tr>
            ))}
            {checklists.length === 0 && (
              <tr>
                <td colSpan={4} style={{ border: '1px solid #ddd', padding: '16px', textAlign: 'center', color: '#666' }}>
                  Nenhum checklist registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
