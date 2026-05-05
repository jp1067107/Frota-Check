import localforage from 'localforage';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase/config';

export const saveToSyncQueue = async (payload: any) => {
  const queue: any[] = await localforage.getItem('syncQueue') || [];
  queue.push(payload);
  await localforage.setItem('syncQueue', queue);
};

export const processSyncQueue = async () => {
  if (!navigator.onLine) return;
  
  const queue: any[] = await localforage.getItem('syncQueue') || [];
  if (queue.length === 0) return;

  const newQueue = [];
  
  for (const item of queue) {
    try {
      const today = new Date(item.timestamp).toISOString().split('T')[0];
      const basePath = `checklists/${today}/${item.empresaId}/${item.maquinaId}_${item.timestamp}`;

      // Salvar no Firestore com Base64 direto
      const docId = `${item.maquinaId}_${item.timestamp}`;
      await setDoc(doc(db, 'checklists', docId), {
        maquinaId: item.maquinaId,
        maquinaNome: item.maquinaNome,
        operadorId: item.operadorId,
        operadorNome: item.operadorNome || item.operadorId,
        dataHora: serverTimestamp(),
        status: 'liberada',
        fotos: {
          painel: item.fotosData.painel,
          oleo: item.fotosData.oleo,
          radiador: item.fotosData.radiador
        },
        userId: item.userId,
        empresaId: item.empresaId
      });
      
      console.log('Checklist sincronizado com sucesso:', docId);
    } catch (error) {
      console.error('Erro ao sincronizar item offline. Mantendo na fila:', error);
      newQueue.push(item);
    }
  }
  
  await localforage.setItem('syncQueue', newQueue);
};
