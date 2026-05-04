import React, { useRef, useState, useEffect } from 'react';
import { Camera, CheckCircle, ChevronRight, Truck } from 'lucide-react';
import { Button } from '../ui/Button';
import { collection, onSnapshot, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { Machine } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
  
  const operadorId = operatorData?.operadorId || '';
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
        setter(reader.result as string);
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

      // Uploads to Storage
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
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="bg-gray-800 p-6 shadow-md border-b border-gray-700 flex items-center shrink-0">
        <div className="w-14 h-14 bg-yellow-500 flex items-center justify-center rounded-lg mr-4 shrink-0 shadow-lg">
          <Truck className="w-8 h-8 text-gray-900" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-yellow-500 uppercase tracking-widest leading-none">FrotaCheck</h1>
          <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-wider">Terminal do Operador</p>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-6 pb-32">
        {screen === 'A' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-tight">Liberação de Frota</h2>
            
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl space-y-8">
              
              <div className="space-y-3">
                <label className="block text-xl font-bold uppercase text-gray-300">Equipamento</label>
                <select 
                  className="w-full h-20 px-4 text-2xl font-bold bg-gray-900 border-2 border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none text-white appearance-none transition-colors"
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
              </div>

              {/* Removed PIN input since operator is already logged in with PIN */}

            </div>

            <button 
              className="w-full bg-yellow-500 text-gray-900 font-black text-2xl py-6 rounded-2xl shadow-[0_6px_0_#b47c00] active:translate-y-1 active:shadow-[0_0px_0_#b47c00] transition-all uppercase tracking-wider disabled:opacity-50 disabled:active:translate-y-0 disabled:shadow-none"
              onClick={startChecklist}
              disabled={!selectedMachine || !operadorId}
            >
              Iniciar Checklist
            </button>
          </div>
        )}

        {screen === 'B' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg text-center">
              <span className="text-gray-400 text-sm font-bold uppercase tracking-widest block mb-1">Máquina em Liberação</span>
              <h2 className="text-2xl sm:text-3xl font-black text-yellow-500">{getMachineName()}</h2>
            </div>
            
            {/* Passos do Checklist */}
            <div className="space-y-4">
              
              {/* Passo 1 - Painel */}
              <div className={`bg-gray-800 p-5 rounded-2xl border-4 transition-all duration-300 ${panelPhoto ? 'border-green-500' : 'border-yellow-500'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white uppercase">1. Painel (Horímetro)</h3>
                  {panelPhoto && <CheckCircle className="text-green-500 w-8 h-8" />}
                </div>
                
                {!panelPhoto ? (
                  <label className="flex flex-col items-center justify-center p-8 bg-gray-900 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-yellow-500 active:bg-gray-800 transition-colors">
                    <Camera className="w-12 h-12 text-yellow-500 mb-3" />
                    <span className="text-lg font-bold text-gray-300 uppercase">Tocar para Foto</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setPanelPhoto)} />
                  </label>
                ) : (
                  <div className="relative">
                    <img src={panelPhoto} alt="Painel" className="w-full h-48 object-cover rounded-xl border border-gray-700" />
                    <label className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm p-3 rounded-xl border border-gray-600 outline-none text-white font-bold text-sm uppercase flex items-center cursor-pointer active:bg-gray-800">
                      <Camera className="w-5 h-5 mr-2 text-yellow-500" />
                      Refazer
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setPanelPhoto)} />
                    </label>
                  </div>
                )}
              </div>

              {/* Passo 2 - Óleo */}
              <div className={`bg-gray-800 p-5 rounded-2xl border-4 transition-all duration-300 ${!panelPhoto ? 'border-gray-700 opacity-50 pointer-events-none' : oilPhoto ? 'border-green-500' : 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white uppercase">2. Vareta de Óleo</h3>
                  {oilPhoto && <CheckCircle className="text-green-500 w-8 h-8" />}
                </div>
                
                {!oilPhoto ? (
                  <label className="flex flex-col items-center justify-center p-8 bg-gray-900 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-yellow-500 active:bg-gray-800 transition-colors">
                    <Camera className="w-12 h-12 text-yellow-500 mb-3" />
                    <span className="text-lg font-bold text-gray-300 uppercase">Tocar para Foto</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setOilPhoto)} />
                  </label>
                ) : (
                  <div className="relative">
                    <img src={oilPhoto} alt="Óleo do motor" className="w-full h-48 object-cover rounded-xl border border-gray-700" />
                    <label className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm p-3 rounded-xl border border-gray-600 outline-none text-white font-bold text-sm uppercase flex items-center cursor-pointer active:bg-gray-800">
                      <Camera className="w-5 h-5 mr-2 text-yellow-500" />
                      Refazer
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setOilPhoto)} />
                    </label>
                  </div>
                )}
              </div>

              {/* Passo 3 - Água */}
              <div className={`bg-gray-800 p-5 rounded-2xl border-4 transition-all duration-300 ${!oilPhoto ? 'border-gray-700 opacity-50 pointer-events-none' : waterPhoto ? 'border-green-500' : 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white uppercase">3. Água Radiador</h3>
                  {waterPhoto && <CheckCircle className="text-green-500 w-8 h-8" />}
                </div>
                
                {!waterPhoto ? (
                  <label className="flex flex-col items-center justify-center p-8 bg-gray-900 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-yellow-500 active:bg-gray-800 transition-colors">
                    <Camera className="w-12 h-12 text-yellow-500 mb-3" />
                    <span className="text-lg font-bold text-gray-300 uppercase">Tocar para Foto</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleCapture(e, setWaterPhoto)} />
                  </label>
                ) : (
                  <div className="relative">
                    <img src={waterPhoto} alt="Água do radiador" className="w-full h-48 object-cover rounded-xl border border-gray-700" />
                    <label className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur-sm p-3 rounded-xl border border-gray-600 outline-none text-white font-bold text-sm uppercase flex items-center cursor-pointer active:bg-gray-800">
                      <Camera className="w-5 h-5 mr-2 text-yellow-500" />
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
                  className="w-full bg-green-500 text-white font-black text-3xl py-6 rounded-2xl shadow-[0_6px_0_#166534] active:translate-y-1 active:shadow-[0_0px_0_#166534] transition-all uppercase tracking-wider disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
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
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in zoom-in duration-500 bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl mt-8">
             <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center">
               <CheckCircle className="w-24 h-24 text-green-500" />
             </div>
             <div className="text-center space-y-4">
               <h2 className="text-3xl font-black text-white uppercase leading-tight">Máquina Liberada<br/>com Sucesso!</h2>
               <p className="text-xl text-gray-400 font-medium px-4">Operação autorizada para <strong className="text-yellow-500">{getMachineName()}</strong></p>
             </div>
             <div className="pt-8 w-full space-y-4">
               <button 
                 className="w-full bg-gray-700 text-white font-bold text-xl py-5 rounded-2xl border-2 border-gray-600 hover:bg-gray-600 active:bg-gray-800 transition-colors uppercase tracking-widest"
                 onClick={resetAll}
               >
                 Voltar ao Início
               </button>
               <button 
                 className="w-full text-red-500 font-bold text-lg py-4 rounded-2xl border-2 border-red-500/20 hover:bg-red-500/10 active:bg-red-500/20 transition-colors uppercase tracking-widest"
                 onClick={logout}
               >
                 Sair do Sistema
               </button>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};
