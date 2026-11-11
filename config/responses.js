// ========================================================
// CONFIGURACIÓN BASE Y REGLAS DE TECNOTRADE
// ========================================================

const DEFAULT_CONFIG = {
  // Estado maestro del bot (true = activo, false = pausado)
  botActive: true,

  // Datos generales del negocio
  settings: {
    businessName: "TecnoTrade Panamá",
    tiendaUrl: "https://tecno-trade.vercel.app/",
    mapsUrl: "https://maps.app.goo.gl/MzJWv73e1xWhbXWY6",
    phone: "+507 6852-9324",
    pin: "047514",
    advisorPauseHours: 12 // Horas que el bot se silencia para un usuario al pasar a asesor
  },

  // Flujo de ganchos ordenados por PRIORIDAD ESTRICTA
  // (Los primeros ganchos tienen mayor prioridad ante palabras compartidas)
  hooks: [
    // 1. REPARACIONES & TALLER (Alta prioridad: Si dice "reparar iphone", gana taller, no catálogo)
    {
      id: "hook_repairs",
      name: "Gancho: Taller y Reparaciones",
      type: "branch",
      priority: 10,
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
        "pin de carga",
        "centro de carga",
        "dañado",
        "rota",
        "revisar"
      ],
      title: "🔧 Taller Especializado & Reparaciones",
      response: 
        "🔧 *Taller Especializado TecnoTrade*\n\n" +
        "Reparamos pantallas, baterías, cámaras, centros de carga y microelectrónica con repuestos certificados y garantía.\n\n" +
        "📋 Puedes ver las tarifas de servicio en nuestro cotizador web:\n" +
        "🔗 {TIENDA_URL}#taller\n\n" +
        "💬 O escríbenos qué modelo tienes y qué falla presenta para darte presupuesto inmediato."
    },

    // 2. TRADE-IN / VENDER TELÉFONO
    {
      id: "hook_tradein",
      name: "Gancho: Trade-In / Vender",
      type: "branch",
      priority: 8,
      keywords: ["3", "vender", "vendo", "trade", "tradein", "abono", "cambio", "cotizar"],
      title: "📲 Vender o Cambiar Equipo",
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

    // 3. ASESOR HUMANO (Handoff)
    {
      id: "hook_advisor",
      name: "Gancho: Asesor Humano (Handoff)",
      type: "handoff",
      priority: 7,
      keywords: ["6", "asesor", "humano", "persona", "agente", "ayuda", "soporte", "vendedor", "hablar"],
      title: "👨‍💼 Transferir a Asesor Humano",
      response: 
        "👨‍💼 *Atención con un Asesor*\n\n" +
        "¡Entendido! Hemos notificado a nuestro equipo. Un asesor humano te responderá por este mismo chat en breve.\n\n" +
        "El bot se pausará automáticamente para que conversemos directamente. Por favor, déjanos tu consulta o modelo de interés para atenderte más rápido. 👇"
    },

    // 4. CATÁLOGO Y PRECIOS DE VENTA (Solo si NO es reparación ni venta)
    {
      id: "hook_catalog",
      name: "Gancho: Catálogo y Precios",
      type: "branch",
      priority: 5,
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
        "stock",
        "modelos"
      ],
      title: "📦 Catálogo de Productos",
      response: 
        "📦 *Catálogo y Precios de TecnoTrade*\n\n" +
        "Encuentra todos nuestros iPhones, teléfonos nuevos/seminuevos con fotos reales y precios actualizados en nuestra tienda:\n\n" +
        "🔗 {TIENDA_URL}\n\n" +
        "💡 Si buscas un modelo en específico, escribe el nombre (Ej: *iPhone 13*) o escribe *6* para atención personalizada."
    },

    // 5. HORARIOS DE ATENCIÓN
    {
      id: "hook_hours",
      name: "Gancho: Horarios de Atención",
      type: "branch",
      priority: 4,
      keywords: ["4", "horario", "horarios", "hora", "abren", "abierto", "atencion"],
      title: "🕒 Horario Comercial",
      response: 
        "🕒 *Horario de Atención TecnoTrade*\n\n" +
        "• *Lunes a Viernes:* 9:00 AM - 6:00 PM\n" +
        "• *Sábados:* 9:00 AM - 2:00 PM\n" +
        "• *Domingos:* Cerrado\n\n" +
        "¡Te esperamos en tienda física o atendemos tus pedidos en línea!"
    },

    // 6. UBICACIÓN Y MAPS
    {
      id: "hook_location",
      name: "Gancho: Ubicación de Tienda",
      type: "branch",
      priority: 4,
      keywords: ["5", "ubicacion", "donde", "direccion", "llegar", "tienda", "mapa", "maps"],
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

  // Mensaje cuando ninguna regla coincide
  fallbackResponse: 
    "Gracias por escribirnos a TecnoTrade. 🤔\n\n" +
    "No logré identificar tu consulta. Escribe *Menú* para ver las opciones disponibles o *6* para ser atendido por un asesor."
};

/**
 * Resuelve la respuesta y devuelve también el id del gancho activado
 */
function resolveBotResponse(userText, config = DEFAULT_CONFIG) {
  if (!userText) {
    return { text: config.fallbackResponse, hookId: null };
  }

  const clean = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Ordenar ganchos por prioridad descendente para evitar colisiones
  const sortedHooks = [...(config.hooks || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const hook of sortedHooks) {
    const matched = (hook.keywords || []).some(keyword => {
      const cleanKeyword = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      // Si la palabra clave es un solo número o <= 2 caracteres, requerir coincidencia exacta
      if (cleanKeyword.length <= 2) {
        return clean === cleanKeyword;
      }
      return clean.includes(cleanKeyword);
    });

    if (matched) {
      let finalResponse = hook.response;
      finalResponse = finalResponse.replace(/\{TIENDA_URL\}/g, config.settings?.tiendaUrl || "");
      finalResponse = finalResponse.replace(/\{MAPS_URL\}/g, config.settings?.mapsUrl || "");
      finalResponse = finalResponse.replace(/\{BUSINESS_NAME\}/g, config.settings?.businessName || "");
      finalResponse = finalResponse.replace(/\{(\s*https?:\/\/[^\}]+)\}/g, '$1');

      return {
        text: finalResponse,
        hookId: hook.id,
        isHandoff: hook.type === 'handoff' || hook.id === 'hook_advisor'
      };
    }
  }

  return { text: config.fallbackResponse, hookId: null, isHandoff: false };
}

module.exports = {
  DEFAULT_CONFIG,
  resolveBotResponse
};
