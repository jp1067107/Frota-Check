import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, setDoc, doc, deleteDoc, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Machine, Checklist, Operador } from '../../types';
import { format, isSameDay, startOfDay } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Plus, Settings2, Trash2, Eye, EyeOff, Users, Truck } from 'lucide-react';
import { Button } from '../ui/Button';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { useAuth } from '../../context/AuthContext';
import { MachineAuditModal } from './MachineAuditModal';

export const ManagerDashboard: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [activeTab, setActiveTab] = useState<'frota' | 'equipe' | 'empresa'>('frota');
  
  // Modals / Overlays
  const [addingMachine, setAddingMachine] = useState(false);
  const [addingOperador, setAddingOperador] = useState(false);
  
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachinePlaca, setNewMachinePlaca] = useState('');
  
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
    const qC = query(collection(db, 'checklists'), where('empresaId', '==', empresa.id), where('dataHora', '>=', startOfToday));
    const unsubC = onSnapshot(qC, snapshot => {
      setChecklists(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Checklist)));
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
      await updateDoc(doc(db, 'operadores', op.id), { status: novoStatus })
        .catch(error => handleFirestoreError(error, OperationType.UPDATE, `operadores/${op.id}`));
    } catch(e) {
      console.error(e);
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
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 sm:p-10 flex flex-col font-sans">
      
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <header className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-6 pb-6 border-b border-gray-700">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-4">
              FrotaCheck <span className="text-yellow-500 font-normal tracking-widest text-sm sm:text-base uppercase">Centro de Comando</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm sm:text-base font-semibold uppercase tracking-wider flex items-center gap-2">
              <span className="flex items-center gap-1"><Truck className="w-4 h-4"/> {machines.length} Máquina(s)</span>
              <span className="text-gray-600">|</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {operadores.length} Operador(es)</span>
            </p>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            {activeTab === 'frota' && (
              <Button className="w-full sm:w-auto text-sm bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold tracking-widest uppercase" onClick={() => setAddingMachine(true)} icon={Plus}>
                Nova Máquina
              </Button>
            )}
            {activeTab === 'equipe' && (
              <Button className="w-full sm:w-auto text-sm bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold tracking-widest uppercase" onClick={() => setAddingOperador(true)} icon={Plus}>
                Novo Operador
              </Button>
            )}
            <Button variant="outline" className="w-full sm:w-auto text-sm border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 font-bold tracking-widest uppercase" onClick={logout}>
              Sair
            </Button>
          </div>
        </header>

        <div className="flex gap-4 border-b border-gray-800 pb-px overflow-x-auto">
          <button 
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest transition-colors relative whitespace-nowrap ${activeTab === 'frota' ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('frota')}
          >
            Minha Frota
            {activeTab === 'frota' && <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500 rounded-t-full"></span>}
          </button>
          <button 
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest transition-colors relative whitespace-nowrap ${activeTab === 'equipe' ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('equipe')}
          >
            Minha Equipe
            {activeTab === 'equipe' && <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500 rounded-t-full"></span>}
          </button>
          <button 
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest transition-colors relative whitespace-nowrap ${activeTab === 'empresa' ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('empresa')}
          >
            Minha Empresa
            {activeTab === 'empresa' && <span className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500 rounded-t-full"></span>}
          </button>
        </div>

        {addingMachine && (
          <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Nova Máquina</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold uppercase text-gray-400">Nome/Modelo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Retroescavadeira 05" 
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-yellow-500 transition-all font-medium placeholder:text-gray-600"
                    value={newMachineName}
                    onChange={e => setNewMachineName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold uppercase text-gray-400">Placa/Identificação</label>
                  <input 
                    type="text"
                    placeholder="Ex: TX-9090" 
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-yellow-500 transition-all font-medium placeholder:text-gray-600"
                    value={newMachinePlaca}
                    onChange={e => setNewMachinePlaca(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1 font-bold tracking-wider" onClick={() => setAddingMachine(false)}>Cancelar</Button>
                <Button className="flex-1 font-bold tracking-wider bg-yellow-500 text-gray-900 hover:bg-yellow-400" onClick={handleAddMachine}>Salvar</Button>
              </div>
            </div>
          </div>
        )}

        {addingOperador && (
          <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Novo Operador</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold uppercase text-gray-400">Nome do Operador</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João Batista" 
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-yellow-500 transition-all font-medium placeholder:text-gray-600"
                    value={newOperadorName}
                    onChange={e => setNewOperadorName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-bold uppercase text-gray-400">PIN de Acesso</label>
                  <input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="****" 
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-4 text-3xl tracking-[0.5em] text-center font-black text-yellow-500 focus:outline-none focus:border-yellow-500 transition-all placeholder:text-gray-600"
                    value={newOperadorPin}
                    onChange={e => setNewOperadorPin(e.target.value.slice(0, 4))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" className="flex-1 font-bold tracking-wider" onClick={() => setAddingOperador(false)}>Cancelar</Button>
                <Button className="flex-1 font-bold tracking-wider bg-yellow-500 text-gray-900 hover:bg-yellow-400" onClick={handleAddOperador}>Salvar</Button>
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
              cardClasses = "bg-gray-800 opacity-70";
              borderColor = "border-l-4 border-yellow-500 shadow shadow-yellow-500/10";
            } else if (checklistToday) {
              cardClasses = "bg-gray-800";
              borderColor = "border-l-4 border-green-500 shadow shadow-green-500/10";
            } else {
              cardClasses = "bg-gray-800";
              borderColor = "border-l-4 border-red-500 shadow-lg shadow-red-500/20";
            }
            
            return (
              <div 
                key={machine.id} 
                className={`rounded-xl p-6 flex flex-col transition-all border border-gray-700 hover:bg-gray-750 cursor-pointer ${cardClasses} ${borderColor}`}
                onClick={() => setSelectedAuditMachine(machine)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">{machine.name}</h3>
                    <p className="text-gray-400 text-xs font-mono mt-1 opacity-60">ID: {machine.id.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800/50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMachineToDelete(machine); }} 
                      className="text-gray-500 hover:text-red-500 transition-colors p-1 relative z-10" 
                      title="Excluir máquina"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-gray-700 mx-1"></div>
                    {machine.status === 'maintenance' && <Settings2 className="w-7 h-7 text-yellow-500 animate-[spin_4s_linear_infinite]" />}
                    {machine.status !== 'maintenance' && checklistToday && <CheckCircle className="w-7 h-7 text-green-500" />}
                    {machine.status !== 'maintenance' && !checklistToday && <AlertCircle className="w-7 h-7 text-red-500" />}
                  </div>
                </div>

                <div className="flex-1 mt-2">
                  {machine.status === 'maintenance' && (
                    <div className="flex flex-col h-full justify-center items-center py-8">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-lg">
                        <p className="text-sm font-black text-yellow-500 uppercase tracking-widest text-center">Máquina na Oficina</p>
                      </div>
                    </div>
                  )}
                  
                  {machine.status !== 'maintenance' && checklistToday && (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3">Auditoria Concluída</p>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-200 flex justify-between items-center bg-gray-900/40 p-2 rounded-md">
                            <span className="text-gray-500 text-xs uppercase tracking-wider">Operador</span> 
                            <span>{checklistToday.operadorNome || checklistToday.operadorId}</span>
                          </p>
                          <p className="text-sm font-semibold text-gray-200 flex justify-between items-center bg-gray-900/40 p-2 rounded-md">
                            <span className="text-gray-500 text-xs uppercase tracking-wider">Liberada às</span> 
                            <span>{format(getSafeDate(checklistToday.dataHora), 'HH:mm')}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {machine.status !== 'maintenance' && !checklistToday && (
                    <div className="space-y-4">
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center py-6">
                        <p className="text-sm font-black text-red-500 uppercase tracking-wider">Checklist não recebido!</p>
                        <p className="text-xs text-gray-400 mt-2 font-medium">Aguardando envio do operador para liberação.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-gray-700/50 flex flex-col gap-3">
                  {machine.status !== 'maintenance' && checklistToday && (
                    <Button variant="secondary" className="w-full text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 text-white border-0 py-5" onClick={() => setViewChecklistPhotos(checklistToday)}>
                      Auditoria / Ver Fotos
                    </Button>
                  )}

                  {machine.status !== 'maintenance' && !checklistToday && (
                     <a href={`https://wa.me/?text=Olá! Por favor, lembre-se de enviar o checklist da ${machine.name} hoje.`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center rounded-md text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-[40px] py-2 bg-[#25D366] text-gray-900 hover:bg-[#1DA851] shadow-lg shadow-[#25D366]/10 text-center flex-wrap break-words">
                        Acionar Operador
                     </a>
                  )}

                  {machine.status !== 'maintenance' ? (
                     <Button variant="ghost" className="text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors w-full uppercase text-[10px] font-bold tracking-widest mt-1" onClick={() => setMachineStatus(machine, 'maintenance')}>
                       Enviar para Oficina
                     </Button>
                  ) : (
                     <Button variant="outline" className="w-full border-gray-600 hover:bg-gray-700 text-xs uppercase font-bold tracking-widest text-gray-300 py-5" onClick={() => setMachineStatus(machine, 'active')}>
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
              <div key={op.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col items-center text-center relative hover:border-gray-600 transition-colors">
                <button 
                  onClick={() => handleDeleteOperador(op.id)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center mb-4">
                  <span className="text-xl font-black text-gray-400 uppercase">{(op.nome || 'OP').substring(0, 2)}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{op.nome}</h3>
                
                <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-lg border border-gray-700 mb-4">
                  <span className="text-yellow-500 font-mono tracking-widest text-lg font-bold">
                    {showPins[op.id] ? op.pin : '••••'}
                  </span>
                  <button onClick={() => toggleShowPin(op.id)} className="text-gray-500 hover:text-white transition-colors">
                    {showPins[op.id] ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>

                <Button 
                  variant="outline" 
                  className={`w-full text-xs font-bold uppercase tracking-widest ${op.status === 'ativo' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-red-500/50 text-red-500 hover:bg-red-500/10'}`} 
                  onClick={() => toggleStatusOperador(op)}
                >
                  {op.status === 'ativo' ? 'Inativar Acesso' : 'Ativar Acesso'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'empresa' && empresa && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8">
              Dados da Empresa
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Nome da Empresa</p>
                <p className="text-xl font-bold text-white uppercase">{empresa.nomeEmpresa}</p>
              </div>
              <div className="pt-6 border-t border-gray-700/50">
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Email do Gestor</p>
                <p className="text-lg font-medium text-gray-300">{empresa.emailGestor}</p>
              </div>
              <div className="pt-6 border-t border-gray-700/50">
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-2">Código da Empresa (Login do Operador)</p>
                <div className="flex items-center gap-4 bg-gray-900 border border-gray-700 p-4 rounded-xl">
                  <span className="text-2xl font-black text-yellow-500 uppercase tracking-widest font-mono select-all">
                    {empresa.codigoAcesso}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-3 font-medium">Forneça este código aos seus operadores para que eles possam acessar o aplicativo.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewChecklistPhotos && (
        <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
           <div className="bg-gray-900 border border-gray-700 p-6 sm:p-10 rounded-3xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10 border-b border-gray-800 pb-6">
                 <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">Auditoria: <span className="text-yellow-500">{machines.find(m => m.id === viewChecklistPhotos.maquinaId)?.name}</span></h2>
                 <Button variant="outline" className="w-full sm:w-auto border-gray-700 hover:bg-gray-800 tracking-wider" onClick={() => setViewChecklistPhotos(null)}>FECHAR</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                  <h4 className="text-gray-400 text-xs font-bold mb-4 uppercase tracking-widest text-center">Painel (Horímetro)</h4>
                  <img src={viewChecklistPhotos.fotos?.painel} className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-600 shadow-md" alt="Painel" />
                </div>
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                  <h4 className="text-gray-400 text-xs font-bold mb-4 uppercase tracking-widest text-center">Vareta de Óleo</h4>
                  <img src={viewChecklistPhotos.fotos?.oleo} className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-600 shadow-md" alt="Oleo" />
                </div>
                <div className="bg-gray-800 p-4 rounded-2xl border border-gray-700">
                  <h4 className="text-gray-400 text-xs font-bold mb-4 uppercase tracking-widest text-center">Água do Radiador</h4>
                  <img src={viewChecklistPhotos.fotos?.radiador} className="w-full aspect-[4/3] object-cover rounded-xl border border-gray-600 shadow-md" alt="Radiador" />
                </div>
              </div>

              <div className="mt-8 flex justify-between text-gray-400 font-bold text-sm uppercase tracking-wider bg-gray-800/50 p-6 rounded-2xl border border-gray-800">
                 <span>Operador: <span className="text-white">{viewChecklistPhotos.operadorNome || viewChecklistPhotos.operadorId}</span></span>
                 <span><span className="text-white">{format(getSafeDate(viewChecklistPhotos.dataHora), 'dd/MM/yyyy')}</span> às <span className="text-white">{format(getSafeDate(viewChecklistPhotos.dataHora), 'HH:mm')}</span></span>
              </div>
           </div>
        </div>
      )}

      {machineToDelete && (
        <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
           <div className="bg-gray-900 border border-gray-700 p-6 sm:p-8 rounded-2xl max-w-sm w-full shadow-2xl">
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Excluir Máquina</h2>
              <p className="text-gray-400 text-sm mb-6">
                Tem certeza que deseja excluir <strong className="text-white">{machineToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 font-bold" onClick={() => setMachineToDelete(null)}>CANCELAR</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-none font-bold" onClick={() => handleDeleteMachine(machineToDelete)}>EXCLUIR</Button>
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
