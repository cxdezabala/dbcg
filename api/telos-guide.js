// La Guía — proxy serverless para el chat del front público de Telos.
// Mismo patrón que api/brandt.js (Kairos): la API key vive SOLO aquí,
// nunca en telos.html. Reutiliza la misma variable de entorno OPENAI_API_KEY
// -- si ya está configurada para Brandt AI, no hace falta añadir nada nuevo.
//
// Recibe: { question, history:[{role,content}], context:{...escenario del usuario} }
// Devuelve: { answer }
//
// Guardrails que no se negocian (PROMPT-claude-code.md §0): el front público
// nunca contiene lenguaje de producto, nunca inventa cifras de producto, el
// benchmark del 3% nunca se manipula ni se presenta como garantizado, y
// nunca se menciona un proveedor. Este endpoint habla con público anónimo,
// así que el system prompt es más estricto que el de Brandt (que es
// back-office para el asesor).

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ALLOWED_HOSTS = ['dbcg.es', 'www.dbcg.es'];
const RATE_LIMIT = 20;            // peticiones
const RATE_WINDOW_MS = 60 * 60e3; // por hora y por IP
const hits = new Map();

const SYSTEM_PROMPT = `Eres "la Guía" dentro de Telos, una herramienta educativa de DBCG para explorar estrategias de ahorro programado (retiro propio o educación de los hijos). Hablas con una persona anónima que está explorando su propio escenario en el front público -- no eres un asesor y no hay ninguna reunión comercial en curso todavía.

CÓMO RESPONDES
- En español, cercano pero profesional. Directo, sin rodeos, sin emojis.
- Máximo 100 palabras salvo que pidan explícitamente más detalle.
- Usa SOLO las cifras del escenario que recibes en el contexto (edad, aportación anual, horizonte, total aportado, capital estimado). No inventes ninguna cifra que no esté ahí.
- Todo cálculo que muestres asume una rentabilidad hipotética constante del 3% anual. Dilo si haces cualquier cálculo con esa cifra.

LÍMITES QUE NUNCA CRUZAS
- Nunca menciones ningún producto financiero concreto, aseguradora, marca ni nombre de proveedor -- ni aunque te pregunten directamente qué hay detrás de Telos o qué producto es. Si preguntan eso, responde que los detalles de la estructura se presentan en una conversación con un asesor, y sugiere agendarla.
- Nunca prometas ni sugieras una rentabilidad garantizada. El 3% es una referencia hipotética para pensar en órdenes de magnitud, nunca una promesa.
- No dabas asesoramiento fiscal, legal ni de inversión concreto: señala que eso lo valide un profesional.
- Si preguntan algo ajeno al ahorro programado, la educación o el retiro, redirige con una frase breve.`;

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
  // instancias: es un freno, no una garantía.
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
      { role: 'system', content: 'Escenario actual del usuario en Telos:\n' + JSON.stringify(context, null, 1) },
      ...history.slice(-8).filter(m => m && m.content).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content).slice(0, 2000),
      })),
      { role: 'user', content: question },
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4, max_tokens: 400 }),
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
