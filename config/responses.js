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
    silentFallback: true   // true = No interrumpir con "No entendí" si el cliente escribe algo fuera de los ganchos
  },

  // Flujo de ganchos ordenados por PRIORIDAD ESTRICTA
  hooks: [
    // 1. ASESOR HUMANO & GARANTÍAS (Prioridad Crítica 12: Escape inmediato a humano)
    {
      id: "hook_advisor",
      name: "Gancho 6: Asesor Humano y Garantías",
      type: "handoff",
      priority: 12,
      autoPause: true,
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
      title: "👨‍💼 Transferir a Asesor Humano",
      response: 
        "👨‍💼 *Atención con un Asesor*\n\n" +
        "¡Entendido! Hemos notificado a nuestro equipo. Un asesor humano te responderá por este mismo chat en breve.\n\n" +
        "Por favor, déjanos tu consulta o detalle aquí abajo para atenderte más rápido. 👇"
    },

    // 2. REPARACIONES & TALLER (Prioridad 10: Gana sobre "iphone" si mencionan falla o reparación)
    {
      id: "hook_repairs",
      name: "Gancho 2: Taller y Reparaciones",
      type: "branch",
      priority: 10,
      autoPause: true, // Se pausa tras enviar para que el cliente describa su falla sin disparar otros ganchos
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
      title: "🔧 Taller Especializado & Reparaciones",
      response: 
        "🔧 *Taller Especializado TecnoTrade*\n\n" +
        "Reparamos pantallas, baterías, cámaras, centros de carga y microelectrónica con repuestos certificados y garantía.\n\n" +
        "📋 Puedes consultar tarifas aproximadas en nuestro cotizador web:\n" +
        "🔗 {TIENDA_URL}#taller\n\n" +
        "💬 O déjanos escrito aquí **qué modelo tienes y qué falla presenta** para que un técnico te dé presupuesto en breve."
    },

    // 3. TRADE-IN / VENDER TELÉFONO (Prioridad 9: Pide los 6 datos y se auto-pausa)
    {
      id: "hook_tradein",
      name: "Gancho 3: Trade-In / Vender",
      type: "branch",
      priority: 9,
      autoPause: true, // CRÍTICO: Se pausa tras enviar el cuestionario para que al responder "pantalla" o "iPhone" el bot no interrumpa
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
      title: "📲 Vender o Cambiar Equipo (Trade-In)",
      response: 
        "¿Me brindas estos detalles del equipo, por favor? 📱\n" +
        "🔹 Modelo del equipo:\n" +
        "🔹 Almacenamiento:\n" +
        "🔹 Salud de batería:\n" +
        "🔹 Piezas cambiadas:\n" +
        "🔹 Detalles o daños:\n" +
        "🔹 ¿Es eSIM o chip?:\n\n" +
        "Con eso podemos revisar mejor el equipo y darte una cotización. 🙌"
    },

    // 4. CATÁLOGO Y PRECIOS DE VENTA (Prioridad 5: Protegido con Negative Keywords)
    {
      id: "hook_catalog",
      name: "Gancho 1: Catálogo y Precios",
      type: "branch",
      priority: 5,
      autoPause: false,
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
      title: "📦 Catálogo de Productos",
      response: 
        "📦 *Catálogo y Precios de TecnoTrade*\n\n" +
        "Encuentra todos nuestros iPhones y equipos disponibles con fotos reales, estado de batería y precios actualizados en nuestra web:\n\n" +
        "🔗 {TIENDA_URL}\n\n" +
        "💡 Si deseas consultar por un modelo en específico o apartarlo, escríbenos cuál buscas o marca *6* para hablar con un asesor."
    },

    // 5. HORARIOS DE ATENCIÓN (Permitido incluso si está esperando asesor)
    {
      id: "hook_hours",
      name: "Gancho 4: Horarios de Atención",
      type: "branch",
      priority: 4,
      autoPause: false,
      allowedWhenPaused: true,
      keywords: ["4", "horario", "horarios", "hora abren", "a que hora", "abren", "abierto", "cierran"],
      negativeKeywords: ["bateria", "pantalla", "salud", "garantia"],
      title: "🕒 Horario Comercial",
      response: 
        "🕒 *Horario de Atención TecnoTrade*\n\n" +
        "• *Lunes a Viernes:* 9:00 AM - 6:00 PM\n" +
        "• *Sábados:* 9:00 AM - 2:00 PM\n" +
        "• *Domingos:* Cerrado\n\n" +
        "¡Te esperamos en tienda física o atendemos tus pedidos en línea!"
    },

    // 6. UBICACIÓN Y MAPS (Permitido incluso si está esperando asesor)
    {
      id: "hook_location",
      name: "Gancho 5: Ubicación de Tienda",
      type: "branch",
      priority: 4,
      autoPause: false,
      allowedWhenPaused: true,
      keywords: ["5", "ubicacion", "donde estan", "direccion", "como llegar", "tienda fisica", "mapa", "maps"],
      negativeKeywords: ["bateria", "pantalla", "salud"],
      title: "📍 Ubicación y Mapa",
      response: 
        "📍 *Nuestra Ubicación*\n\n" +
        "Estamos ubicados en Ciudad de Panamá.\n\n" +
        "🗺️ Toca el enlace para abrir directamente en Google Maps:\n" +
        "{MAPS_URL}\n\n" +
        "Contamos con estacionamiento y seguridad para tu comodidad."
    },

    // 7. BIENVENIDA Y MENÚ GENERAL
    {
      id: "hook_welcome",
      name: "Gancho: Bienvenida y Menú",
      type: "trigger",
      priority: 1,
      autoPause: false,
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
      title: "👋 Menú Principal",
      response: 
        "¡Hola! 👋 Bienvenido a *TecnoTrade Panamá*.\n\n" +
        "¿En qué te podemos ayudar hoy? Escribe el *número* o la *palabra* de tu opción:\n\n" +
        "1️⃣ *Catálogo de Equipos y Precios*\n" +
        "2️⃣ *Taller de Reparaciones* 🔧\n" +
        "3️⃣ *Vender o Cotizar mi Equipo (Trade-In)*\n" +
        "4️⃣ *Horario de Atención*\n" +
        "5️⃣ *Ubicación de Tienda*\n" +
        "6️⃣ *Hablar con un Asesor*"
    }
  ],

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

/**
 * Motor Principal de Razonamiento y Resolución de Respuestas
 * @param {string} userText - Texto enviado por el usuario
 * @param {object} config - Configuración activa
 * @param {object} context - { isPaused: boolean, isNewCustomer: boolean }
 */
function resolveBotResponse(userText, config = DEFAULT_CONFIG, context = {}) {
  const { isPaused = false, isNewCustomer = false } = context;

  if (!userText || !userText.trim()) {
    return { text: null, hookId: null, shouldPause: false, shouldUnpause: false };
  }

  const clean = normalizeText(userText);

  // 1. Comando explícito para pedir el menú o reactivar el bot
  if (clean === "menu" || clean === "activar bot" || clean === "/bot" || clean === "inicio") {
    const welcomeHook = (config.hooks || []).find(h => h.id === "hook_welcome") || DEFAULT_CONFIG.hooks.find(h => h.id === "hook_welcome");
    return {
      text: formatResponseText(welcomeHook.response, config),
      hookId: "hook_welcome",
      shouldPause: false,
      shouldUnpause: true
    };
  }

  // 2. Si el usuario está en PAUSA (ya pidió Trade-In, Taller, Asesor o un humano le habló):
  // Ignorar cualquier respuesta conversacional (como "pantalla", "iPhone 13", "85%", etc.)
  // Solo permitir consultas directas de Ubicación u Horario si no son especificaciones de un teléfono
  if (isPaused) {
    if (looksLikeDeviceSpecs(clean)) {
      return { text: null, hookId: null, shouldPause: false, shouldUnpause: false };
    }

    // Permitir únicamente ganchos marcados con allowedWhenPaused (Ubicación / Horario)
    // siempre y cuando no contengan palabras negativas
    const pausedAllowedHooks = (config.hooks || []).filter(h => h.allowedWhenPaused);
    for (const hook of pausedAllowedHooks) {
      const hasNeg = (hook.negativeKeywords || []).some(neg => {
        const cn = normalizeText(neg);
        return cn && clean.includes(cn);
      });
      if (hasNeg) continue;

      const matched = (hook.keywords || []).some(kw => {
        const ck = normalizeText(kw);
        if (!ck) return false;
        return ck.length <= 2 ? clean === ck : clean.includes(ck);
      });

      if (matched) {
        return {
          text: formatResponseText(hook.response, config),
          hookId: hook.id,
          shouldPause: false,
          shouldUnpause: false
        };
      }
    }

    // Para todo lo demás mientras está en pausa: SILENCIO ABSOLUTO (no interrumpir)
    return { text: null, hookId: null, shouldPause: false, shouldUnpause: false };
  }

  // 3. Si el mensaje parece directamente una lista de especificaciones técnicas (ej. el cliente mandó los datos de su celular de una vez)
  if (looksLikeDeviceSpecs(clean) && !clean.includes("vender") && !clean.includes("reparar")) {
    return {
      text: null,
      hookId: "spec_detected_silent",
      shouldPause: true, // Pausar para que el asesor revise los datos
      shouldUnpause: false
    };
  }

  // 4. Evaluar ganchos por orden de prioridad estricta
  const sortedHooks = [...(config.hooks || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const hook of sortedHooks) {
    // A. Verificar primero las PALABRAS CLAVE NEGATIVAS (Exclusiones)
    const hasNegativeMatch = (hook.negativeKeywords || []).some(neg => {
      const cleanNeg = normalizeText(neg);
      if (!cleanNeg) return false;
      return clean.includes(cleanNeg);
    });

    if (hasNegativeMatch) {
      // Este gancho queda descartado porque contiene una palabra negativa prohibida
      continue;
    }

    // B. Verificar palabras clave positivas
    const hasPositiveMatch = (hook.keywords || []).some(keyword => {
      const cleanKeyword = normalizeText(keyword);
      if (!cleanKeyword) return false;
      // Números de 1 o 2 dígitos requieren coincidencia exacta del mensaje completo
      if (cleanKeyword.length <= 2) {
        return clean === cleanKeyword;
      }
      return clean.includes(cleanKeyword);
    });

    if (hasPositiveMatch) {
      const finalResponse = formatResponseText(hook.response, config);
      const shouldPause = Boolean(hook.autoPause || hook.type === 'handoff' || hook.id === 'hook_advisor');

      return {
        text: finalResponse,
        hookId: hook.id,
        shouldPause,
        shouldUnpause: Boolean(hook.unpauseOnTrigger)
      };
    }
  }

  // 5. Si ningún gancho coincidió:
  // Si es el PRIMER mensaje de un cliente nuevo, recibirlo con el Menú Principal
  if (isNewCustomer) {
    const welcomeHook = (config.hooks || []).find(h => h.id === "hook_welcome") || DEFAULT_CONFIG.hooks.find(h => h.id === "hook_welcome");
    if (welcomeHook) {
      return {
        text: formatResponseText(welcomeHook.response, config),
        hookId: "hook_welcome_new_user",
        shouldPause: false,
        shouldUnpause: false
      };
    }
  }

  // Si NO es cliente nuevo y está activo el Modo Recepcionista (silentFallback = true):
  // No interrumpir el flujo normal de conversación
  const silentFallback = config.settings?.silentFallback !== false;
  if (silentFallback) {
    return { text: null, hookId: null, shouldPause: false, shouldUnpause: false };
  }

  return {
    text: formatResponseText(config.fallbackResponse, config),
    hookId: null,
    shouldPause: false,
    shouldUnpause: false
  };
}

module.exports = {
  DEFAULT_CONFIG,
  resolveBotResponse,
  normalizeText
};
