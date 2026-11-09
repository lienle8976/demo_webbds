/* =========================================================
   Vercel Function: POST /api/chat — chuyển tiếp hội thoại tới Google Gemini.
   - API key KHÔNG nằm trong code: đọc từ biến môi trường GEMINI_API_KEY
     (Vercel → Project → Settings → Environment Variables).
   - Giới hạn kích thước đầu vào/đầu ra để tránh bị lạm dụng.
   - Model chính quá tải (429/503) hoặc không còn (404) → thử model dự phòng.
   Logic này giống hệt tools/dev_server.py (bản chạy trên máy) — sửa một bên thì sửa cả bên kia.
   ========================================================= */
const MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
const LIMITS = { messages: 12, text: 1000, system: 20000 };

function cleanInput(body) {
  const system = String(body?.system ?? '').slice(0, LIMITS.system);
  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-LIMITS.messages)
    .map((m) => ({ role: m?.role === 'model' ? 'model' : 'user', text: String(m?.text ?? '').slice(0, LIMITS.text).trim() }))
    .filter((m) => m.text);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  return { system, messages };
}

async function askGemini(key, { system, messages }) {
  const payload = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { maxOutputTokens: 800, temperature: 0.6 },
  };
  let last = { status: 502, error: 'Không nhận được trả lời từ Gemini.' };
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) {
      const reply = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (reply) return { status: 200, reply, model };
      last = { status: 502, error: 'Gemini trả về câu trả lời rỗng.' };
      continue;
    }
    last = { status: r.status, error: data.error?.message || `Gemini lỗi ${r.status}` };
    if (![404, 429, 500, 503].includes(r.status)) break; // lỗi khác (key sai...) → không thử tiếp
  }
  return last;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Chỉ hỗ trợ POST.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Máy chủ chưa cấu hình GEMINI_API_KEY.' });

  let input = null;
  try { input = cleanInput(typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body); } catch { /* JSON hỏng */ }
  if (!input) return res.status(400).json({ error: 'Dữ liệu gửi lên không hợp lệ.' });

  try {
    const out = await askGemini(key, input);
    res.status(out.status).json(out.reply ? { reply: out.reply } : { error: out.error });
  } catch (e) {
    res.status(502).json({ error: 'Không kết nối được tới Gemini.' });
  }
};
