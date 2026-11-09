# Hook SessionStart: bật web server Python ở cổng 8000 cho website My Home.
# - Nếu cổng 8000 đã có tiến trình lắng nghe thì không chạy thêm.
# - Server chạy nền (ẩn cửa sổ), phục vụ thư mục gốc dự án bằng tools/dev_server.py
#   (file tĩnh + POST /api/chat cho chatbox).
# - In JSON để Claude biết địa chỉ server và người dùng thấy thông báo.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$port = 8000
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)   # .claude/hooks -> thư mục dự án
$url = "http://localhost:$port/"

# Thử kết nối TCP tới cổng: nhanh và đáng tin hơn Get-NetTCPConnection
function Test-Port {
  $client = New-Object Net.Sockets.TcpClient
  try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}

function Out-Json($message) {
  @{
    systemMessage      = $message
    hookSpecificOutput = @{
      hookEventName     = 'SessionStart'
      additionalContext = "Web server Python đang chạy tại $url (thư mục $root). Dùng địa chỉ này để mở và kiểm tra website."
    }
  } | ConvertTo-Json -Compress
}

if (Test-Port) {
  Out-Json "Server đã chạy sẵn: $url"
  exit 0
}

$python = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $python) { $python = (Get-Command py -ErrorAction SilentlyContinue).Source }
if (-not $python) {
  @{ systemMessage = "Không tìm thấy Python, chưa bật được server cổng $port." } | ConvertTo-Json -Compress
  exit 0
}

# tools/dev_server.py = http.server + POST /api/chat (chatbox Gemini, key lấy từ GEMINI_API_KEY)
Start-Process -FilePath $python -ArgumentList "`"$root\tools\dev_server.py`"", "$port" `
  -WorkingDirectory $root -WindowStyle Hidden | Out-Null

# Chờ tối đa ~5 giây cho server lắng nghe
for ($i = 0; $i -lt 25; $i++) {
  if (Test-Port) { break }
  Start-Sleep -Milliseconds 200
}

if (Test-Port) {
  Out-Json "Đã bật web server: $url"
} else {
  @{ systemMessage = "Đã thử bật server cổng $port nhưng chưa thấy lắng nghe." } | ConvertTo-Json -Compress
}
exit 0
