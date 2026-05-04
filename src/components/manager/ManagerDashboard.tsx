import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, setDoc, doc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Machine, Checklist } from '../../types';
import { format, isSameDay, startOfDay } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Plus, Settings2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { useAuth } from '../../context/AuthContext';

export const ManagerDashboard: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  
  // Modals / Overlays
  const [addingMachine, setAddingMachine] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachinePin, setNewMachinePin] = useState('');
  
  const [viewChecklistPhotos, setViewChecklistPhotos] = useState<Checklist | null>(null);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);

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

    return () => { unsubM(); unsubC(); };
  }, [empresa]);

  const handleAddMachine = async () => {
    if (!newMachineName.trim() || newMachinePin.length < 4 || !empresa) return;
    try {
      const id = `${empresa.id}_${newMachineName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
      await setDoc(doc(db, 'maquinas', id), {
        name: newMachineName,
        pin: newMachinePin,
        status: 'pendente',
        empresaId: empresa.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.CREATE, `maquinas/${id}`);
      });

      // Salvar também o PIN na coleção operadores para facilitar o login
      await setDoc(doc(db, 'operadores', `${empresa.id}_${newMachinePin}`), {
        empresaId: empresa.id,
        pin: newMachinePin,
        createdAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.CREATE, `operadores/${empresa.id}_${newMachinePin}`);
      });

      setAddingMachine(false);
      setNewMachineName('');
      setNewMachinePin('');
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
            <p className="text-gray-400 mt-2 text-sm sm:text-base font-semibold uppercase tracking-wider">
              {machines.filter(m => (m.status === 'active' || m.status === 'pendente') && getMachineChecklistToday(m)).length} Máquina(s) Operando | {machines.filter(m => (m.status === 'active' || m.status === 'pendente') && !getMachineChecklistToday(m)).length} Pendente(s)
            </p>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <Button className="w-full sm:w-auto text-sm bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold tracking-widest uppercase" onClick={() => setAddingMachine(true)} icon={Plus}>
              Nova Máquina
            </Button>
            <Button variant="outline" className="w-full sm:w-auto text-sm border-gray-700 text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 font-bold tracking-widest uppercase" onClick={logout}>
              Sair
            </Button>
          </div>
        </header>

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
                  <label className="block text-sm font-bold uppercase text-gray-400">PIN do Operador</label>
                  <input 
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="****" 
                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-4 text-3xl tracking-[0.5em] text-center font-black text-yellow-500 focus:outline-none focus:border-yellow-500 transition-all placeholder:text-gray-600"
                    value={newMachinePin}
                    onChange={e => setNewMachinePin(e.target.value.slice(0, 4))}
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
              <div key={machine.id} className={`rounded-xl p-6 flex flex-col transition-all border border-gray-700 hover:bg-gray-750 ${cardClasses} ${borderColor}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight text-white">{machine.name}</h3>
                    <p className="text-gray-400 text-xs font-mono mt-1 opacity-60">ID: {machine.id.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-lg border border-gray-800/50">
                    <button onClick={() => setMachineToDelete(machine)} className="text-gray-500 hover:text-red-500 transition-colors p-1" title="Excluir máquina">
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
                            <span>{checklistToday.operadorId}</span>
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
                     <a href={`https://wa.me/?text=Olá! Por favor, lembre-se de enviar o checklist da ${machine.name} hoje.`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-10 py-5 bg-[#25D366] text-gray-900 hover:bg-[#1DA851] shadow-lg shadow-[#25D366]/10">
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
                 <span>Operador (PIN): <span className="text-white">{viewChecklistPhotos.operadorId}</span></span>
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

    </div>
  );
};
