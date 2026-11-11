// ========================================================
// CONFIGURACIÓN DE RESPUESTAS Y MENÚS DE TECNOTRADE
// ========================================================
// Puedes editar los textos, enlaces y emojis de este archivo
// en cualquier momento. Al hacer Push en GitHub Desktop,
// Vercel actualizará los cambios automáticamente.

const BOT_CONFIG = {
  // Enlaces oficiales
  TIENDA_URL: "https://tecnotradepanama.com", // o tu URL oficial de Vercel
  MAPS_URL: "https://maps.google.com/?q=Tecnotrade+Panama",

  // Mensaje de Bienvenida y Menú Principal
  menuPrincipal: () => 
    "¡Hola! 👋 Bienvenido a *TecnoTrade Panamá*.\n\n" +
    "¿En qué te podemos ayudar hoy? Escribe el *número* o la *palabra* de tu opción:\n\n" +
    "1️⃣ *Catálogo y Precios*\n" +
    "2️⃣ *Horario de Atención*\n" +
    "3️⃣ *Ubicación de Tienda*\n" +
    "4️⃣ *Vender o Cotizar mi Equipo*\n" +
    "5️⃣ *Hablar con un Asesor*",

  // Opción 1: Catálogo y Precios
  catalogo: (tiendaUrl) => 
    "📦 *Catálogo y Precios de TecnoTrade*\n\n" +
    "Encuentra todos nuestros iPhones, teléfonos nuevos/seminuevos con fotos reales y precios actualizados en nuestra tienda:\n\n" +
    `🔗 ${tiendaUrl}\n\n` +
    "💡 Si buscas un modelo en específico, escribe el nombre (Ej: *iPhone 13*) o escribe *5* para atención personalizada.",

  // Opción 2: Horarios
  horario: () =>
    "🕒 *Horario de Atención TecnoTrade*\n\n" +
    "• *Lunes a Viernes:* 9:00 AM - 6:00 PM\n" +
    "• *Sábados:* 9:00 AM - 2:00 PM\n" +
    "• *Domingos:* Cerrado\n\n" +
    "¡Te esperamos en tienda física o atendemos tus pedidos en línea!",

  // Opción 3: Ubicación
  ubicacion: (mapsUrl) =>
    "📍 *Nuestra Ubicación*\n\n" +
    "Estamos ubicados en Ciudad de Panamá.\n\n" +
    "🗺️ Toca el enlace para abrir directamente en Google Maps:\n" +
    `${mapsUrl}\n\n` +
    "Contamos con estacionamiento y seguridad para tu comodidad.",

  // Opción 4: Trade-In / Vender mi equipo
  tradeIn: (tiendaUrl) =>
    "📲 *Vende o Cambia tu Equipo (Trade-In)*\n\n" +
    "¿Quieres vender tu teléfono o darlo como abono por uno nuevo?\n\n" +
    "Cotízalo de inmediato en nuestra sección web:\n" +
    `🔗 ${tiendaUrl}#vender\n\n` +
    "Evaluamos tu equipo y te pagamos al instante.",

  // Opción 5: Asesor Humano (Handoff)
  asesor: () =>
    "👨‍💼 *Atención con un Asesor*\n\n" +
    "¡Entendido! Hemos notificado a nuestro equipo. Un asesor humano te responderá por este mismo chat en breve dentro de nuestro horario laboral.\n\n" +
    "Por favor, déjanos tu consulta o modelo de interés para atenderte más rápido. 👇",

  // Mensaje por defecto cuando no reconoce la entrada
  noEntendido: () =>
    "Gracias por escribirnos a TecnoTrade. 🤔\n\n" +
    "No logré identificar tu consulta. Escribe *Menú* para ver las opciones disponibles o *5* para ser atendido por un asesor."
};

/**
 * Función que analiza el texto del usuario y devuelve la respuesta correspondiente
 */
function getBotResponse(userText) {
  if (!userText) return BOT_CONFIG.noEntendido();

  // Limpiar texto: minúsculas, sin tildes ni espacios extra
  const clean = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Saludos y llamada al menú
  if (
    clean === "hola" || 
    clean.includes("buen") || 
    clean === "menu" || 
    clean === "inicio" || 
    clean === "start" || 
    clean === "info"
  ) {
    return BOT_CONFIG.menuPrincipal();
  }

  // 1. Catálogo / Precios
  if (
    clean === "1" || 
    clean.includes("precio") || 
    clean.includes("catalogo") || 
    clean.includes("cuanto cuesta") || 
    clean.includes("iphone") || 
    clean.includes("costo")
  ) {
    return BOT_CONFIG.catalogo(BOT_CONFIG.TIENDA_URL);
  }

  // 2. Horarios
  if (
    clean === "2" || 
    clean.includes("horario") || 
    clean.includes("hora") || 
    clean.includes("abren") || 
    clean.includes("abierto")
  ) {
    return BOT_CONFIG.horario();
  }

  // 3. Ubicación
  if (
    clean === "3" || 
    clean.includes("ubicacion") || 
    clean.includes("donde") || 
    clean.includes("direccion") || 
    clean.includes("llegar") || 
    clean.includes("tienda")
  ) {
    return BOT_CONFIG.ubicacion(BOT_CONFIG.MAPS_URL);
  }

  // 4. Trade-In / Vender teléfono
  if (
    clean === "4" || 
    clean.includes("vender") || 
    clean.includes("vendo") || 
    clean.includes("trade") || 
    clean.includes("abono") || 
    clean.includes("cambio")
  ) {
    return BOT_CONFIG.tradeIn(BOT_CONFIG.TIENDA_URL);
  }

  // 5. Asesor humano
  if (
    clean === "5" || 
    clean.includes("asesor") || 
    clean.includes("humano") || 
    clean.includes("persona") || 
    clean.includes("agente") || 
    clean.includes("ayuda")
  ) {
    return BOT_CONFIG.asesor();
  }

  // Fallback
  return BOT_CONFIG.noEntendido();
}

module.exports = {
  BOT_CONFIG,
  getBotResponse
};
