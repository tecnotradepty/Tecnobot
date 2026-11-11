# 🤖 Tecnobot - Bot de Instagram para TecnoTrade

Bot de mensajería automatizada para la cuenta oficial de Instagram **@tecnotradepty**, diseñado para responder al instante a clientes y anuncios publicitarios las 24 horas del día.

Alojado como función **Serverless en Vercel** con sincronización directa desde **GitHub Desktop**.

---

## 📁 Estructura del Proyecto

* **`config/responses.js`**: **Aquí editas las respuestas.** Contiene los textos, enlaces a tu catálogo, horarios de atención, ubicación y lógica de asesor humano.
* **`api/webhook.js`**: Función Serverless de Vercel que se conecta con la API oficial de Meta Graph API.
* **`local-server.js`**: Servidor opcional para pruebas en local.

---

## ⚙️ Variables de Entorno en Vercel

Al importar este repositorio en [Vercel](https://vercel.com), agrega estas 3 variables en *Project Settings > Environment Variables*:

| Variable | Valor |
| :--- | :--- |
| `VERIFY_TOKEN` | `tecnotrade_token_seguro_2026` |
| `PAGE_ACCESS_TOKEN` | Tu Token de acceso de Meta Developers |
| `INSTAGRAM_ACCOUNT_ID` | `17841441032714945` |

---

## 🔗 URL de Webhook para Meta for Developers

Una vez desplegado en Vercel, la URL del webhook en Meta será:
`https://TU-PROYECTO.vercel.app/api/webhook`

Con el token de verificación:
`tecnotrade_token_seguro_2026`
