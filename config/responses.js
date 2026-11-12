// ========================================================
// MOTOR DE RAZONAMIENTO, REGLAS Y NEGATIVE KEYWORDS
// ========================================================

const DEFAULT_CONFIG = {
  // Estado maestro del bot (true = activo, false = pausado globalmente)
  botActive: true,

  // Datos generales y comportamiento del recepcionista
  settings: {
    businessName: "TecnoTrade Panamá",
    tiendaUrl: "https://tecno-trade.vercel.app/",
    mapsUrl: "https://maps.app.goo.gl/MzJWv73e1xWhbXWY6",
    phone: "+507 6852-9324",
    pin: "047514",
    advisorPauseHours: 12, // Horas que el bot se silencia al pasar a modo humano
    silentFallback: true,  // true = No interrumpir con "No entendí" si el cliente escribe algo fuera de los ganchos
    strictStepMode: true   // true = Modo Workflow Estricto (obliga a marcar opciones o salta error)
  },

  // ========================================================
  // WORKFLOW UNIFICADO DE NODOS, ENLACES Y GANCHOS (N8N / MANYCHAT)
  // Cada paso contiene su posición (x,y), palabras clave, negativos,
  // rutas salientes (enlaces) y mensaje de respuesta.
  // ========================================================
  workflow: {
    enabled: true,
    initialStepId: "step_welcome",
    steps: [
      {
        id: "step_welcome",
        title: "Paso 0: Menú Principal",
        type: "menu",
        isRoot: true,
        position: { x: 320, y: 280 },
        priority: 1,
        autoPause: false,
        allowedWhenPaused: false,
        unpauseOnTrigger: true,
        keywords: [
          "hola",
          "buenas",
          "buenos dias",
          "buenas tardes",
          "buenas noches",
          "menu",
          "inicio",
          "start",
          "info",
          "opciones"
        ],
        negativeKeywords: [
          "reparar",
          "pantalla",
          "bateria",
          "vender",
          "vendo",
          "abono",
          "garantia"
        ],
        message: 
          "¡Hola! 👋 Bienvenido a *TecnoTrade Panamá*.\n\n" +
          "¿En qué te podemos ayudar hoy? Escribe el *número* o la *palabra* de tu opción:\n\n" +
          "1️⃣ *Catálogo de Equipos y Precios*\n" +
          "2️⃣ *Taller de Reparaciones* 🔧\n" +
          "3️⃣ *Vender o Cotizar mi Equipo (Trade-In)*\n" +
          "4️⃣ *Horario de Atención*\n" +
          "5️⃣ *Ubicación de Tienda*\n" +
          "6️⃣ *Hablar con un Asesor*",
        routes: [
          { key: "1", targetStepId: "step_catalog", label: "Catálogo y Precios" },
          { key: "2", targetStepId: "step_repairs", label: "Taller de Reparaciones" },
          { key: "3", targetStepId: "step_tradein", label: "Trade-In / Vender" },
          { key: "4", targetStepId: "step_hours", label: "Horarios de Atención" },
          { key: "5", targetStepId: "step_location", label: "Ubicación de Tienda" },
          { key: "6", targetStepId: "step_advisor", label: "Hablar con un Asesor" }
        ],
        invalidMessage: "⚠️ Opción no válida. Por favor responde únicamente con un número del *1 al 6* o escribe *Menú* para reiniciar."
      },
      {
        id: "step_catalog",
        title: "Paso 1: Catálogo y Precios",
        type: "response",
        isRoot: false,
        position: { x: 740, y: 30 },
        priority: 5,
        autoPause: false,
        allowedWhenPaused: false,
        unpauseOnTrigger: false,
        keywords: [
          "1",
          "precio",
          "precios",
          "catalogo",
          "cuanto cuesta",
          "comprar",
          "iphone",
          "costo",
          "celulares",
          "disponibles",
          "disponible",
          "sigue disponible",
          "esta disponible",
          "tienen disponible",
          "stock",
          "modelos",
          "tienen",
          "que tienen"
        ],
        negativeKeywords: [
          "reparar",
          "reparacion",
          "taller",
          "pantalla",
          "bateria",
          "arreglo",
          "arreglar",
          "vidrio",
          "camara",
          "pin de carga",
          "danado",
          "roto",
          "rota",
          "vender",
          "vendo",
          "vender mi",
          "trade",
          "tradein",
          "trade-in",
          "abono",
          "parte de pago",
          "salud",
          "esim",
          "piezas",
          "garantia",
          "reclamo",
          "pagan",
          "cuanto pagan",
          "pagarian",
          "cuanto me pagarian",
          "cuanto dan",
          "cuanto me dan",
          "dan por",
          "me dan por",
          "compran",
          "reciben mi",
          "toman mi",
          "en cuanto me toman",
          "en cuanto toman",
          "en cuanto me reciben",
          "en cuanto reciben",
          "cuanto vale mi",
          "cuanto por mi",
          "tasar",
          "tasacion",
          "dar mi",
          "entregar mi",
          "aceptan",
          "reciben",
          "toman"
        ],
        message: 
          "📦 *Catálogo y Precios de TecnoTrade*\n\n" +
          "Encuentra todos nuestros iPhones y equipos disponibles con fotos reales, estado de batería y precios actualizados en nuestra web:\n\n" +
          "🔗 {TIENDA_URL}\n\n" +
          "💡 Si deseas consultar por un modelo en específico o apartarlo, escríbenos cuál buscas o marca *6* para hablar con un asesor.\n\n" +
          "(Escribe *Menú* para volver a ver las opciones)",
        routes: [],
        invalidMessage: null
      },
      {
        id: "step_repairs",
        title: "Paso 2: Taller y Reparaciones",
        type: "response",
        isRoot: false,
        position: { x: 740, y: 175 },
        priority: 10,
        autoPause: true,
        allowedWhenPaused: false,
        unpauseOnTrigger: false,
        keywords: [
          "2",
          "reparar",
          "reparacion",
          "reparaciones",
          "taller",
          "pantalla",
          "bateria",
          "arreglo",
          "arreglar",
          "vidrio",
          "camara",
          "cambio de pantalla",
          "cambio de bateria",
          "pin de carga",
          "centro de carga",
          "danado",
          "roto",
          "rota",
          "no prende",
          "mojado",
          "revisar"
        ],
        negativeKeywords: [
          "vender mi",
          "quiero vender",
          "parte de pago",
          "como abono",
          "piezas cambiadas",
          "cuanto pagan",
          "pagan por",
          "pagan",
          "cuanto dan",
          "cuanto me dan",
          "compran",
          "cuanto vale mi",
          "aceptan",
          "reciben",
          "toman"
        ],
        message: 
          "🔧 *Taller Especializado TecnoTrade*\n\n" +
          "Reparamos pantallas, baterías, cámaras, centros de carga y microelectrónica con repuestos certificados y garantía.\n\n" +
          "📋 Puedes consultar tarifas aproximadas en nuestro cotizador web:\n" +
          "🔗 {TIENDA_URL}#taller\n\n" +
          "💬 Déjanos escrito aquí **qué modelo tienes y qué falla presenta** para que un técnico te dé presupuesto en breve.\n\n" +
          "(Escribe *Menú* para reiniciar el bot)",
        routes: [],
        invalidMessage: null
      },
      {
        id: "step_tradein",
        title: "Paso 3: Vender o Cotizar (Trade-In)",
        type: "response",
        isRoot: false,
        position: { x: 740, y: 320 },
        priority: 9,
        autoPause: true,
        allowedWhenPaused: false,
        unpauseOnTrigger: false,
        keywords: [
          "3",
          "vender",
          "vendo",
          "vender mi",
          "quiero vender",
          "trade",
          "tradein",
          "trade-in",
          "abono",
          "parte de pago",
          "cambio mi",
          "aceptan",
          "aceptan iphone",
          "aceptan celulares",
          "aceptan celular",
          "aceptan telefono",
          "aceptan telefonos",
          "aceptan equipos",
          "aceptan trade",
          "aceptan tradein",
          "aceptan trade-in",
          "aceptan cambio",
          "aceptan cambios",
          "aceptan parte de pago",
          "aceptan como parte",
          "aceptan de parte",
          "aceptan en parte",
          "aceptan como abono",
          "aceptan abono",
          "aceptan mi",
          "modelos aceptan",
          "modelo aceptan",
          "modelos de iphone aceptan",
          "que modelos de iphone aceptan",
          "que aceptan",
          "cuales aceptan",
          "que modelos aceptan",
          "cuales modelos aceptan",
          "que iphone aceptan",
          "que celulares aceptan",
          "que telefonos aceptan",
          "que equipos aceptan",
          "desde que modelo aceptan",
          "hasta que modelo aceptan",
          "reciben",
          "reciben mi",
          "reciben celular",
          "reciben celulares",
          "reciben iphone",
          "reciben telefono",
          "reciben telefonos",
          "reciben equipos",
          "que modelos reciben",
          "cuales modelos reciben",
          "que reciben",
          "cuales reciben",
          "toman mi",
          "me toman",
          "toman celular",
          "toman celulares",
          "toman iphone",
          "toman telefono",
          "toman telefonos",
          "toman equipos",
          "toman equipo",
          "que modelos toman",
          "cuales modelos toman",
          "que toman",
          "en cuanto me toman",
          "en cuanto toman",
          "en cuanto me reciben",
          "en cuanto reciben",
          "cotizar mi",
          "cotizar",
          "cotizacion",
          "cuanto pagan",
          "pagan por",
          "pagan",
          "cuanto dan",
          "cuanto me dan",
          "cuanto dan por",
          "cuanto me dan por",
          "cuanto me pagan",
          "cuanto me pagarian",
          "cuanto pagarian",
          "cuanto vale mi",
          "cuanto por mi",
          "compran",
          "compran celular",
          "compran celulares",
          "compran iphone",
          "compran telefono",
          "compran telefonos",
          "compran equipos",
          "dar mi celular",
          "dar mi iphone",
          "dar mi telefono",
          "entregar mi celular",
          "entregar mi iphone",
          "tasar",
          "tasacion"
        ],
        negativeKeywords: [
          "reparar",
          "arreglar",
          "horario",
          "ubicacion",
          "tarjeta",
          "tarjetas",
          "yappy",
          "efectivo",
          "transferencia",
          "ach",
          "cuotas",
          "visa",
          "mastercard",
          "credito",
          "debito",
          "financiamiento",
          "pagar"
        ],
        message: 
          "¿Me brindas estos detalles del equipo, por favor? 📱\n" +
          "🔹 Modelo del equipo:\n" +
          "🔹 Almacenamiento:\n" +
          "🔹 Salud de batería:\n" +
          "🔹 Piezas cambiadas:\n" +
          "🔹 Detalles o daños:\n" +
          "🔹 ¿Es eSIM o chip?:\n\n" +
          "Con eso podemos revisar mejor el equipo y darte una cotización. 🙌\n\n" +
          "(Escribe *Menú* para volver a ver las opciones)",
        routes: [],
        invalidMessage: null
      },
      {
        id: "step_hours",
        title: "Paso 4: Horarios de Atención",
        type: "response",
        isRoot: false,
        position: { x: 740, y: 465 },
        priority: 4,
        autoPause: false,
        allowedWhenPaused: true,
        unpauseOnTrigger: false,
        keywords: ["4", "horario", "horarios", "hora abren", "a que hora", "abren", "abierto", "cierran"],
        negativeKeywords: ["bateria", "pantalla", "salud", "garantia"],
        message: 
          "🕒 *Horario de Atención TecnoTrade*\n\n" +
          "• *Lunes a Viernes:* 9:00 AM - 6:00 PM\n" +
          "• *Sábados:* 9:00 AM - 2:00 PM\n" +
          "• *Domingos:* Cerrado\n\n" +
          "¡Te esperamos en tienda física o atendemos tus pedidos en línea!\n\n" +
          "(Escribe *Menú* para volver a ver las opciones)",
        routes: [],
        invalidMessage: null
      },
      {
        id: "step_location",
        title: "Paso 5: Ubicación de Tienda",
        type: "response",
        isRoot: false,
        position: { x: 740, y: 610 },
        priority: 4,
        autoPause: false,
        allowedWhenPaused: true,
        unpauseOnTrigger: false,
        keywords: ["5", "ubicacion", "donde estan", "direccion", "como llegar", "tienda fisica", "mapa", "maps"],
        negativeKeywords: ["bateria", "pantalla", "salud"],
        message: 
          "📍 *Nuestra Ubicación*\n\n" +
          "Estamos ubicados en Ciudad de Panamá.\n\n" +
          "🗺️ Toca el enlace para abrir directamente en Google Maps:\n" +
          "{MAPS_URL}\n\n" +
          "Contamos con estacionamiento y seguridad para tu comodidad.\n\n" +
          "(Escribe *Menú* para volver a ver las opciones)",
        routes: [],
        invalidMessage: null
      },
      {
        id: "step_advisor",
        title: "Paso 6: Transferir a Asesor",
        type: "handoff",
        isRoot: false,
        position: { x: 740, y: 755 },
        priority: 12,
        autoPause: true,
        allowedWhenPaused: false,
        unpauseOnTrigger: false,
        keywords: [
          "6",
          "asesor",
          "humano",
          "persona",
          "agente",
          "ayuda",
          "soporte",
          "vendedor",
          "hablar con alguien",
          "garantia",
          "reclamo"
        ],
        negativeKeywords: [],
        message: 
          "👨‍💼 *Atención con un Asesor*\n\n" +
          "¡Entendido! Hemos notificado a nuestro equipo. Un asesor humano te responderá por este mismo chat en breve.\n\n" +
          "Por favor, déjanos tu consulta o detalle aquí abajo para atenderte más rápido. 👇",
        routes: [],
        invalidMessage: null
      }
    ]
  },

  // Arreglo legacy mantenido vacío por compatibilidad (las reglas viven unificadas en workflow.steps)
  hooks: [],

  // Mensaje cuando ninguna regla coincide (usado solo si silentFallback es false)
  fallbackResponse: 
    "Gracias por escribirnos a TecnoTrade. 👋\n\n" +
    "En breve un asesor revisará tu mensaje. Si deseas ver las opciones automáticas, escribe *Menú*."
};

/**
 * Normaliza un texto: minúsculas, sin acentos, sin puntuaciones y sin espacios extremos
 */
function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // sin tildes ni diacríticos
    .replace(/[¿?¡!.,;:#*_\-~]/g, " ") // reemplaza signos de puntuación comunes por espacio
    .replace(/\s+/g, " ") // colapsa espacios múltiples
    .trim();
}

/**
 * Reemplaza variables dinámicas y limpia llaves accidentales en URLs
 */
function formatResponseText(rawText, config) {
  if (!rawText) return "";
  let out = rawText;
  out = out.replace(/\{TIENDA_URL\}/g, config.settings?.tiendaUrl || "");
  out = out.replace(/\{MAPS_URL\}/g, config.settings?.mapsUrl || "");
  out = out.replace(/\{BUSINESS_NAME\}/g, config.settings?.businessName || "");
  out = out.replace(/\{(\s*https?:\/\/[^\}]+)\}/g, '$1');
  return out;
}

/**
 * Detecta si el mensaje parece ser una ficha técnica de un cliente respondiendo Trade-In o Taller
 * (Ej: "85%", "128gb", "256 gb", "esim", "piezas cambiadas")
 */
function looksLikeDeviceSpecs(cleanText) {
  const specPatterns = [
    /\b\d{2,3}\s*%/,          // Ej: 85%, 90 %
    /\b(64|128|256|512)\s*gb/, // Ej: 128gb, 256 gb
    /\besim\b/,
    /\bpiezas cambiadas\b/,
    /\bsalud de bateria\b/,
    /\blibre de fabrica\b/
  ];
  return specPatterns.some(regex => regex.test(cleanText));
}

const LEGACY_HOOK_TO_STEP = {
  hook_welcome: "step_welcome",
  hook_catalog: "step_catalog",
  hook_repairs: "step_repairs",
  hook_tradein: "step_tradein",
  hook_hours: "step_hours",
  hook_location: "step_location",
  hook_advisor: "step_advisor"
};

function hasNegativeMatch(node, clean) {
  return (node.negativeKeywords || []).some(neg => {
    const cleanNeg = normalizeText(neg);
    return cleanNeg && clean.includes(cleanNeg);
  });
}

function findMatchingNode(nodes, clean, options = {}) {
  const { requireLongKeyword = false } = options;
  for (const node of nodes) {
    if (hasNegativeMatch(node, clean)) continue;
    const matched = (node.keywords || []).some(kw => {
      const cleanKw = normalizeText(kw);
      if (!cleanKw) return false;
      if (requireLongKeyword && cleanKw.length <= 2) return false;
      return cleanKw.length <= 2 ? clean === cleanKw : clean.includes(cleanKw);
    });
    if (matched) return node;
  }
  return null;
}

/**
 * Motor Principal de Razonamiento, Pasos de Workflow y Resolución de Respuestas
 * @param {string} userText - Texto enviado por el usuario
 * @param {object} config - Configuración activa
 * @param {object} context - { isPaused: boolean, isNewCustomer: boolean, currentStep: string }
 */
function resolveBotResponse(userText, config = DEFAULT_CONFIG, context = {}) {
  const { isPaused = false, isNewCustomer = false, currentStep = null } = context;

  if (!userText || !userText.trim()) {
    return { text: null, hookId: null, nextStep: currentStep, shouldPause: false, shouldUnpause: false };
  }

  const clean = normalizeText(userText);
  const workflowSteps = Array.isArray(config.workflow?.steps) && config.workflow.steps.length > 0
    ? config.workflow.steps
    : DEFAULT_CONFIG.workflow.steps;
  const initialStepId = config.workflow?.initialStepId
    || (workflowSteps.find(s => s.isRoot) || workflowSteps[0])?.id
    || "step_welcome";
  const rootStep = workflowSteps.find(s => s.id === initialStepId)
    || workflowSteps.find(s => s.isRoot)
    || workflowSteps[0];
  const isStrictStepMode = config.settings?.strictStepMode !== false;

  // Unifica workflow.steps + cualquier gancho legacy huérfano que pudiera existir en configs viejas
  const existingStepIds = new Set(workflowSteps.map(s => s.id));
  const legacyExtras = (config.hooks || [])
    .filter(h => {
      const mappedId = LEGACY_HOOK_TO_STEP[h.id] || h.id;
      return !existingStepIds.has(mappedId);
    })
    .map(h => ({
      ...h,
      message: h.message || h.response || "",
      nextStepId: LEGACY_HOOK_TO_STEP[h.id] || h.id
    }));

  const sortedNodes = [...workflowSteps, ...legacyExtras]
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // 1. Comando explícito para pedir el menú o reactivar el bot
  if ((clean === "menu" || clean === "activar bot" || clean === "/bot" || clean === "inicio") && rootStep) {
    return {
      text: formatResponseText(rootStep.message, config),
      hookId: rootStep.id,
      nextStep: rootStep.id,
      shouldPause: false,
      shouldUnpause: true
    };
  }

  // 2. Si el usuario está en PAUSA (ya pidió Trade-In, Taller, Asesor o un humano le habló):
  if (isPaused) {
    if (looksLikeDeviceSpecs(clean)) {
      return { text: null, hookId: null, nextStep: currentStep, shouldPause: false, shouldUnpause: false };
    }

    const pausedAllowedNodes = sortedNodes.filter(n => n.allowedWhenPaused);
    const matchedPaused = findMatchingNode(pausedAllowedNodes, clean);
    if (matchedPaused) {
      return {
        text: formatResponseText(matchedPaused.message, config),
        hookId: matchedPaused.id,
        nextStep: currentStep,
        shouldPause: false,
        shouldUnpause: false
      };
    }

    return { text: null, hookId: null, nextStep: currentStep, shouldPause: false, shouldUnpause: false };
  }

  // 3. Si el mensaje parece directamente una lista de especificaciones técnicas
  if (looksLikeDeviceSpecs(clean) && !clean.includes("vender") && !clean.includes("reparar")) {
    const tradeinStepId = workflowSteps.some(s => s.id === "step_tradein") ? "step_tradein" : currentStep;
    return {
      text: null,
      hookId: "spec_detected_silent",
      nextStep: tradeinStepId,
      shouldPause: true,
      shouldUnpause: false
    };
  }

  // 4. Si el cliente está posicionado en un paso con enlaces salientes, evaluar primero esos enlaces
  const activeStep = currentStep ? workflowSteps.find(s => s.id === currentStep) : null;
  const effectiveActiveStep = activeStep || (isStrictStepMode && !isNewCustomer ? rootStep : null);

  if (effectiveActiveStep && Array.isArray(effectiveActiveStep.routes) && effectiveActiveStep.routes.length > 0) {
    for (const route of effectiveActiveStep.routes) {
      const targetStep = workflowSteps.find(s => s.id === route.targetStepId);
      if (!targetStep) continue;

      const keyTokens = String(route.key || "")
        .split(/[,|]/)
        .map(k => normalizeText(k))
        .filter(Boolean);
      const keyMatch = keyTokens.some(tk => clean === tk);

      const cleanLabel = normalizeText(route.label);
      const labelMatch = !keyMatch
        && cleanLabel
        && cleanLabel.length > 3
        && clean.includes(cleanLabel)
        && !hasNegativeMatch(targetStep, clean);

      if (keyMatch || labelMatch) {
        return {
          text: formatResponseText(targetStep.message, config),
          hookId: targetStep.id,
          nextStep: targetStep.id,
          shouldPause: Boolean(targetStep.autoPause || targetStep.type === "handoff" || targetStep.id === "step_advisor"),
          shouldUnpause: Boolean(targetStep.unpauseOnTrigger)
        };
      }
    }
  }

  // 5. Evaluación global por prioridad y palabras clave (protege intenciones directas de Meta Ads)
  const hasActiveRoutes = Boolean(
    effectiveActiveStep && Array.isArray(effectiveActiveStep.routes) && effectiveActiveStep.routes.length > 0
  );
  const matchedNode = findMatchingNode(sortedNodes, clean, {
    requireLongKeyword: isStrictStepMode && hasActiveRoutes
  });

  if (matchedNode) {
    const targetStepId = matchedNode.nextStepId || matchedNode.id;
    return {
      text: formatResponseText(matchedNode.message, config),
      hookId: matchedNode.id,
      nextStep: targetStepId,
      shouldPause: Boolean(matchedNode.autoPause || matchedNode.type === "handoff" || targetStepId === "step_advisor"),
      shouldUnpause: Boolean(matchedNode.unpauseOnTrigger)
    };
  }

  // 6. Validación estricta en cualquier paso con enlaces salientes definidos
  if (
    isStrictStepMode
    && !isNewCustomer
    && effectiveActiveStep
    && Array.isArray(effectiveActiveStep.routes)
    && effectiveActiveStep.routes.length > 0
    && effectiveActiveStep.invalidMessage
  ) {
    return {
      text: formatResponseText(effectiveActiveStep.invalidMessage, config),
      hookId: "invalid_option_error",
      nextStep: effectiveActiveStep.id,
      shouldPause: false,
      shouldUnpause: false
    };
  }

  // 7. Si ningún nodo coincidió y es cliente nuevo: enviar paso inicial
  if (isNewCustomer && rootStep) {
    return {
      text: formatResponseText(rootStep.message, config),
      hookId: "hook_welcome_new_user",
      nextStep: rootStep.id,
      shouldPause: Boolean(rootStep.autoPause),
      shouldUnpause: false
    };
  }

  // 8. Modo Recepcionista (silentFallback):
  const silentFallback = config.settings?.silentFallback !== false;
  if (silentFallback) {
    return { text: null, hookId: null, nextStep: currentStep, shouldPause: false, shouldUnpause: false };
  }

  return {
    text: formatResponseText(config.fallbackResponse, config),
    hookId: null,
    nextStep: currentStep,
    shouldPause: false,
    shouldUnpause: false
  };
}

module.exports = {
  DEFAULT_CONFIG,
  resolveBotResponse,
  normalizeText,
  formatResponseText
};
