// ========================================================
// CONFIGURACIÓN BASE Y REGLAS DE TECNOTRADE
// ========================================================

const DEFAULT_CONFIG = {
  // Estado maestro del bot (true = activo, false = pausado)
  botActive: true,

  // Datos generales del negocio
  settings: {
    businessName: "TecnoTrade Panamá",
    tiendaUrl: "https://tecnotradepanama.com",
    mapsUrl: "https://maps.app.goo.gl/afVivm8pKRZtd5gF9",
    phone: "+507 6852-9324",
    pin: "047514"
  },

  // Flujo visual de nodos y ganchos (Hooks)
  hooks: [
    {
      id: "hook_welcome",
      name: "Gancho de Bienvenida",
      type: "trigger",
      keywords: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "menu", "inicio", "start", "info"],
      title: "👋 Menú Principal",
      response: 
        "¡Hola! 👋 Bienvenido a *TecnoTrade Panamá*.\n\n" +
        "¿En qué te podemos ayudar hoy? Escribe el *número* o la *palabra* de tu opción:\n\n" +
        "1️⃣ *Catálogo y Precios*\n" +
        "2️⃣ *Horario de Atención*\n" +
        "3️⃣ *Ubicación de Tienda*\n" +
        "4️⃣ *Vender o Cotizar mi Equipo*\n" +
        "5️⃣ *Hablar con un Asesor*"
    },
    {
      id: "hook_catalog",
      name: "Gancho 1: Catálogo y Precios",
      type: "branch",
      keywords: ["1", "precio", "precios", "catalogo", "cuanto cuesta", "iphone", "costo", "celulares"],
      title: "📦 Catálogo de Productos",
      response: 
        "📦 *Catálogo y Precios de TecnoTrade*\n\n" +
        "Encuentra todos nuestros iPhones, teléfonos nuevos/seminuevos con fotos reales y precios actualizados en nuestra tienda:\n\n" +
        "🔗 {TIENDA_URL}\n\n" +
        "💡 Si buscas un modelo en específico, escribe el nombre (Ej: *iPhone 13*) o escribe *5* para atención personalizada."
    },
    {
      id: "hook_hours",
      name: "Gancho 2: Horarios de Atención",
      type: "branch",
      keywords: ["2", "horario", "horarios", "hora", "abren", "abierto", "atencion"],
      title: "🕒 Horario Comercial",
      response: 
        "🕒 *Horario de Atención TecnoTrade*\n\n" +
        "• *Lunes a Viernes:* 9:00 AM - 6:00 PM\n" +
        "• *Sábados:* 9:00 AM - 2:00 PM\n" +
        "• *Domingos:* Cerrado\n\n" +
        "¡Te esperamos en tienda física o atendemos tus pedidos en línea!"
    },
    {
      id: "hook_location",
      name: "Gancho 3: Ubicación de Tienda",
      type: "branch",
      keywords: ["3", "ubicacion", "donde", "direccion", "llegar", "tienda", "mapa", "maps"],
      title: "📍 Ubicación y Mapa",
      response: 
        "📍 *Nuestra Ubicación*\n\n" +
        "Estamos ubicados en Ciudad de Panamá.\n\n" +
        "🗺️ Toca el enlace para abrir directamente en Google Maps:\n" +
        "{MAPS_URL}\n\n" +
        "Contamos con estacionamiento y seguridad para tu comodidad."
    },
    {
      id: "hook_tradein",
      name: "Gancho 4: Trade-In / Vender",
      type: "branch",
      keywords: ["4", "vender", "vendo", "trade", "tradein", "abono", "cambio", "cotizar"],
      title: "📲 Vender o Cambiar Equipo",
      response: 
        "📲 *Vende o Cambia tu Equipo (Trade-In)*\n\n" +
        "¿Quieres vender tu teléfono o darlo como abono por uno nuevo?\n\n" +
        "Cotízalo de inmediato en nuestra sección web:\n" +
        "🔗 {TIENDA_URL}#vender\n\n" +
        "Evaluamos tu equipo y te pagamos al instante."
    },
    {
      id: "hook_advisor",
      name: "Gancho 5: Asesor Humano (Handoff)",
      type: "handoff",
      keywords: ["5", "asesor", "humano", "persona", "agente", "ayuda", "soporte", "vendedor"],
      title: "👨‍💼 Transferir a Asesor Humano",
      response: 
        "👨‍💼 *Atención con un Asesor*\n\n" +
        "¡Entendido! Hemos notificado a nuestro equipo. Un asesor humano te responderá por este mismo chat en breve dentro de nuestro horario laboral.\n\n" +
        "Por favor, déjanos tu consulta o modelo de interés para atenderte más rápido. 👇"
    }
  ],

  // Mensaje cuando ninguna regla coincide
  fallbackResponse: 
    "Gracias por escribirnos a TecnoTrade. 🤔\n\n" +
    "No logré identificar tu consulta. Escribe *Menú* para ver las opciones disponibles o *5* para ser atendido por un asesor."
};

/**
 * Procesa el mensaje del usuario con la configuración activa
 */
function resolveBotResponse(userText, config = DEFAULT_CONFIG) {
  if (!userText) return config.fallbackResponse;

  const clean = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Buscar coincidencia en los ganchos configurados
  for (const hook of config.hooks || []) {
    const matched = hook.keywords.some(keyword => {
      const cleanKeyword = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (cleanKeyword.length <= 2) {
        return clean === cleanKeyword;
      }
      return clean.includes(cleanKeyword);
    });

    if (matched) {
      let finalResponse = hook.response;
      // Reemplazo de variables dinámicas
      finalResponse = finalResponse.replace(/\{TIENDA_URL\}/g, config.settings?.tiendaUrl || "");
      finalResponse = finalResponse.replace(/\{MAPS_URL\}/g, config.settings?.mapsUrl || "");
      finalResponse = finalResponse.replace(/\{BUSINESS_NAME\}/g, config.settings?.businessName || "");
      return finalResponse;
    }
  }

  return config.fallbackResponse;
}

module.exports = {
  DEFAULT_CONFIG,
  resolveBotResponse
};
