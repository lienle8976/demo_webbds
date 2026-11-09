"""Web server chạy trên máy cho website My Home.

- Phục vụ file tĩnh của thư mục dự án (giống `python -m http.server`).
- Thêm POST /api/chat giống Vercel Function `api/chat.js`, để chatbox chạy được khi thử trên máy.
- API key GEMINI_API_KEY đọc lần lượt từ: biến môi trường của tiến trình → biến môi trường
  tài khoản Windows (HKCU\\Environment, đặt bằng
  [Environment]::SetEnvironmentVariable('GEMINI_API_KEY', '...', 'User')) → file `.env.local`
  ở thư mục gốc (dòng `GEMINI_API_KEY=...`, nằm trong .gitignore). Không bao giờ commit key.

Chạy:  python tools/dev_server.py [cổng]     (mặc định 8000)
Logic /api/chat giống hệt api/chat.js — sửa một bên thì sửa cả bên kia.
"""
import json
import os
import sys
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest"]
LIMITS = {"messages": 12, "text": 1000, "system": 20000}


def read_key():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    try:  # biến môi trường tài khoản Windows (đặt sau khi tiến trình đã chạy vẫn đọc được)
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as reg:
            key = str(winreg.QueryValueEx(reg, "GEMINI_API_KEY")[0]).strip()
        if key:
            return key
    except (ImportError, OSError):
        pass
    path = os.path.join(ROOT, ".env.local")
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig") as f:
            for line in f:
                name, _, value = line.partition("=")
                if name.strip() == "GEMINI_API_KEY":
                    return value.strip().strip("'\"")
    return ""


def clean_input(body):
    if not isinstance(body, dict):
        return None
    system = str(body.get("system") or "")[: LIMITS["system"]]
    raw = body.get("messages") if isinstance(body.get("messages"), list) else []
    messages = []
    for m in raw[-LIMITS["messages"]:]:
        m = m if isinstance(m, dict) else {}
        text = str(m.get("text") or "")[: LIMITS["text"]].strip()
        if text:
            messages.append({"role": "model" if m.get("role") == "model" else "user", "text": text})
    if not messages or messages[-1]["role"] != "user":
        return None
    return {"system": system, "messages": messages}


def ask_gemini(key, data):
    payload = json.dumps({
        "systemInstruction": {"parts": [{"text": data["system"]}]},
        "contents": [{"role": m["role"], "parts": [{"text": m["text"]}]} for m in data["messages"]],
        "generationConfig": {"maxOutputTokens": 800, "temperature": 0.6},
    }).encode("utf-8")
    last = (502, {"error": "Không nhận được trả lời từ Gemini."})
    for model in MODELS:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=payload,
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                out = json.loads(r.read().decode("utf-8"))
            parts = (out.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
            reply = "".join(p.get("text", "") for p in parts).strip()
            if reply:
                return 200, {"reply": reply}
            last = (502, {"error": "Gemini trả về câu trả lời rỗng."})
        except urllib.error.HTTPError as e:
            try:
                msg = json.loads(e.read().decode("utf-8")).get("error", {}).get("message")
            except Exception:
                msg = None
            last = (e.code, {"error": msg or f"Gemini lỗi {e.code}"})
            if e.code not in (404, 429, 500, 503):
                break  # lỗi khác (key sai...) → không thử tiếp
        except Exception:
            last = (502, {"error": "Không kết nối được tới Gemini."})
    return last


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path.split("?")[0] != "/api/chat":
            return self.send_json(404, {"error": "Không tìm thấy."})
        key = read_key()
        if not key:
            return self.send_json(500, {"error": "Máy chủ chưa cấu hình GEMINI_API_KEY (xem .env.local)."})
        try:
            length = min(int(self.headers.get("Content-Length") or 0), 200_000)
            data = clean_input(json.loads(self.rfile.read(length).decode("utf-8") or "{}"))
        except Exception:
            data = None
        if not data:
            return self.send_json(400, {"error": "Dữ liệu gửi lên không hợp lệ."})
        self.send_json(*ask_gemini(key, data))

    def end_headers(self):
        # Không cache khi phát triển để sửa xong tải lại là thấy ngay
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, directory=ROOT))
    print(f"My Home: http://localhost:{port}/  (chatbox: {'có key' if read_key() else 'CHƯA có GEMINI_API_KEY'})")
    server.serve_forever()
