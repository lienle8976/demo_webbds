---
name: kiem-tra
description: Kiểm tra website My Home bằng Edge headless — tải cả 6 trang, bắt lỗi JavaScript, đếm phần tử render và chụp màn hình desktop/mobile. Dùng sau mỗi lần sửa HTML/CSS/JS hoặc khi người dùng yêu cầu kiểm tra, chạy thử, chụp màn hình.
---

# Kiểm tra website bằng Edge headless

Máy không có Node nên dùng Microsoft Edge ở chế độ headless (PowerShell).

## Chuẩn bị

- Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- Luôn dùng `--user-data-dir` trỏ vào thư mục tạm (scratchpad) để không đụng hồ sơ Edge thật của người dùng và để tin thử không lẫn vào trình duyệt của họ.
- Chạy bằng `Start-Process ... -Wait -WindowStyle Hidden` để chờ Edge xong.
- Web server Python cổng 8000 được hook `SessionStart` bật sẵn → ưu tiên `$root = "http://localhost:8000"`. Chỉ dùng `file:///` khi server không chạy (kiểm tra: `Invoke-WebRequest -UseBasicParsing http://localhost:8000/`).

## 1. Bắt lỗi JS và kiểm tra nội dung

Với mỗi URL, chạy `--dump-dom` kèm log console:

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$root = "file:///" + ((Get-Location).Path -replace '\\','/')
Start-Process -FilePath $edge -ArgumentList "--headless=new","--disable-gpu","--user-data-dir=$tmp\edge-profile","--enable-logging=stderr","--v=0","--virtual-time-budget=6000","--dump-dom","`"$root/tim-kiem.html?mode=ban&city=hn`"" -RedirectStandardOutput "$tmp\out.html" -RedirectStandardError "$tmp\out.log" -Wait -WindowStyle Hidden
```

- Lỗi JS: tìm `Uncaught` trong file log. Bỏ qua dòng `CONSOLE` đến từ `chrome-extension://` và từ Google Maps ("Tracking Prevention").
- Nội dung: đếm `<article class="card"` (thẻ tin), `class="project"` (dự án), đọc `id="resultMeta"`, `<title>`.

URL nên kiểm tra:
- `index.html` — 16 thẻ tin, 4 dự án
- `tim-kiem.html?mode=ban&city=hn&price=2` và `tim-kiem.html?mode=thue&type=phongtro`
- `chi-tiet.html?id=L1005` và `chi-tiet.html?id=XXX` (phải hiện "Tin đăng không tồn tại")
- `dang-tin.html` — 1 thẻ xem trước
- `du-an.html`, `da-luu.html`

## 2. Chụp màn hình

```powershell
Start-Process -FilePath $edge -ArgumentList "--headless=new","--disable-gpu","--hide-scrollbars","--user-data-dir=$tmp\edge-profile","--virtual-time-budget=8000","--window-size=1366,1500","--screenshot=$tmp\home.png","`"$root/index.html`"" -Wait -WindowStyle Hidden
```

Rồi dùng Read để xem ảnh.

**Mobile:** Edge headless không thu cửa sổ nhỏ hơn ~500px, nên `--window-size=390,...` cho kết quả sai (trông như bị tràn ngang). Thay vào đó tạo file HTML tạm chứa `<iframe src="file:///.../index.html" style="width:390px;height:1500px">` rồi chụp file đó.

## 3. Kiểm tra thao tác (đăng tin, lọc, lưu tin)

Tạo bản sao trang trong thư mục tạm, chèn `<base href="file:///<thư mục dự án>/">` sau `<head>` và một `<script>` trước `</body>` để tự điền form / bấm nút, rồi `--dump-dom`. Lưu ý: trong bản sao, `history.replaceState` sang URL dự án sẽ không đổi được `location.search` — đó là giới hạn của cách thử, không phải lỗi.

## Báo cáo

Nói rõ đã kiểm tra những trang/thao tác nào, kết quả, và phần nào chưa kiểm tra được.
