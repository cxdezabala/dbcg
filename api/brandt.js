// Brandt AI — proxy serverless para Kairos.
// La API key vive SOLO aquí (variable de entorno en Vercel), nunca en kairos.html.
// Configurar en Vercel → Settings → Environment Variables:  OPENAI_API_KEY
//
// Recibe: { question, history:[{role,content}], context:{...snapshot de la sesión} }
// Devuelve: { answer }

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ALLOWED_HOSTS = ['dbcg.es', 'www.dbcg.es'];
const RATE_LIMIT = 20;            // peticiones
const RATE_WINDOW_MS = 60 * 60e3; // por hora y por IP
const hits = new Map();

const SYSTEM_PROMPT = `Eres Brandt AI, el director de estrategia dentro de Kairos, una plataforma de inteligencia de decisión para CEOs de PYMEs españolas.

CÓMO RESPONDES
- En español de España, directo y sin rodeos. Tono de asesor senior hablando con un CEO, no de chatbot.
- Máximo 120 palabras salvo que pidan detalle. Sin listas de más de 3 puntos. Sin emojis.
- Siempre aterrizas en una acción o en una pregunta que hace avanzar la decisión.

QUÉ SABES
Recibes un snapshot JSON de la sesión del usuario: su sector, tramo de facturación y empleados, los drivers macro con su variación y proyección, su estructura de coste, y el resultado del simulador (margen base, margen proyectado, delta en puntos porcentuales e impacto en EBITDA). Usa ESOS números, citándolos tal cual. No inventes cifras que no estén en el contexto.

LÍMITES QUE DEBES RESPETAR
- No conoces las cifras reales de la empresa: la estructura de coste es la media del sector y el impacto en euros usa el punto medio del tramo de facturación. Si la respuesta depende de ello, dilo.
- Si un driver no tiene proyección fiable, no la inventes: di que no hay fuente forward para ese dato.
- Distingue siempre entre dato publicado (histórico) y proyección (curva de futuros o previsión de organismo oficial).
- No das asesoramiento fiscal, legal ni laboral concreto: señalas que eso lo valide un profesional.
- Si preguntan algo ajeno a la gestión del negocio, redirige con una frase.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Solo desde el propio sitio (evita que terceros gasten tus créditos).
  // Los despliegues *.vercel.app de preview se permiten para poder probar.
  const origin = req.headers.origin || '';
  if (origin) {
    let host = '';
    try { host = new URL(origin).hostname; } catch (e) {}
    const ok = ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app') || host === 'localhost';
    if (!ok) return res.status(403).json({ error: 'Origen no permitido' });
  }

  // Throttle simple por IP. En serverless la memoria no se comparte entre
  // instancias: es un freno, no una garantía. Para límite estricto, usar KV.
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const prev = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_LIMIT) return res.status(429).json({ error: 'Demasiadas preguntas seguidas. Prueba en unos minutos.' });
  prev.push(now);
  hits.set(ip, prev);
  if (hits.size > 5000) hits.clear();

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY no configurada' });

  try {
    const { question, history = [], context = {} } = req.body || {};
    if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Falta question' });
    if (question.length > 1000) return res.status(400).json({ error: 'Pregunta demasiado larga' });

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: 'Snapshot de la sesión actual del usuario:\n' + JSON.stringify(context, null, 1) },
      ...history.slice(-8).filter(m => m && m.content).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content).slice(0, 2000),
      })),
      { role: 'user', content: question },
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4, max_tokens: 500 }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('OpenAI error', r.status, detail);
      return res.status(502).json({ error: 'Error del proveedor de IA' });
    }

    const data = await r.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: 'Respuesta vacía' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ answer });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
};
