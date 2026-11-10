// MediaGrab CORS proxy — Cloudflare Worker
// ใช้ส่งต่อไฟล์วิดีโอ / เพลย์ลิสต์ HLS จากเซิร์ฟเวอร์ที่ไม่เปิด CORS ให้หน้าเว็บบน GitHub Pages
//
// ตั้งค่า Environment Variable ใน Cloudflare:
//   ALLOWED_ORIGINS = https://yourname.github.io      (คั่นหลายค่าด้วย , | ใส่ * เพื่ออนุญาตทุกเว็บ — ไม่แนะนำ)
//
// เรียกใช้:  https://<worker>.workers.dev/?url=<ลิงก์ไฟล์>&referer=<ไม่บังคับ>

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const allowOrigin = allowed.includes('*') ? '*' : (allowed.includes(origin) ? origin : '');

    const cors = {
      'Access-Control-Allow-Origin': allowOrigin || 'null',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!allowOrigin) return new Response('Origin not allowed', { status: 403, headers: cors });
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: cors });

    const params = new URL(request.url).searchParams;
    let target;
    try { target = new URL(params.get('url') || ''); } catch { return new Response('Missing or invalid ?url=', { status: 400, headers: cors }); }
    if (!/^https?:$/.test(target.protocol)) return new Response('Only http/https', { status: 400, headers: cors });

    // กันไม่ให้ใช้ proxy ยิงเข้าเครือข่ายภายใน
    const host = target.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i.test(host)) {
      return new Response('Blocked host', { status: 403, headers: cors });
    }

    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      'Accept': '*/*'
    });
    const range = request.headers.get('Range');
    if (range) headers.set('Range', range);
    const referer = params.get('referer');
    if (referer) {
      headers.set('Referer', referer);
      try { headers.set('Origin', new URL(referer).origin); } catch {}
    }

    let upstream;
    try {
      upstream = await fetch(target.toString(), { method: request.method, headers, redirect: 'follow' });
    } catch (e) {
      return new Response('Upstream fetch failed: ' + e.message, { status: 502, headers: cors });
    }

    const out = new Headers();
    for (const h of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag']) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    for (const [k, v] of Object.entries(cors)) out.set(k, v);
    out.set('Cache-Control', 'no-store');

    return new Response(upstream.body, { status: upstream.status, headers: out });
  }
};
