// ========================================================
// API DE CONFIGURACIÓN, HOOKS Y REGISTRO DE CLIENTES
// ========================================================
const { 
  getConfig, 
  saveConfig, 
  getCustomersList,
  pauseUser,
  unpauseUser,
  deleteCustomer,
  getRedisCredentials 
} = require('../config/storage');

const DEFAULT_PIN = process.env.ADMIN_PIN || "047514";

module.exports = async function handler(req, res) {
  // CORS básico para permitir llamadas desde el frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Obtener la configuración actual y lista de clientes (GET)
  if (req.method === 'GET') {
    const [config, customers] = await Promise.all([
      getConfig(),
      getCustomersList()
    ]);
    const { isConnected } = getRedisCredentials();
    return res.status(200).json({
      ...config,
      customers,
      hasUpstash: isConnected
    });
  }

  // 2. Guardar configuración o gestionar clientes (POST)
  if (req.method === 'POST') {
    const pin = req.headers['x-admin-pin'] || req.body?.pin;

    if (pin !== DEFAULT_PIN) {
      return res.status(401).json({ error: 'PIN de seguridad incorrecto' });
    }

    const { action } = req.query;

    // Acción rápida: Alternar estado global activo/pausado
    if (action === 'toggle') {
      const current = await getConfig();
      const updated = { ...current, botActive: !current.botActive };
      const result = await saveConfig(updated);
      return res.status(200).json({ 
        success: true, 
        botActive: updated.botActive,
        persistence: result.persistence 
      });
    }

    // Acción: Pausar bot para un cliente específico
    if (action === 'customer_pause') {
      const userId = String(req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ error: 'Falta userId del cliente' });
      const hours = Number(req.body?.hours) || 12;
      const reason = req.body?.reason || 'Pausa manual desde panel';
      await pauseUser(userId, hours * 3600, reason, process.env.PAGE_ACCESS_TOKEN || '');
      const customers = await getCustomersList();
      return res.status(200).json({ success: true, customers });
    }

    // Acción: Reactivar bot para un cliente en pausa
    if (action === 'customer_unpause') {
      const userId = String(req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ error: 'Falta userId del cliente' });
      await unpauseUser(userId);
      const customers = await getCustomersList();
      return res.status(200).json({ success: true, customers });
    }

    // Acción: Eliminar/Resetear un cliente (vuelve a ser tratado como cliente nuevo)
    if (action === 'customer_delete') {
      const userId = String(req.body?.userId || '').trim();
      if (!userId) return res.status(400).json({ error: 'Falta userId del cliente' });
      await deleteCustomer(userId);
      const customers = await getCustomersList();
      return res.status(200).json({ success: true, customers });
    }

    // Acción: Refrescar lista de clientes
    if (action === 'customers_refresh') {
      const customers = await getCustomersList();
      return res.status(200).json({ success: true, customers });
    }

    // Guardar configuración completa de ganchos y respuestas
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Payload de configuración inválido' });
    }

    // Evitar guardar la lista de clientes dentro del objeto de configuración
    const cleanConfig = { ...newConfig };
    delete cleanConfig.customers;
    delete cleanConfig.hasUpstash;

    const result = await saveConfig(cleanConfig);
    return res.status(200).json({
      success: true,
      message: 'Configuración actualizada con éxito',
      persistence: result.persistence
    });
  }

  return res.status(405).json({ error: 'Método no permitido' });
};
