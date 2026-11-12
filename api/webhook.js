// ========================================================
// VERCEL SERVERLESS FUNCTION - INSTAGRAM WEBHOOK HANDLER
// ========================================================
const { resolveBotResponse, formatResponseText } = require('../config/responses');
const { 
  getConfig, 
  upsertCustomer,
  isUserPaused, 
  pauseUser, 
  unpauseUser, 
  isFirstTimeUser,
  getCustomerStep
} = require('../config/storage');

module.exports = async function handler(req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'tecnotrade_token_seguro_2026';
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
  const DEFAULT_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '17841441032714945';

  // 1. Handshake inicial de verificación con Meta (GET)
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

  // 2. Recepción de mensajes en vivo (POST)
  if (req.method === 'POST') {
    const body = req.body;

    if (body && (body.object === 'instagram' || body.object === 'page')) {
      const activeConfig = await getConfig();
      const pauseDuration = (activeConfig.settings?.advisorPauseHours || 12) * 3600;

      for (const entry of body.entry || []) {
        const igAccountId = entry.id || DEFAULT_ACCOUNT_ID;

        if (entry.messaging) {
          for (const event of entry.messaging) {
            const isEcho = Boolean(event.message?.is_echo);

            // =================================================================
            // 1. AUTO-SILENCIO AL INTERVENIR TÚ DESDE EL CELULAR (ECHO)
            // =================================================================
            if (isEcho) {
              const customerId = event.recipient?.id;
              // Evitar que los propios mensajes automáticos del bot disparen la pausa de eco:
              // Si el mensaje tiene metadata o si ya fue pausado por el gancho, se maneja en shouldPause.
              // Nota: Meta marca todos los mensajes salientes con is_echo=true, por lo que verificamos
              // si el texto saliente coincide con alguna respuesta automática del bot antes de asumir que fue un humano.
              const echoText = (event.message?.text || '').trim();
              const isBotOwnReply = isKnownBotResponse(echoText, activeConfig);

              if (customerId && !isBotOwnReply) {
                console.log(`[Intervención Humana] Asesor respondió manualmente a ${customerId}. Silenciando bot por ${activeConfig.settings?.advisorPauseHours || 12}h.`);
                await pauseUser(customerId, pauseDuration, 'Intervención manual del asesor', PAGE_ACCESS_TOKEN);
              }
              continue;
            }

            // Mensaje enviado por un cliente
            const senderId = event.sender?.id;
            const userMessage = event.message?.text?.trim();

            // Si envió una foto, audio o sticker sin texto, no interrumpir
            if (!userMessage) continue;

            // =================================================================
            // 2. INTERRUPTOR MAESTRO GLOBAL
            // =================================================================
            if (activeConfig.botActive === false) {
              console.log(`[Bot Global en Pausa] Mensaje de ${senderId} ignorado.`);
              await upsertCustomer(senderId, { lastMessage: userMessage, incrementCount: true }, PAGE_ACCESS_TOKEN);
              continue;
            }

            // =================================================================
            // 3. CONSULTAR ESTADO DEL CLIENTE EN REDIS (PAUSA, PASO Y HISTORIAL)
            // =================================================================
            const isPaused = await isUserPaused(senderId);
            const isNewCustomer = await isFirstTimeUser(senderId);
            const currentStep = await getCustomerStep(senderId);

            console.log(`[DM Recibido] De: ${senderId} | Nuevo: ${isNewCustomer} | Paso: ${currentStep} | EnPausa: ${isPaused} -> "${userMessage}"`);

            // =================================================================
            // 4. RESOLVER CON MOTOR DE PASOS (WORKFLOW) Y REGLAS
            // =================================================================
            const { text: replyText, hookId, nextStep, shouldPause, shouldUnpause } = resolveBotResponse(
              userMessage,
              activeConfig,
              { isPaused, isNewCustomer, currentStep }
            );

            const matchedStep = (activeConfig.workflow?.steps || []).find(s => s.id === hookId);
            const matchedHook = (activeConfig.hooks || []).find(h => h.id === hookId);
            const hookLabel = matchedStep?.title
              || matchedHook?.title
              || (hookId === 'hook_welcome_new_user' || hookId === 'welcome_first_time'
                ? 'Menú Principal (Bienvenida)'
                : hookId === 'invalid_option_error'
                  ? 'Validación Estricta de Opción'
                  : hookId === 'spec_detected_silent'
                    ? 'Ficha Técnica Detectada'
                    : null);

            // Registrar al cliente, su último mensaje y actualizar su paso en el flujo
            await upsertCustomer(
              senderId,
              {
                lastMessage: userMessage,
                ...(nextStep ? { currentStep: nextStep } : {}),
                ...(hookId ? { lastHookId: hookId } : {}),
                ...(hookLabel ? { lastHookTitle: hookLabel } : {}),
                incrementCount: true
              },
              PAGE_ACCESS_TOKEN
            );

            // Si el usuario escribió "Menú" o "/bot", reactivar el bot para él
            if (shouldUnpause) {
              console.log(`[Reactivación] Usuario ${senderId} pidió el menú. Saliendo de pausa.`);
              await unpauseUser(senderId);
            }

            // Si el gancho activado requiere espera de datos (Trade-In, Taller, Asesor), pausar al bot tras responder
            if (shouldPause) {
              const pauseTarget = matchedStep || matchedHook;
              const reason = pauseTarget ? `Auto-Pausa: ${pauseTarget.title}` : 'En atención humana';
              console.log(`[Auto-Pausa Activada] Gancho "${hookId}" requiere seguimiento humano. Pausando bot para ${senderId} por ${activeConfig.settings?.advisorPauseHours || 12}h.`);
              await pauseUser(senderId, pauseDuration, reason, PAGE_ACCESS_TOKEN);
            }

            // Si el motor decidió hacer Silencio Inteligente (replyText === null), no enviar nada
            if (!replyText) {
              console.log(`[Silencio Inteligente] No se interrumpe la conversación de ${senderId}.`);
              continue;
            }

            // Enviar respuesta a Instagram y esperar antes de cerrar la función
            await sendInstagramMessage(igAccountId, senderId, replyText, PAGE_ACCESS_TOKEN);
          }
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Método no permitido');
};

/**
 * Comprueba si el mensaje de eco saliente fue generado por el propio bot
 * (Para que las respuestas informativas como Catálogo, Horario o Menú no silencien al bot por error)
 */
function isKnownBotResponse(echoText, config) {
  if (!echoText) return false;
  const cleanEcho = echoText.trim().slice(0, 40).toLowerCase();
  if (!cleanEcho) return false;

  const candidates = [];
  for (const step of config.workflow?.steps || []) {
    if (step.message) candidates.push(formatResponseText(step.message, config));
    if (step.invalidMessage) candidates.push(formatResponseText(step.invalidMessage, config));
  }
  for (const hook of config.hooks || []) {
    if (hook.response) candidates.push(formatResponseText(hook.response, config));
  }
  if (config.fallbackResponse) {
    candidates.push(formatResponseText(config.fallbackResponse, config));
  }

  return candidates.some(raw => {
    const cleanCandidate = String(raw || '').trim().slice(0, 40).toLowerCase();
    return cleanCandidate && cleanEcho === cleanCandidate;
  });
}

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
