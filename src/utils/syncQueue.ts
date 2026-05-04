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

      // Uploads to Storage
      const panelRef = ref(storage, `${basePath}/painel.jpg`);
      await uploadString(panelRef, item.fotosData.painel, 'data_url');
      const painelUrl = await getDownloadURL(panelRef);

      const oilRef = ref(storage, `${basePath}/oleo.jpg`);
      await uploadString(oilRef, item.fotosData.oleo, 'data_url');
      const oleoUrl = await getDownloadURL(oilRef);

      const waterRef = ref(storage, `${basePath}/radiador.jpg`);
      await uploadString(waterRef, item.fotosData.radiador, 'data_url');
      const radiadorUrl = await getDownloadURL(waterRef);

      // Salvar no Firestore
      const docId = `${item.maquinaId}_${item.timestamp}`;
      await setDoc(doc(db, 'checklists', docId), {
        maquinaId: item.maquinaId,
        maquinaNome: item.maquinaNome,
        operadorId: item.operadorId,
        dataHora: serverTimestamp(),
        status: 'liberada',
        fotos: {
          painel: painelUrl,
          oleo: oleoUrl,
          radiador: radiadorUrl
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
