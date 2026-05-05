import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, ChevronRight, Truck, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { collection, onSnapshot, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { Machine } from '../../types';
import { useAuth } from '../../context/AuthContext';

import { usePWAInstall } from '../../hooks/usePWAInstall';

export const OperatorView: React.FC = () => {
  const [screen, setScreen] = useState<'A' | 'B' | 'C'>('A');
  const [machines, setMachines] = useState<Machine[]>([]);
  
  // Form State
  const [selectedMachine, setSelectedMachine] = useState('');
  
  // Photos
  const [panelPhoto, setPanelPhoto] = useState<string | null>(null);
  const [oilPhoto, setOilPhoto] = useState<string | null>(null);
  const [waterPhoto, setWaterPhoto] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, empresa, operatorData, logout } = useAuth();
  const { isInstallable, installPWA } = usePWAInstall();
  
  const operadorId = operatorData?.operadorId || '';
  const operadorNome = operatorData?.nomeOperador || '';
  const empresaId = empresa?.id || '';

  useEffect(() => {
    if (!empresaId) return;

    const q = query(collection(db, 'maquinas'), where('empresaId', '==', empresaId), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snapshot) => {
      const m = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine));
      setMachines(m);
    }, (error) => {
      console.error("Error loading machines", error);
    });
    
    return () => unsub();
  }, [empresaId]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setter(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const startChecklist = () => {
    if (selectedMachine && operadorId) {
      setScreen('B');
    }
  };

  const enviarChecklist = async () => {
    if (!panelPhoto || !oilPhoto || !waterPhoto || !user || !selectedMachine || !empresaId) return;
    
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const maquinaNome = getMachineName();
      const timestamp = Date.now();
      const basePath = `checklists/${today}/${empresaId}/${selectedMachine}_${timestamp}`;

      if (!navigator.onLine) {
        // Modo OFFLINE: salva na fila local
        import('../../utils/syncQueue').then(({ saveToSyncQueue }) => {
          saveToSyncQueue({
            maquinaId: selectedMachine,
            maquinaNome: maquinaNome,
            operadorId: operadorId,
            operadorNome: operadorNome,
            fotosData: {
              painel: panelPhoto,
              oleo: oilPhoto,
              radiador: waterPhoto
            },
            userId: user.uid,
            empresaId: empresaId,
            timestamp: timestamp
          });
        });
        alert('Você está OFFLINE. O checklist foi salvo no aparelho e será enviado automaticamente quando a internet voltar!');
        setScreen('C');
        return;
      }

      // Uploads to Storage (Apenas se ONLINE)
      const panelRef = ref(storage, `${basePath}/painel.jpg`);
      await uploadString(panelRef, panelPhoto, 'data_url');
      const painelUrl = await getDownloadURL(panelRef);

      const oilRef = ref(storage, `${basePath}/oleo.jpg`);
      await uploadString(oilRef, oilPhoto, 'data_url');
      const oleoUrl = await getDownloadURL(oilRef);

      const waterRef = ref(storage, `${basePath}/radiador.jpg`);
      await uploadString(waterRef, waterPhoto, 'data_url');
      const radiadorUrl = await getDownloadURL(waterRef);

      // Salvar no Firestore
      const docId = `${selectedMachine}_${timestamp}`;
      await setDoc(doc(db, 'checklists', docId), {
        maquinaId: selectedMachine,
        maquinaNome: maquinaNome,
        operadorId: operadorId,
        operadorNome: operadorNome,
        dataHora: serverTimestamp(),
        status: 'liberada',
        fotos: {
          painel: painelUrl,
          oleo: oleoUrl,
          radiador: radiadorUrl
        },
        userId: user.uid,
        empresaId: empresaId
      });

      setScreen('C');
    } catch (error) {
      console.error("Erro ao enviar checklist:", error);
      alert("Erro ao enviar as fotos. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMachineName = () => {
    return machines.find(m => m.id === selectedMachine)?.name || selectedMachine;
  };

  const resetAll = () => {
    setScreen('A');
    setSelectedMachine('');
    setPanelPhoto(null);
    setOilPhoto(null);
    setWaterPhoto(null);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur-xl p-6 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center rounded-xl mr-4 shrink-0 shadow-lg shadow-amber-500/20">
            <Truck className="w-6 h-6 text-zinc-950" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Frota<span className="text-amber-500">Check</span>
            </h1>
            <p className="text-[10px] font-bold text-zinc-500 mt-0.5 uppercase tracking-widest">Terminal do Operador</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {isInstallable && (
            <Button variant="outline" className="hidden sm:flex text-xs font-bold uppercase tracking-widest border-amber-500/20 text-amber-500 hover:bg-amber-500/10 gap-2 items-center" onClick={installPWA}>
              <Download className="w-4 h-4" /> Instalar App
            </Button>
          )}
          <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" onClick={logout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-6 pb-32">
        {screen === 'A' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 tracking-tight">Liberação de Frota</h2>
              <p className="text-sm text-zinc-400">Selecione uma máquina para iniciar.</p>
            </div>
            
            <div className="bg-[#18181b] p-6 rounded-3xl border border-white/5 shadow-2xl space-y-8">
              
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500">Equipamento</label>
                <div className="relative">
                  <select 
                    className="w-full h-16 px-4 text-xl font-bold bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none text-white appearance-none transition-all shadow-inner"
                    value={selectedMachine}
                    onChange={e => setSelectedMachine(e.target.value)}
                  >
                    <option value="">-- SELECIONE --</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    {machines.length === 0 && (
                      <option value="" disabled>Nenhuma máquina ativa</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <ChevronRight className="w-6 h-6 text-zinc-500 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Removed PIN input since operator is already logged in with PIN */}

            </div>

            <button 
              className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-xl py-6 rounded-2xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all uppercase tracking-widest disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none border-0"
              onClick={startChecklist}
              disabled={!selectedMachine || !operadorId}
            >
              Iniciar Checklist
            </button>
          </div>
        )}

        {screen === 'B' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            
            <div className="bg-[#18181b] p-6 rounded-3xl border border-white/5 shadow-2xl text-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Máquina em Liberação</span>
              <h2 className="text-xl sm:text-2xl font-black text-amber-500 uppercase tracking-tight">{getMachineName()}</h2>
            </div>
            
            {/* Passos do Checklist */}
            <div className="space-y-4">
              
              {/* Passo 1 - Painel */}
              <div className={`bg-[#18181b] p-5 rounded-3xl border-2 transition-all duration-300 shadow-inner ${panelPhoto ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 shadow-amber-500/10'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">1. Painel (Horímetro)</h3>
                  {panelPhoto && <CheckCircle className="text-emerald-500 w-6 h-6" />}
                </div>
                
                {!panelPhoto ? (
                  <label className="flex flex-col items-center justify-center p-8 bg-[#09090b] border border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-amber-500/50 active:bg-white/5 transition-colors">
                    <Camera className="w-10 h-10 text-amber-500 mb-3 opacity-80" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tocar para Foto</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setPanelPhoto)} />
                  </label>
                ) : (
                  <div className="relative group">
                    <img src={panelPhoto} alt="Painel" className="w-full h-48 object-cover rounded-2xl border border-white/10" />
                    <label className="absolute bottom-4 right-4 bg-[#09090b]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 outline-none text-white font-bold text-[10px] uppercase tracking-widest flex items-center cursor-pointer hover:bg-[#18181b] active:scale-95 transition-all shadow-xl">
                      <Camera className="w-4 h-4 mr-2 text-amber-500" />
                      Refazer
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setPanelPhoto)} />
                    </label>
                  </div>
                )}
              </div>

              {/* Passo 2 - Óleo */}
              <div className={`bg-[#18181b] p-5 rounded-3xl border-2 transition-all duration-300 shadow-inner ${!panelPhoto ? 'border-white/5 opacity-50 grayscale pointer-events-none' : oilPhoto ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 shadow-amber-500/10'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">2. Vareta de Óleo</h3>
                  {oilPhoto && <CheckCircle className="text-emerald-500 w-6 h-6" />}
                </div>
                
                {!oilPhoto ? (
                  <label className="flex flex-col items-center justify-center p-8 bg-[#09090b] border border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-amber-500/50 active:bg-white/5 transition-colors">
                    <Camera className="w-10 h-10 text-amber-500 mb-3 opacity-80" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tocar para Foto</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setOilPhoto)} />
                  </label>
                ) : (
                  <div className="relative group">
                    <img src={oilPhoto} alt="Óleo do motor" className="w-full h-48 object-cover rounded-2xl border border-white/10" />
                    <label className="absolute bottom-4 right-4 bg-[#09090b]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 outline-none text-white font-bold text-[10px] uppercase tracking-widest flex items-center cursor-pointer hover:bg-[#18181b] active:scale-95 transition-all shadow-xl">
                      <Camera className="w-4 h-4 mr-2 text-amber-500" />
                      Refazer
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setOilPhoto)} />
                    </label>
                  </div>
                )}
              </div>

              {/* Passo 3 - Água */}
              <div className={`bg-[#18181b] p-5 rounded-3xl border-2 transition-all duration-300 shadow-inner ${!oilPhoto ? 'border-white/5 opacity-50 grayscale pointer-events-none' : waterPhoto ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 shadow-amber-500/10'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">3. Água Radiador</h3>
                  {waterPhoto && <CheckCircle className="text-emerald-500 w-6 h-6" />}
                </div>
                
                {!waterPhoto ? (
                  <label className="flex flex-col items-center justify-center p-8 bg-[#09090b] border border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-amber-500/50 active:bg-white/5 transition-colors">
                    <Camera className="w-10 h-10 text-amber-500 mb-3 opacity-80" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tocar para Foto</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setWaterPhoto)} />
                  </label>
                ) : (
                  <div className="relative group">
                    <img src={waterPhoto} alt="Água do radiador" className="w-full h-48 object-cover rounded-2xl border border-white/10" />
                    <label className="absolute bottom-4 right-4 bg-[#09090b]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 outline-none text-white font-bold text-[10px] uppercase tracking-widest flex items-center cursor-pointer hover:bg-[#18181b] active:scale-95 transition-all shadow-xl">
                      <Camera className="w-4 h-4 mr-2 text-amber-500" />
                      Refazer
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setWaterPhoto)} />
                    </label>
                  </div>
                )}
              </div>

            </div>

            {panelPhoto && oilPhoto && waterPhoto && (
              <div className="pt-6 animate-in slide-in-from-bottom-8 duration-500">
                <button 
                  className="w-full bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-emerald-950 font-black text-xl py-6 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all uppercase tracking-widest disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none border-0"
                  onClick={enviarChecklist}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Liberar Máquina'}
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'C' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-in zoom-in duration-500 bg-[#18181b] p-8 sm:p-12 rounded-3xl border border-white/5 shadow-2xl mt-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             
             <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 relative z-10">
               <CheckCircle className="w-12 h-12 text-emerald-950" />
             </div>
             
             <div className="text-center space-y-3 relative z-10">
               <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-tight">Máquina Liberada</h2>
               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                 Operação autorizada <br/>
                 <strong className="text-emerald-400 text-sm mt-1 block">{getMachineName()}</strong>
               </p>
             </div>
             
             <div className="pt-8 w-full space-y-3 relative z-10">
               <button 
                 className="w-full bg-[#09090b] text-white font-bold text-[10px] py-5 rounded-2xl border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all uppercase tracking-widest shadow-inner shadow-black/50"
                 onClick={resetAll}
               >
                 Nova Liberação
               </button>
               <button 
                 className="w-full text-red-400 font-bold text-[10px] py-4 rounded-xl hover:bg-red-400/10 active:bg-red-400/20 transition-colors uppercase tracking-widest"
                 onClick={logout}
               >
                 Encerrar Turno
               </button>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};
