// ========================================================
// VERCEL SERVERLESS FUNCTION - INSTAGRAM WEBHOOK HANDLER
// ========================================================
const { getBotResponse } = require('../config/responses');

module.exports = async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'tecnotrade_token_seguro_2026';
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
  const DEFAULT_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '17841441032714945';

  // 1. Handshake inicial de verificación con Meta (Método GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Meta Webhook] Handshake verificado con éxito en Vercel.');
      return res.status(200).send(challenge);
    } else {
      console.warn('[Meta Webhook] Falló verificación de token.');
      return res.status(403).send('Token inválido');
    }
  }

  // 2. Recepción de mensajes en vivo (Método POST)
  if (req.method === 'POST') {
    const body = req.body;

    // Responder 200 OK inmediatamente a Meta para confirmar recepción
    res.status(200).send('EVENT_RECEIVED');

    if (body && (body.object === 'instagram' || body.object === 'page')) {
      for (const entry of body.entry || []) {
        const igAccountId = entry.id || DEFAULT_ACCOUNT_ID;

        if (entry.messaging) {
          for (const event of entry.messaging) {
            const senderId = event.sender?.id;
            const userMessage = event.message?.text?.trim();

            // Ignorar si no hay mensaje o es un eco del propio bot
            if (!userMessage || event.message?.is_echo) continue;

            console.log(`[DM Recibido] De: ${senderId} -> "${userMessage}"`);

            // Obtener respuesta del motor de reglas
            const replyText = getBotResponse(userMessage);

            // Enviar respuesta a Instagram
            await sendInstagramMessage(igAccountId, senderId, replyText, PAGE_ACCESS_TOKEN);
          }
        }
      }
    }
    return;
  }

  // Método no permitido
  return res.status(405).send('Método no permitido');
};

/**
 * Enviar mensaje de vuelta a Instagram a través de Meta Graph API
 */
async function sendInstagramMessage(accountId, recipientId, text, token) {
  if (!token) {
    console.warn(`[Aviso] No hay PAGE_ACCESS_TOKEN configurado. Respuesta simulada:\n${text}`);
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${accountId}/messages?access_token=${token}`;
  const payload = {
    recipient: { id: recipientId },
    message: { text: text }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) {
      console.error('[Error de Meta API]:', data.error);
    } else {
      console.log(`[Respuesta Enviada a Instagram] Destino: ${recipientId} | ID: ${data.message_id}`);
    }
  } catch (error) {
    console.error('[Error de conexión al enviar mensaje]:', error);
  }
}
