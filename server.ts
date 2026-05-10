import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

// Inicializa o Firebase Admin SDK
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK inicializado com FIREBASE_SERVICE_ACCOUNT.");
  } else {
    // Tenta inicializar com credenciais padrão do ambiente
    console.warn("FIREBASE_SERVICE_ACCOUNT não encontrada. Tentando usar Application Default Credentials...");
    // Apenas chame initApp sem params se estiver em um ambiente do GCP
    admin.initializeApp();
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin:", error);
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  
  // Rota para o Webhook com um parser raw ou json (dependendo do content-type que a Cakto enviar)
  app.post("/api/webhooks/cakto", express.json(), async (req, res) => {
    try {
      console.log("📥 [Webhook Cakto] Recebido:", JSON.stringify(req.body, null, 2));

      const payload = req.body;

      // Eventos comuns de aprovação: 'payment_approved', 'approved', 'transaction.paid', 'charge.succeeded'
      const eventStatus = payload.event || payload.status || payload.event_name || "";
      const isApproved = [
        'payment_approved', 'approved', 'paid', 'transaction.paid', 'payment.approved',
        'subscription_created', 'subscription.created',
        'subscription_renewed', 'subscription.renewed',
        'signature_created', 'signature_renewed'
      ].includes(eventStatus);

      if (!isApproved) {
        console.log(`❕ [Webhook Cakto] Ignorado. Evento não é de aprovação de pagamento: ${eventStatus}`);
        return res.status(200).json({ received: true, status: "ignored" });
      }

      // Procurar o e-mail do cliente (geralmente em customer.email, client.email, ou na raiz email)
      const customerEmail = 
        payload.customer?.email || 
        payload.client?.email || 
        payload.email || 
        payload.data?.customer?.email;

      if (!customerEmail) {
        console.error("❌ [Webhook Cakto] Falha: E-mail não encontrado no payload.");
        return res.status(400).json({ error: "E-mail do cliente não fornecido no payload." });
      }

      console.log(`✅ [Webhook Cakto] Pagamento aprovado para: ${customerEmail}`);

      // Atualizar o status da assinatura na coleção 'empresas'
      const empresasRef = db.collection('empresas');
      const snapshot = await empresasRef.where('emailGestor', '==', customerEmail).get();

      if (snapshot.empty) {
        console.error(`❌ [Webhook Cakto] Falha: Empresa com e-mail gestor ${customerEmail} não encontrada.`);
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { 
          statusAssinatura: 'ativo',
          dataAssinatura: admin.firestore.FieldValue.serverTimestamp(),
          assinaturaValidaAte: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 dias
        });
      });

      await batch.commit();
      console.log(`🎉 [Webhook Cakto] Assinatura da empresa de ${customerEmail} atualizada para 'ativo'!`);

      return res.status(200).json({ success: true, message: "Assinatura ativada." });

    } catch (err: any) {
      console.error("❌ [Webhook Cakto] Internal server error:", err);
      // Sempre retorne 200 pro webhook da Cakto não ficar enviando retries caso seja erro interno no nosso código
      return res.status(500).json({ error: err.message });
    }
  });

  // Rota de Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
