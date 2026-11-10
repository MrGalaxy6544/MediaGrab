# MediaGrab

เว็บดาวน์โหลดวิดีโอ TikTok / Instagram / Facebook / X / YouTube และสตรีม HLS (.m3u8) รันบน GitHub Pages

## ทำงานอย่างไร

| แหล่ง | วิธีดึง | ต้องมีเซิร์ฟเวอร์เพิ่มไหม |
|---|---|---|
| TikTok | TikWM API (สาธารณะ) | ไม่ต้อง |
| Instagram, Facebook, X, YouTube ฯลฯ | cobalt ที่คุณรันเอง | **ต้อง** |
| HLS .m3u8 / ไฟล์ .mp4 ตรง | ดึงจากเบราว์เซอร์โดยตรง แล้วแปลง TS → MP4 ด้วย mux.js | ไม่ต้อง (แต่ถ้าโดน CORS ต้องใช้ Proxy) |

GitHub Pages เป็นเว็บ static อย่างเดียว ดึงลิงก์วิดีโอจาก IG/FB เองไม่ได้ เพราะต้องมีโค้ดฝั่งเซิร์ฟเวอร์ไปคุยกับแพลตฟอร์ม และอินสแตนซ์สาธารณะ `api.cobalt.tools` ไม่อนุญาตให้เว็บอื่นเรียกใช้ จึงต้องรัน cobalt เอง

## 1. เอาหน้าเว็บขึ้น GitHub Pages

1. สร้าง repository ใหม่ (Public) เช่น `mediagrab`
2. อัปโหลด `index.html` ไว้ที่ root ของ repo
3. Settings → Pages → Source: `Deploy from a branch` → Branch `main` / `/ (root)` → Save
4. รอสักครู่ จะได้ `https://<username>.github.io/mediagrab/`

ตอนนี้ใช้ TikTok และ HLS ได้แล้ว

## 2. รัน cobalt (สำหรับ IG / FB / X / YouTube)

ต้องมีเครื่องที่รัน Docker ได้ (VPS หรือเซิร์ฟเวอร์ในออฟฟิศ) และต้องเข้าถึงได้ผ่าน **HTTPS** เพราะหน้า GitHub Pages เป็น HTTPS เบราว์เซอร์จะบล็อกการเรียก HTTP

1. แก้ `cobalt/docker-compose.yml`
   - `API_URL` = URL HTTPS ของ cobalt (ลงท้ายด้วย `/`)
   - `CORS_URL` = `https://<username>.github.io` (ไม่ต้องใส่ path ของ repo)
2. `docker compose up -d`
3. เปิดให้เข้าจากอินเทอร์เน็ตแบบ HTTPS วิธีง่ายสุดคือ Cloudflare Tunnel:
   `cloudflared tunnel --url http://localhost:9000` (ชั่วคราว) หรือสร้าง tunnel ถาวรผูกโดเมน
4. ในหน้าเว็บ แท็บ **ตั้งค่า** ใส่ URL cobalt → กด **ทดสอบการเชื่อมต่อ** → **บันทึก**

หมายเหตุ
- Instagram บางโพสต์และ YouTube มักต้องใช้ cookies ของบัญชีจริง ดูวิธีทำไฟล์ cookies ในเอกสารของ cobalt
- แพลตฟอร์มเปลี่ยนระบบบ่อย compose นี้มี watchtower อัปเดต cobalt อัตโนมัติ
- `CORS_URL` กันเว็บอื่นเรียกผ่านเบราว์เซอร์ แต่ไม่กันสคริปต์ที่ยิงตรง ถ้ากังวลเรื่องคนอื่นใช้โควตา ให้เปิด API key (`API_AUTH_REQUIRED`) ตามเอกสาร cobalt แล้วใส่ key ในหน้าตั้งค่า (key จะเก็บใน localStorage ของเบราว์เซอร์คุณ)

## 3. (ไม่บังคับ) CORS Proxy บน Cloudflare Workers

ใช้เมื่อกดดาวน์โหลดแล้วขึ้นว่าดึงไฟล์โดยตรงไม่ได้ (CDN ต้นทางไม่เปิด CORS) หรือสตรีม HLS ต้องการ Referer

1. Cloudflare Dashboard → Workers & Pages → Create → Worker → วางโค้ดจาก `worker.js` → Deploy
2. Settings → Variables → เพิ่ม `ALLOWED_ORIGINS` = `https://<username>.github.io`
3. เอา URL `https://xxx.workers.dev` ไปใส่ช่อง Proxy ในแท็บตั้งค่า → ทดสอบ → บันทึก

แผนฟรีของ Workers มีจำกัด 100,000 request/วัน สตรีม HLS ยาว ๆ ใช้ request เยอะ (1 ชิ้น = 1 request)

## ข้อจำกัด

- HLS ที่เข้ารหัส (AES-128, SAMPLE-AES) และ DRM (Widevine, FairPlay) **ไม่รองรับ**
- ไฟล์ทั้งหมดพักใน RAM ก่อนบันทึก วิดีโอหลาย GB อาจทำให้แท็บค้าง ให้ใช้คำสั่ง `yt-dlp` ที่หน้าเว็บสร้างให้แทน
- สตรีมที่แยกแทร็กเสียง (EXT-X-MEDIA AUDIO) จะได้แค่ภาพ หน้าเว็บจะแจ้งเตือน
- TikWM เป็นบริการภายนอก ถ้าล่มหรือจำกัดการใช้งาน ระบบจะสลับไปใช้ cobalt (ถ้าตั้งค่าไว้)

ใช้กับคอนเทนต์ที่คุณมีสิทธิ์ดาวน์โหลดเท่านั้น
