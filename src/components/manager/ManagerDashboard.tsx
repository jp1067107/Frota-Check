import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Machine, Checklist, Operador } from '../../types';
import { format, isSameDay, startOfDay } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Plus, Settings2, Trash2, Eye, EyeOff, Users, Truck, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { useAuth } from '../../context/AuthContext';
import { MachineAuditModal } from './MachineAuditModal';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const ManagerDashboard: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [activeTab, setActiveTab] = useState<'frota' | 'equipe' | 'empresa'>('frota');
  const { isInstallable, installPWA } = usePWAInstall();
  
  // Modals / Overlays
  const [addingMachine, setAddingMachine] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [addingOperador, setAddingOperador] = useState(false);
  
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachinePlaca, setNewMachinePlaca] = useState('');
  const [newMachineAno, setNewMachineAno] = useState('');
  const [newMachineChassi, setNewMachineChassi] = useState('');
  const [newMachineRenavam, setNewMachineRenavam] = useState('');
  const [newMachineTipo, setNewMachineTipo] = useState('');
  const [newMachineHorimetroKmAtual, setNewMachineHorimetroKmAtual] = useState('');
  const [newMachineProximaRevisao, setNewMachineProximaRevisao] = useState('');
  const [newMachineObservacoes, setNewMachineObservacoes] = useState('');
  
  const [newOperadorName, setNewOperadorName] = useState('');
  const [newOperadorPin, setNewOperadorPin] = useState('');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  const [viewChecklistPhotos, setViewChecklistPhotos] = useState<Checklist | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [selectedAuditMachine, setSelectedAuditMachine] = useState<Machine | null>(null);

  const { empresa, logout } = useAuth();

  useEffect(() => {
    if (!empresa) return;

    const qM = query(collection(db, 'maquinas'), where('empresaId', '==', empresa.id));
    const unsubM = onSnapshot(qM, snapshot => {
      setMachines(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine)));
    });

    const startOfToday = startOfDay(new Date());
    const qC = query(collection(db, 'checklists'), where('empresaId', '==', empresa.id));
    const unsubC = onSnapshot(qC, snapshot => {
      const allChecklists = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Checklist));
      // Filter today's checklists client-side to avoid requiring a composite index
      const todayChecklists = allChecklists.filter(c => {
        const date = getSafeDate(c.dataHora);
        return isSameDay(date, new Date()) && date >= startOfToday;
      });
      setChecklists(todayChecklists);
    });
    
    const qOp = query(collection(db, 'operadores'), where('empresaId', '==', empresa.id));
    const unsubOp = onSnapshot(qOp, snapshot => {
      setOperadores(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Operador)));
    });

    return () => { unsubM(); unsubC(); unsubOp(); };
  }, [empresa]);

  const handleAddMachine = async () => {
    if (!empresa) {
      alert("Erro de autenticação da empresa.");
      return;
    }
    if (!newMachineName.trim()) {
      alert("O nome da máquina precisa ser preenchido.");
      return;
    }
    if (!newMachinePlaca.trim()) {
      alert("A placa/identificação da máquina precisa ser preenchida.");
      return;
    }
    try {
      const id = `${empresa.id}_${newMachineName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
      await setDoc(doc(db, 'maquinas', id), {
        name: newMachineName,
        placa: newMachinePlaca,
        ano: newMachineAno,
        chassi: newMachineChassi,
        renavam: newMachineRenavam,
        tipoMaquina: newMachineTipo,
        horimetroKmAtual: newMachineHorimetroKmAtual,
        proximaRevisao: newMachineProximaRevisao,
        observacoes: newMachineObservacoes,
        status: 'active', // Should start as active per requirements or pendente, wait, requirement says "ativa"
        empresaId: empresa.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.CREATE, `maquinas/${id}`);
      });

      setAddingMachine(false);
      setNewMachineName('');
      setNewMachinePlaca('');
      setNewMachineAno('');
      setNewMachineChassi('');
      setNewMachineRenavam('');
      setNewMachineTipo('');
      setNewMachineHorimetroKmAtual('');
      setNewMachineProximaRevisao('');
      setNewMachineObservacoes('');
      alert('Máquina cadastrada com sucesso!');
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const setMachineStatus = async (machineConfig: Machine, status: 'active' | 'maintenance') => {
    try {
      await updateDoc(doc(db, 'maquinas', machineConfig.id), {
        status,
        updatedAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `maquinas/${machineConfig.id}`);
      });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDeleteMachine = async (machine: Machine) => {
    try {
      await deleteDoc(doc(db, 'maquinas', machine.id)).catch(error => {
        handleFirestoreError(error, OperationType.DELETE, `maquinas/${machine.id}`);
      });
      setMachineToDelete(null);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddOperador = async () => {
    if (!empresa) {
      alert("Erro de autenticação da empresa.");
      return;
    }
    if (!newOperadorName.trim()) {
      alert("O nome do operador precisa ser preenchido.");
      return;
    }
    if (newOperadorPin.length < 4) {
      alert("O PIN de acesso precisa ter 4 dígitos.");
      return;
    }
    try {
      await addDoc(collection(db, 'operadores'), {
        nome: newOperadorName.trim(),
        pin: newOperadorPin,
        empresaId: empresa.id,
        status: "ativo",
        createdAt: serverTimestamp()
      }).catch(error => handleFirestoreError(error, OperationType.CREATE, `operadores`));
      
      setAddingOperador(false);
      setNewOperadorName('');
      setNewOperadorPin('');
      alert('Operador cadastrado com sucesso!');
    } catch (e: any) {
      console.error(e);
      let msg = e.message || String(e);
      if (typeof msg === 'string' && msg.includes('operationType')) {
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || msg;
        } catch(err) {}
      }
      alert('Erro ao cadastrar operador: ' + msg);
    }
  };

  const handleDeleteOperador = async (opId: string) => {
    if(!confirm("Tem certeza que deseja excluir esse operador?")) return;
    try {
      await deleteDoc(doc(db, 'operadores', opId)).catch(error => handleFirestoreError(error, OperationType.DELETE, `operadores/${opId}`));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatusOperador = async (op: Operador) => {
    try {
      const novoStatus = op.status === 'ativo' ? 'inativo' : 'ativo';
      await updateDoc(doc(db, 'operadores', op.id), { status: novoStatus, updatedAt: serverTimestamp() });
    } catch(e: any) {
      console.error("Ops error:", e);
      alert("Erro ao alterar acesso: " + e.message);
    }
  };

  const toggleShowPin = (opId: string) => {
    setShowPins(prev => ({ ...prev, [opId]: !prev[opId] }));
  };

  // Logic: Today Checklists mapping
  const today = new Date();
  
  const getSafeDate = (timestamp: any) => {
    if (!timestamp) return new Date();
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  };
  
  const getMachineCardColor = (machine: Machine) => {
    if (machine.status === 'maintenance') return 'bg-[#111] border-l-4 border-[#FFB100] border-t border-r border-b border-white/5';
    
    // Check if there is a checklist TODAY
    const hasChecklistToday = checklists.some(c => c.maquinaId === machine.id && isSameDay(getSafeDate(c.dataHora), today) && c.status === 'liberada');
    
    if (hasChecklistToday) return 'bg-[#111] border-l-4 border-green-500 border-t border-r border-b border-white/5';
    return 'bg-[#111] border-l-4 border-red-500 border-t border-r border-b border-white/5';
  };

  const getMachineChecklistToday = (machine: Machine) => {
    return checklists.find(c => c.maquinaId === machine.id && isSameDay(getSafeDate(c.dataHora), today) && c.status === 'liberada');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Premium Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Truck className="w-4 h-4 text-zinc-950" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Frota<span className="text-amber-500">Check</span>
            </h1>
            <span className="hidden sm:inline-block ml-4 px-2.5 py-1 rounded-full bg-[#18181b] border border-white/5 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
              Centro de Comando
            </span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {isInstallable && (
              <Button variant="outline" className="flex text-xs font-bold uppercase tracking-widest text-amber-500 border-amber-500/20 hover:bg-amber-500/10 gap-2 items-center" onClick={installPWA}>
                <Download className="w-3 h-3" /> <span className="hidden xs:inline">Instalar App</span>
              </Button>
            )}
            <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Visão Geral.</h2>
            <p className="text-zinc-400 mt-2 text-sm font-medium flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded"><Truck className="w-3.5 h-3.5"/> {machines.length}</span> Máquinas
              <span className="text-zinc-700">/</span>
              <span className="flex items-center gap-1 font-mono text-zinc-300 bg-white/5 px-2 py-0.5 rounded"><Users className="w-3.5 h-3.5"/> {operadores.length}</span> Operadores
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {activeTab === 'frota' && (
              <Button className="w-full sm:w-auto text-sm bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-amber-400 font-bold tracking-widest uppercase shadow-lg shadow-amber-500/20 border-0" onClick={() => setAddingMachine(true)} icon={Plus}>
                Nova Máquina
              </Button>
            )}
            {activeTab === 'equipe' && (
              <Button className="w-full sm:w-auto text-sm bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-amber-400 font-bold tracking-widest uppercase shadow-lg shadow-amber-500/20 border-0" onClick={() => setAddingOperador(true)} icon={Plus}>
                Novo Operador
              </Button>
            )}
          </div>
        </div>

        {/* Premium Pills Navigation */}
        <div className="inline-flex items-center p-1 bg-[#18181b] border border-white/5 rounded-2xl overflow-x-auto max-w-full hide-scrollbar">
          <button 
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === 'frota' ? 'bg-[#27272a] text-white shadow-sm border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            onClick={() => setActiveTab('frota')}
          >
            <Truck className="w-4 h-4"/> Minha Frota
          </button>
          <button 
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === 'equipe' ? 'bg-[#27272a] text-white shadow-sm border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            onClick={() => setActiveTab('equipe')}
          >
            <Users className="w-4 h-4"/> Minha Equipe
          </button>
          <button 
            className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${activeTab === 'empresa' ? 'bg-[#27272a] text-white shadow-sm border border-white/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            onClick={() => setActiveTab('empresa')}
          >
            <Settings2 className="w-4 h-4"/> Empresa
          </button>
        </div>

        {addingMachine && (
          <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-white/5 p-8 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Nova Máquina / Veículo</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nome/Modelo *</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Escavadeira CAT 320" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newMachineName}
                    onChange={e => setNewMachineName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Placa/Identificação *</label>
                  <input 
                    type="text"
                    placeholder="Ex: ABC-1234 ou INT-01" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newMachinePlaca}
                    onChange={e => setNewMachinePlaca(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tipo Categoria</label>
                  <input 
                    type="text"
                    placeholder="Ex: Caminhão, Trator..." 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newMachineTipo}
                    onChange={e => setNewMachineTipo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ano</label>
                  <input 
                    type="text"
                    placeholder="Ex: 2018" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newMachineAno}
                    onChange={e => setNewMachineAno(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Horímetro / KM Atual</label>
                  <input 
                    type="text"
                    placeholder="Ex: 50.000km" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newMachineHorimetroKmAtual}
                    onChange={e => setNewMachineHorimetroKmAtual(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data Próxima Revisão</label>
                  <input 
                    type="date"
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700 [color-scheme:dark]"
                    value={newMachineProximaRevisao}
                    onChange={e => setNewMachineProximaRevisao(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Chassi / Renavam</label>
                  <input 
                    type="text"
                    placeholder="Opcional" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newMachineChassi}
                    onChange={e => setNewMachineChassi(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Observações adicionais</label>
                  <textarea 
                    placeholder="Informações para controle..." 
                    rows={2}
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700 resize-none"
                    value={newMachineObservacoes}
                    onChange={e => setNewMachineObservacoes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button variant="ghost" className="flex-1 font-bold tracking-wider text-zinc-400 hover:text-white" onClick={() => setAddingMachine(false)}>Cancelar</Button>
                <Button className="flex-1 font-bold tracking-wider bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-amber-400 border-0" onClick={handleAddMachine}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        {addingOperador && (
          <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#18181b] border border-white/5 p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Novo Operador</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nome do Operador</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João Batista" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium placeholder:text-zinc-700"
                    value={newOperadorName}
                    onChange={e => setNewOperadorName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">PIN de Acesso</label>
                  <input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="****" 
                    className="w-full bg-[#09090b] border border-white/10 rounded-xl px-4 py-4 text-3xl tracking-[0.5em] text-center font-black text-amber-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-zinc-800"
                    value={newOperadorPin}
                    onChange={e => setNewOperadorPin(e.target.value.slice(0, 4))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button variant="ghost" className="flex-1 font-bold tracking-wider text-zinc-400 hover:text-white" onClick={() => setAddingOperador(false)}>Cancelar</Button>
                <Button className="flex-1 font-bold tracking-wider bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-amber-400 border-0" onClick={handleAddOperador}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'frota' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {machines.map(machine => {
            const checklistToday = getMachineChecklistToday(machine);
            
            // Define colors and opacity based on status
            let cardClasses = "";
            let borderColor = "";
            if (machine.status === 'maintenance') {
              cardClasses = "bg-[#18181b]/60 backdrop-blur-sm grayscale-[0.3]";
              borderColor = "border-amber-500/50 shadow shadow-amber-500/10";
            } else if (checklistToday) {
              cardClasses = "bg-[#18181b]";
              borderColor = "border-[#1DA851]/50 shadow shadow-[#1DA851]/10";
            } else {
              cardClasses = "bg-[#18181b]";
              borderColor = "border-red-500/50 shadow shadow-red-500/10";
            }
            
            return (
              <div 
                key={machine.id} 
                className={`rounded-2xl p-6 flex flex-col transition-all duration-300 border hover:bg-[#18181b]/80 cursor-pointer ${cardClasses} border-t-white/5 border-r-white/5 border-b-white/5 border-l-4 ${borderColor}`}
                onClick={() => setSelectedAuditMachine(machine)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">{machine.name}</h3>
                    <p className="text-zinc-500 text-xs font-mono mt-1 font-medium bg-white/5 inline-flex px-1.5 py-0.5 rounded">ID: {machine.id.split('_')[1]?.toUpperCase() || machine.id.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-[#09090b] p-1.5 rounded-xl border border-white/5 shadow-inner">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMachineToDelete(machine); }} 
                      className="text-zinc-600 hover:text-red-500 transition-colors p-1" 
                      title="Excluir máquina"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-white/5 mx-0.5"></div>
                    {machine.status === 'maintenance' && <Settings2 className="w-7 h-7 text-amber-500 animate-[spin_4s_linear_infinite]" />}
                    {machine.status !== 'maintenance' && checklistToday && <CheckCircle className="w-7 h-7 text-[#1DA851]" />}
                    {machine.status !== 'maintenance' && !checklistToday && <AlertCircle className="w-7 h-7 text-red-500" />}
                  </div>
                </div>

                <div className="flex-1 mt-2">
                  {machine.status === 'maintenance' && (
                    <div className="flex flex-col h-full justify-center items-center py-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                        <p className="text-xs font-black text-amber-500 uppercase tracking-widest text-center">Máquina na Oficina</p>
                      </div>
                    </div>
                  )}
                  
                  {machine.status !== 'maintenance' && checklistToday && (
                    <div className="space-y-4">
                      <div className="bg-[#1DA851]/10 border border-[#1DA851]/20 p-4 rounded-xl">
                        <p className="text-[10px] font-black text-[#1DA851] uppercase tracking-widest mb-3">Auditoria Concluída</p>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-zinc-300 flex justify-between items-center bg-[#09090b]/50 p-2.5 rounded-lg border border-white/5">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Operador</span> 
                            <span>{checklistToday.operadorNome || checklistToday.operadorId}</span>
                          </p>
                          <p className="text-sm font-semibold text-zinc-300 flex justify-between items-center bg-[#09090b]/50 p-2.5 rounded-lg border border-white/5">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Liberada às</span> 
                            <span>{format(getSafeDate(checklistToday.dataHora), 'HH:mm')}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {machine.status !== 'maintenance' && !checklistToday && (
                    <div className="space-y-4">
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center py-6 backdrop-blur-sm">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest">Aguardando Checklist</p>
                        <p className="text-[11px] text-red-400/80 mt-2 font-medium">A máquina está bloqueada até o envio.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-white/5 flex flex-col gap-2 relative z-20">
                  {machine.status !== 'maintenance' && checklistToday && (
                    <Button variant="secondary" className="w-full text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white border-0 py-5 rounded-xl transition-all" onClick={(e) => { e.stopPropagation(); setViewChecklistPhotos(checklistToday); }}>
                      Ver Auditoria
                    </Button>
                  )}

                  {machine.status !== 'maintenance' && !checklistToday && (
                     <div className="w-full inline-flex items-center justify-center rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors min-h-[40px] py-4 bg-zinc-800 text-zinc-500 border border-white/5 opacity-50 select-none">
                        Aguardando Envio
                     </div>
                  )}

                  {machine.status !== 'maintenance' ? (
                     <Button variant="ghost" className="text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10 transition-colors w-full uppercase text-[10px] font-bold tracking-widest mt-1 rounded-lg" onClick={(e) => { e.stopPropagation(); setMachineStatus(machine, 'maintenance'); }}>
                       Enviar para Oficina
                     </Button>
                  ) : (
                     <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-xs uppercase font-bold tracking-widest text-zinc-300 py-5 rounded-xl transition-all" onClick={(e) => { e.stopPropagation(); setMachineStatus(machine, 'active'); }}>
                       Devolver à Frota
                     </Button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {operadores.map(op => (
              <div key={op.id} className="bg-[#18181b] border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center relative hover:bg-[#18181b]/80 transition-colors shadow-lg shadow-black/20">
                <button 
                  onClick={() => handleDeleteOperador(op.id)}
                  className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 rounded-full bg-[#09090b] border-2 border-white/10 flex items-center justify-center mb-4 shadow-inner">
                  <span className="text-xl font-black text-amber-500/70 uppercase">{(op.nome || 'OP').substring(0, 2)}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{op.nome}</h3>
                
                <div className="flex items-center gap-2 bg-[#09090b] px-4 py-2 rounded-xl border border-white/5 mb-6 shadow-inner">
                  <span className="text-amber-500 font-mono tracking-[0.2em] text-lg font-black">
                    {showPins[op.id] ? op.pin : '••••'}
                  </span>
                  <button onClick={() => toggleShowPin(op.id)} className="text-zinc-500 hover:text-white transition-colors ml-2">
                    {showPins[op.id] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>

                <Button 
                  variant="outline" 
                  className={`w-full text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all border-0 py-6 ${op.status === 'ativo' ? 'text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white' : 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'}`} 
                  onClick={() => toggleStatusOperador(op)}
                >
                  {op.status === 'ativo' ? 'Inativar Acesso' : 'Ativar Acesso'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'empresa' && empresa && (
          <div className="bg-[#18181b] border border-white/5 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 relative">
              Dados da Empresa
            </h2>
            <div className="space-y-8 relative">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Nome da Empresa</p>
                <p className="text-2xl font-black text-white uppercase tracking-tight">{empresa.nomeEmpresa}</p>
              </div>
              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Email do Gestor</p>
                <p className="text-lg font-medium text-zinc-300">{empresa.emailGestor}</p>
              </div>
              <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Código da Empresa (Login do Operador)</p>
                <div className="inline-flex items-center gap-4 bg-[#09090b] border border-white/10 px-6 py-4 rounded-2xl shadow-inner">
                  <span className="text-3xl font-black text-amber-500 uppercase tracking-[0.2em] font-mono select-all">
                    {empresa.codigoAcesso}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-4 font-medium max-w-md">Forneça este código aos seus operadores para que eles possam acessar o aplicativo de checklist.</p>
              </div>
              <div className="pt-8 border-t border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Status da Assinatura</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${empresa.statusAssinatura === 'ativo' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                      <p className={`text-lg font-black uppercase tracking-tight ${empresa.statusAssinatura === 'ativo' ? 'text-green-500' : 'text-red-500'}`}>
                        {empresa.statusAssinatura === 'ativo' ? 'Ativa' : 'Inativa'}
                      </p>
                    </div>
                  </div>
                  <a 
                    href={(import.meta.env.VITE_CAKTO_CHECKOUT_URL || 'https://pay.cakto.com.br/') + `?email=${encodeURIComponent(empresa.emailGestor)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-amber-500 text-zinc-950 hover:bg-amber-400 font-bold tracking-widest uppercase transition-colors px-6 h-12">
                      {empresa.statusAssinatura === 'ativo' ? 'Renovar / Gerenciar' : 'Pagar Assinatura'}
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {viewChecklistPhotos && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
           <div className="bg-[#18181b] border border-white/5 p-6 sm:p-10 rounded-3xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10 border-b border-white/5 pb-6">
                 <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">Auditoria: <span className="text-amber-500">{machines.find(m => m.id === viewChecklistPhotos.maquinaId)?.name}</span></h2>
                 <Button variant="outline" className="w-full sm:w-auto border-white/10 hover:bg-white/5 tracking-wider bg-transparent text-zinc-300 transition-colors" onClick={() => setViewChecklistPhotos(null)}>FECHAR</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#09090b] p-4 rounded-2xl border border-white/5 shadow-inner">
                  <h4 className="text-zinc-500 text-[10px] font-bold mb-4 uppercase tracking-widest text-center">Painel (Horímetro)</h4>
                  <img src={viewChecklistPhotos.fotos?.painel} className="w-full aspect-[4/3] object-cover rounded-xl border border-white/5 shadow-md" alt="Painel" />
                </div>
                <div className="bg-[#09090b] p-4 rounded-2xl border border-white/5 shadow-inner">
                  <h4 className="text-zinc-500 text-[10px] font-bold mb-4 uppercase tracking-widest text-center">Vareta de Óleo</h4>
                  <img src={viewChecklistPhotos.fotos?.oleo} className="w-full aspect-[4/3] object-cover rounded-xl border border-white/5 shadow-md" alt="Oleo" />
                </div>
                <div className="bg-[#09090b] p-4 rounded-2xl border border-white/5 shadow-inner">
                  <h4 className="text-zinc-500 text-[10px] font-bold mb-4 uppercase tracking-widest text-center">Água do Radiador</h4>
                  <img src={viewChecklistPhotos.fotos?.radiador} className="w-full aspect-[4/3] object-cover rounded-xl border border-white/5 shadow-md" alt="Radiador" />
                </div>
              </div>

              <div className="mt-8 flex justify-between text-zinc-400 font-bold text-sm uppercase tracking-wider bg-[#09090b] p-6 rounded-2xl border border-white/5 shadow-inner">
                 <span>Operador: <span className="text-white">{viewChecklistPhotos.operadorNome || viewChecklistPhotos.operadorId}</span></span>
                 <span><span className="text-white">{format(getSafeDate(viewChecklistPhotos.dataHora), 'dd/MM/yyyy')}</span> às <span className="text-white">{format(getSafeDate(viewChecklistPhotos.dataHora), 'HH:mm')}</span></span>
              </div>
           </div>
        </div>
      )}

      {machineToDelete && (
        <div className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
           <div className="bg-[#18181b] border border-white/5 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Excluir Máquina</h2>
              <p className="text-zinc-400 text-sm mb-8 font-medium">
                Tem certeza que deseja excluir <strong className="text-white">{machineToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 font-bold text-zinc-400 hover:text-white" onClick={() => setMachineToDelete(null)}>CANCELAR</Button>
                <Button className="flex-1 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-white shadow-none font-bold transition-all" onClick={() => handleDeleteMachine(machineToDelete)}>EXCLUIR</Button>
              </div>
           </div>
        </div>
      )}

      {selectedAuditMachine && (
        <MachineAuditModal 
          machine={selectedAuditMachine} 
          onClose={() => setSelectedAuditMachine(null)} 
        />
      )}

    </div>
  );
};
