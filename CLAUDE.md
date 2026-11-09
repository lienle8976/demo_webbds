# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong dự án này.

## Tổng quan

**My Home** — website rao vặt bất động sản (mua bán, cho thuê, dự án), lấy cảm hứng tính năng từ batdongsan.com nhưng dùng thương hiệu và giao diện riêng. Không sao chép logo, tên, nhận diện của batdongsan.com.

- HTML/CSS/JavaScript thuần, **không framework, không build, không npm**.
- Không có backend: dữ liệu mẫu nằm trong `js/data.js`, dữ liệu người dùng lưu `localStorage`. Ngoại lệ duy nhất: `POST /api/chat` cho chatbox AI (Vercel Function `api/chat.js`, chuyển tiếp tới Google Gemini).
- **API key (Gemini...) không bao giờ đưa vào code phía trình duyệt hay commit lên git.** Key chỉ nằm ở biến môi trường `GEMINI_API_KEY`: trên Vercel (Settings → Environment Variables) và trên máy (biến môi trường tài khoản Windows hoặc `.env.local`).
- Toàn bộ chữ trên giao diện và comment trong code viết **tiếng Việt**.

## Chạy và kiểm tra

- **Web server Python cổng 8000 tự bật mỗi khi mở phiên Claude Code** (hook `SessionStart` trong `.claude/settings.json` → `.claude/hooks/start-server.ps1` → `tools/dev_server.py`). Website ở **http://localhost:8000/** — dùng địa chỉ này khi mở/kiểm tra trang thay cho `file:///`. Nếu cổng 8000 đã bận, hook không bật thêm server.
- `tools/dev_server.py` = `http.server` + `POST /api/chat` (bản sao logic của `api/chat.js` — **sửa một bên thì sửa cả bên kia**). Bật tay: `python tools/dev_server.py 8000`. Tắt server: tìm PID bằng `netstat -ano | findstr :8000` rồi `Stop-Process -Id <PID>`. Trên Windows hai server có thể cùng giữ cổng 8000 — kiểm tra bằng `Get-CimInstance Win32_Process -Filter "Name like 'python%'"` và tắt `http.server` cũ nếu còn.
- Máy phát triển (Windows) **không có Node**. Kiểm tra bằng Edge headless — xem skill `/kiem-tra`.
- **Bản chạy thật trên Vercel:** https://webbdsnew.vercel.app/. Repo `lienle8976/demo_webbds`, Vercel tự deploy khi push lên `main`. `.vercelignore` chỉ đưa lên `*.html`, `css/`, `js/`, `api/`; thêm thư mục tài nguyên mới thì phải mở nó trong `.vercelignore`.
- Sau khi sửa, luôn kiểm tra cả 6 trang không có lỗi JS và chụp màn hình trang bị ảnh hưởng (desktop 1366px + mobile 390px).

## Cấu trúc

```
index.html      Trang chủ (data-page="home")
tim-kiem.html   Tìm kiếm + bộ lọc bên phải (data-page="search")
chi-tiet.html   Chi tiết tin (data-page="detail")
dang-tin.html   Đăng tin + xem trước (data-page="post")
du-an.html      Dự án (data-page="projects")
da-luu.html     Tin đã lưu (data-page="saved")
lien-he.html    Form liên hệ + thông tin + FAQ (data-page="contact")
css/style.css   Toàn bộ giao diện
js/data.js      Dữ liệu mẫu → window.APP_DATA
js/app.js       Layout chung + chatbox + logic từng trang
api/chat.js     Vercel Function: chuyển tiếp chatbox tới Gemini (key ở biến môi trường)
tools/dev_server.py  Server chạy trên máy: file tĩnh + /api/chat
docs/cong-nghe.md  Tài liệu công nghệ sử dụng
```

Khi thêm/bỏ công nghệ, thư viện, dịch vụ bên ngoài hoặc công cụ, cập nhật `docs/cong-nghe.md` cho khớp.

## Quy ước code

### Trang
- Mỗi trang có `<body data-page="...">`, `<div id="header">`, `<div id="footer">`, rồi nạp `js/data.js` **trước** `js/app.js`.
- Header, footer, modal, toast được `renderLayout()` trong `app.js` chèn vào; chatbox góc phải dưới do `renderChatbox()` chèn (ngữ cảnh/quy tắc trả lời của trợ lý ở `chatSystemPrompt()`) — **sửa menu/footer ở `app.js`**, không sửa từng file HTML.
- Logic từng trang là một hàm `pageXxx()` trong `app.js`, đăng ký trong object ở cuối file.

### Dữ liệu và URL
- Các trang truyền trạng thái qua query string: `tim-kiem.html?mode=&city=&type=&price=&area=&beds=&q=&sort=&page=`, `chi-tiet.html?id=`, `du-an.html?city=&status=&q=`. Dùng hàm `qs()` để tạo URL (tự bỏ giá trị rỗng).
- Khóa `localStorage`: `toam_favs`, `toam_my_listings`, `toam_user`, `toam_view`, `toam_contacts`, `toam_chat` (lịch sử chatbox). Đọc/ghi qua `store.get/set`. Tiền tố `toam_` là từ tên cũ "Tổ Ấm" — **giữ nguyên**, đổi sẽ làm mất dữ liệu đã lưu của người dùng.
- Dữ liệu mẫu sinh bằng RNG có seed cố định (`mulberry32`) — đổi seed hoặc thứ tự gọi `rand()` sẽ làm thay đổi toàn bộ tin mẫu.
- Mọi chuỗi do người dùng nhập hoặc từ dữ liệu khi chèn vào HTML phải qua `esc()`.

### Giao diện
- Màu chủ đạo **vàng**, khai báo bằng biến trong `:root` của `css/style.css`. Không viết cứng mã màu trong HTML/JS.
  - `--primary`: nền nút, logo, trạng thái chọn → chữ trên nền này dùng `--on-primary` (tối). **Không dùng chữ trắng trên nền vàng.**
  - `--primary-ink`: chữ/link màu vàng trên nền trắng.
  - `--primary-soft`: nền nhạt cho chip, tag, avatar.
  - `--accent`: giá tiền, tim đã lưu.
  - `--dark`: hero overlay, footer, toast.
- Font: Be Vietnam Pro (Google Fonts).
- Breakpoint: `1200px` (menu thu vào nút ☰), `1024px` (bố cục 1 cột), `720px` (mobile), `480px` (header thu nhỏ). Thêm mục menu mới thì kiểm tra lại header ở ~1210px.
- Form: dùng thuộc tính HTML (`required`, `pattern`...) + `novalidate`, rồi gọi `validateForm(form)` trong `app.js` để báo lỗi tiếng Việt vào `<p class="form-error" id="formError">`.
- **Mọi form gửi yêu cầu liên hệ luôn bắt buộc có 4 trường: họ tên (`name`), email (`email`), số điện thoại (`phone`), mô tả thông tin (`message`).** Form dựng bằng JS dùng `requiredFieldsHtml()`, lưu bằng `saveContact()`. Tạo/sửa form → dùng skill `/tao-form`. (Không áp dụng cho đăng nhập, đăng ký nhận tin, đăng tin.)
- Thẻ tin (`cardHtml`) dùng link tiêu đề phủ cả thẻ (`.card__link::after`); nút bên trong thẻ cần `position: relative; z-index: 2`.

## Cách làm việc

- Khi người dùng yêu cầu thay đổi giao diện (màu, font, bố cục...), **áp dụng triệt để cho toàn bộ trang** rồi kiểm tra bằng ảnh chụp — không để sót phần rồi hướng dẫn người dùng tự sửa.
- Trả lời người dùng bằng tiếng Việt.
- Không tự commit; chỉ commit khi được yêu cầu.
