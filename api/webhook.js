// ========================================================
// VERCEL SERVERLESS FUNCTION - INSTAGRAM WEBHOOK HANDLER
// ========================================================
const { resolveBotResponse, formatResponseText } = require('../config/responses');
const { maybeRewriteWithGemini } = require('../config/ai');
const { 
  getConfig, 
  getCustomersMap,
  upsertCustomer,
  isUserPaused, 
  pauseUser, 
  unpauseUser, 
  isFirstTimeUser,
  getCustomerContext,
  registerBotOutgoingEcho,
  registerBotOutgoingMid,
  isRegisteredBotOutgoingEcho
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
              const echoMid = event.message?.mid || null;
              let isBotOwnReply = await isRegisteredBotOutgoingEcho(customerId, echoText, echoMid);
              if (!isBotOwnReply) {
                let echoCustomer = null;
                if (customerId) {
                  const customersMap = await getCustomersMap();
                  echoCustomer = customersMap[customerId] || null;
                }
                isBotOwnReply = isKnownBotResponse(echoText, activeConfig, echoCustomer);
              }

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
            // 3. CONSULTAR ESTADO DEL CLIENTE EN REDIS (PAUSA, PASO Y PERFIL)
            // =================================================================
            const isPaused = await isUserPaused(senderId);
            const isNewCustomer = await isFirstTimeUser(senderId);
            const {
              customer: customerProfile,
              currentStep,
              fetchedProfile,
              profileCheckedAt
            } = await getCustomerContext(senderId, PAGE_ACCESS_TOKEN);

            console.log(`[DM Recibido] De: ${senderId} (@${customerProfile?.username || 'sin_username'}) | Nuevo: ${isNewCustomer} | Paso: ${currentStep} | EnPausa: ${isPaused} -> "${userMessage}"`);

            // =================================================================
            // 4. RESOLVER CON MOTOR DE PASOS (WORKFLOW) Y REGLAS
            // =================================================================
            const { text: replyText, hookId, nextStep, shouldPause, shouldUnpause, aiRewrite, isInitialStep } = resolveBotResponse(
              userMessage,
              activeConfig,
              { isPaused, isNewCustomer, currentStep, customer: customerProfile }
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
                ...(fetchedProfile || {}),
                ...(profileCheckedAt ? { profileFetchedAt: profileCheckedAt } : {}),
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

            // Si la ventana tiene encendida la reescritura natural con Gemini, reescribir conservando links/opciones
            let finalReplyText = replyText;
            let wasAiRewritten = false;
            if (aiRewrite) {
              const aiResult = await maybeRewriteWithGemini({
                baseText: replyText,
                userMessage,
                businessName: activeConfig.settings?.businessName || '',
                customer: customerProfile,
                isInitialStep: Boolean(isInitialStep),
                enabled: true
              });
              finalReplyText = aiResult.text;
              wasAiRewritten = Boolean(aiResult.rewritten);
              if (!aiResult.rewritten && aiResult.reason && aiResult.reason !== 'missing_api_key') {
                console.warn(`[IA Reescritura Fallback] Paso "${hookId}" usó mensaje base (${aiResult.reason}).`);
              }
            }

            if (wasAiRewritten) {
              await registerBotOutgoingEcho(senderId, finalReplyText);
            }

            // Enviar respuesta a Instagram y esperar antes de cerrar la función
            const sentMid = await sendInstagramMessage(igAccountId, senderId, finalReplyText, PAGE_ACCESS_TOKEN);
            if (wasAiRewritten && sentMid) {
              await registerBotOutgoingMid(sentMid);
            }
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
function matchesTemplateWithUsername(echoText, rawTemplate, wfCfg) {
  if (!rawTemplate || !/\{USERNAME\}/i.test(rawTemplate)) return false;

  // Conservar el placeholder intacto mientras reemplazamos variables de negocio
  const SENTINEL = '__TECNOBOT_USERNAME_TOKEN__';
  const masked = String(rawTemplate).replace(/@?\{USERNAME\}/gi, SENTINEL);
  const fullFormatted = formatResponseText(masked, wfCfg, {}).trim().toLowerCase();
  const sentinelLower = SENTINEL.toLowerCase();
  const sentinelPos = fullFormatted.indexOf(sentinelLower);
  if (sentinelPos < 0) return false;
  const formattedHead = fullFormatted.slice(0, Math.max(100, sentinelPos + sentinelLower.length + 30));
  if (!formattedHead.includes(sentinelLower)) return false;

  const parts = formattedHead.split(sentinelLower);
  const staticChars = parts.join('').replace(/[^a-z0-9áéíóúüñ]/gi, '');
  if (staticChars.length < 10) return false;

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let pattern = '^';
  for (let i = 0; i < parts.length; i++) {
    const seg = i < parts.length - 1 ? parts[i].replace(/[ \t]+$/, '') : parts[i];
    pattern += escapeRegex(seg);
    if (i < parts.length - 1) {
      pattern += '[ \\t]*(?:@?[^\\r\\n]{0,40})?';
    }
  }

  const echoHead = String(echoText || '').trim().slice(0, 140).toLowerCase();
  try {
    return new RegExp(pattern, 'i').test(echoHead);
  } catch (_) {
    return false;
  }
}

function isKnownBotResponse(echoText, config, echoCustomer = null) {
  if (!echoText) return false;
  const cleanEcho = echoText.trim().slice(0, 40).toLowerCase();
  if (!cleanEcho) return false;

  const formatCtx = echoCustomer ? { customer: echoCustomer } : {};
  const candidates = [];
  const rawTemplates = [];
  const collectFromWorkflow = (wf, wfCfg) => {
    for (const step of wf?.steps || []) {
      if (step.message) {
        candidates.push(formatResponseText(step.message, wfCfg, formatCtx));
        rawTemplates.push({ raw: step.message, cfg: wfCfg });
      }
      if (step.invalidMessage) {
        candidates.push(formatResponseText(step.invalidMessage, wfCfg, formatCtx));
        rawTemplates.push({ raw: step.invalidMessage, cfg: wfCfg });
      }
    }
  };

  collectFromWorkflow(config.workflow, config);
  for (const canvas of config.canvases || []) {
    const canvasCfg = { settings: canvas.settings || config.settings };
    collectFromWorkflow(canvas.workflow, canvasCfg);
    if (canvas.fallbackResponse) {
      candidates.push(formatResponseText(canvas.fallbackResponse, canvasCfg, formatCtx));
      rawTemplates.push({ raw: canvas.fallbackResponse, cfg: canvasCfg });
    }
  }
  for (const hook of config.hooks || []) {
    if (hook.response) {
      candidates.push(formatResponseText(hook.response, config, formatCtx));
      rawTemplates.push({ raw: hook.response, cfg: config });
    }
  }
  if (config.fallbackResponse) {
    candidates.push(formatResponseText(config.fallbackResponse, config, formatCtx));
    rawTemplates.push({ raw: config.fallbackResponse, cfg: config });
  }

  const exactMatch = candidates.some(raw => {
    const cleanCandidate = String(raw || '').trim().slice(0, 40).toLowerCase();
    return cleanCandidate && cleanEcho === cleanCandidate;
  });
  if (exactMatch) return true;

  return rawTemplates.some(({ raw, cfg }) => matchesTemplateWithUsername(echoText, raw, cfg));
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
      return null;
    } else {
      console.log(`[Respuesta Enviada a Instagram] Destino: ${recipientId} | ID: ${data.message_id}`);
      return data.message_id || null;
    }
  } catch (error) {
    console.error('[Error de conexión al enviar mensaje]:', error);
    return null;
  }
}
