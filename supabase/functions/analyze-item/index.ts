// Supabase Edge Function: analyze-item
// Tags a clothing photo via Gemini vision, returning the app's exact enums.
// Requires the GEMINI_API_KEY function secret. JWT verification stays on
// (default), so only signed-in app users can invoke it.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = ['top', 'bottom', 'shoe', 'outerwear', 'accessory'];
const COLORS = ['white', 'black', 'charcoal', 'cream', 'navy', 'denim', 'olive', 'burgundy', 'rust'];

const PROMPT = `You are tagging a single clothing item photo for a wardrobe app.
Return the closest match for each field. color must be the nearest of the allowed
palette even if the true color is not listed. formality: 1=casual, 2=smart casual,
3=business, 4=formal. warmth: 1=very light ... 5=very warm. pattern is "pattern"
only if the garment has a visible print, stripe, check, or motif; otherwise "solid".
name: a short descriptive name like "Grey wool cardigan".`;

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function clamp(n: unknown, lo: number, hi: number): number {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { imageBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imageBase64) return json({ error: 'imageBase64 is required' }, 400);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY not configured' }, 500);

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              category: { type: 'STRING', enum: CATEGORIES },
              color: { type: 'STRING', enum: COLORS },
              formality: { type: 'INTEGER' },
              warmth: { type: 'INTEGER' },
              pattern: { type: 'STRING', enum: ['solid', 'pattern'] },
            },
            required: ['name', 'category', 'color', 'formality', 'warmth', 'pattern'],
          },
        },
      }),
    });

    if (!res.ok) {
      console.error('Gemini error', res.status, await res.text());
      return json({ error: 'Vision model request failed' }, 502);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ error: 'Empty model response' }, 502);
    const raw = JSON.parse(text);

    // responseSchema should guarantee the enums, but clamp anyway so the app
    // never receives values outside its type union.
    return json({
      name: String(raw.name ?? '').slice(0, 60),
      category: CATEGORIES.includes(raw.category) ? raw.category : 'top',
      color: COLORS.includes(raw.color) ? raw.color : 'black',
      formality: clamp(raw.formality, 1, 4),
      warmth: clamp(raw.warmth, 1, 5),
      pattern: raw.pattern === 'pattern' ? 'pattern' : 'solid',
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Analysis failed' }, 500);
  }
});
