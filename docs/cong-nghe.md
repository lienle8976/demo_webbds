# Công nghệ sử dụng trong dự án Tổ Ấm

Tài liệu mô tả các công nghệ, thư viện, dịch vụ bên ngoài và công cụ phát triển mà website **Tổ Ấm** (rao vặt bất động sản) đang dùng, kèm lý do chọn và giới hạn hiện tại.

## Tóm tắt

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Giao diện | HTML5, CSS3 | Không dùng framework CSS, không preprocessor |
| Logic | JavaScript thuần (ES2021) | Không framework, không bundler, không npm |
| Dữ liệu | Dữ liệu mẫu trong `js/data.js` + `localStorage` | Chưa có backend, chưa có cơ sở dữ liệu |
| Font | Google Fonts — Be Vietnam Pro | Hỗ trợ tiếng Việt đầy đủ |
| Ảnh | Unsplash (CDN) | Cần kết nối mạng |
| Bản đồ | Google Maps nhúng (iframe) | Không cần API key |
| Chạy local | Python `http.server` cổng 8000 | Tự bật qua hook của Claude Code |
| Kiểm thử | Microsoft Edge headless | Chụp màn hình, bắt lỗi JS |
| Triển khai | Vercel (site tĩnh) | Tự deploy khi push lên `main` |
| Phát triển | Git, Claude Code, PowerShell / Git Bash | |

Quy mô hiện tại: 7 trang HTML, ~600 dòng CSS, ~1.100 dòng JavaScript.

**Không cần cài đặt gì để chạy website** — chỉ cần một trình duyệt hiện đại.

---

## 1. HTML5

Mỗi trang là một file HTML độc lập ở thư mục gốc:

| File | `data-page` | Vai trò |
|---|---|---|
| `index.html` | `home` | Trang chủ |
| `tim-kiem.html` | `search` | Tìm kiếm + bộ lọc |
| `chi-tiet.html` | `detail` | Chi tiết tin |
| `dang-tin.html` | `post` | Đăng tin |
| `du-an.html` | `projects` | Dự án |
| `da-luu.html` | `saved` | Tin đã lưu |
| `lien-he.html` | `contact` | Form liên hệ, thông tin, FAQ (`<details>`) |

Kỹ thuật dùng:
- **Thuộc tính `data-*`** để JavaScript nhận biết trang (`<body data-page="...">`) và gắn dữ liệu vào phần tử (`data-fav`, `data-project`, `data-k`/`data-v` ở bộ lọc).
- **Kiểm tra form gốc của trình duyệt** (Constraint Validation): `required`, `minlength`, `pattern`, `type="number"`, `type="url"` — JavaScript chỉ đọc kết quả qua `checkValidity()` để hiện thông báo tiếng Việt.
- **`loading="lazy"`** cho ảnh để trang tải nhanh hơn.
- Header và footer **không viết trong HTML** mà được JavaScript chèn vào `<div id="header">` / `<div id="footer">`, nên chỉ cần sửa ở một chỗ.

## 2. CSS3

Toàn bộ giao diện nằm trong một file `css/style.css`, viết tay, không dùng Bootstrap/Tailwind hay Sass.

| Tính năng | Dùng để |
|---|---|
| **Biến CSS** (`--primary`, `--primary-ink`, `--on-primary`, `--accent`, `--dark`...) | Quản lý màu chủ đạo vàng ở một chỗ duy nhất (`:root`) |
| **Grid** | Lưới thẻ tin (`auto-fill, minmax()`), lưới khu vực, bố cục trang có sidebar |
| **Flexbox** | Header, thanh tìm kiếm, thẻ tin dạng danh sách |
| **Media queries** | 4 mốc responsive: `1200px` (menu ☰), `1024px`, `720px`, `480px` |
| `clamp()` | Cỡ chữ tiêu đề hero co giãn theo màn hình |
| `aspect-ratio` | Giữ tỉ lệ ảnh thẻ tin, dự án, bài viết |
| `position: sticky` | Header, sidebar bộ lọc, khung liên hệ, khung xem trước tin |
| `backdrop-filter` | Hiệu ứng mờ nền header |
| `-webkit-line-clamp` | Cắt tiêu đề/mô tả dài thành 2 dòng |
| `::after` phủ toàn thẻ | Bấm vào bất kỳ đâu trên thẻ tin đều mở chi tiết |
| `@keyframes`, `transition` | Hiệu ứng mở modal, hover thẻ, toast |
| `accent-color` | Tô màu thanh trượt trong công cụ tính lãi vay |

**Quy tắc màu:** chữ trên nền vàng phải dùng `--on-primary` (tối), chữ màu vàng trên nền trắng phải dùng `--primary-ink` (vàng đậm) để đủ độ tương phản.

## 3. JavaScript (thuần, ES2021)

Gồm 2 file, nạp theo thứ tự `data.js` rồi `app.js`, không dùng module hay bundler — mỗi file bọc trong một IIFE để không làm bẩn biến toàn cục (chỉ xuất `window.APP_DATA`).

### `js/data.js` — dữ liệu mẫu
- **Bộ sinh số ngẫu nhiên có seed** (thuật toán `mulberry32`) để 72 tin mẫu, 8 dự án lần nào tải trang cũng giống nhau.
- Danh mục: 6 tỉnh thành, loại nhà đất cho bán/thuê, khoảng giá, khoảng diện tích, bài cẩm nang.

### `js/app.js` — logic
- **Phần dùng chung:** chèn header/footer/modal/toast, thẻ tin `cardHtml()`, lưu tin, tính lãi vay, đăng nhập giả lập.
- **Mỗi trang một hàm** `pageHome`, `pageSearch`, `pageDetail`, `pagePost`, `pageProjects`, `pageSaved`, chọn chạy theo `data-page`.

API trình duyệt và cú pháp đáng chú ý:

| API / cú pháp | Dùng để |
|---|---|
| `URLSearchParams` | Đọc/tạo tham số URL: `tim-kiem.html?mode=ban&city=hn`, `chi-tiet.html?id=L1005` |
| `history.replaceState` | Cập nhật URL khi đổi bộ lọc mà không tải lại trang (chia sẻ được link kết quả) |
| `localStorage` | Lưu tin đã lưu, tin tự đăng, trạng thái đăng nhập, kiểu hiển thị |
| `FormData` | Đọc dữ liệu form đăng tin |
| `navigator.clipboard` | Nút sao chép liên kết tin |
| `String.prototype.normalize('NFD')` | Tìm kiếm không dấu ("cau giay" khớp "Cầu Giấy") |
| `toLocaleString('vi-VN')` | Định dạng số, ngày kiểu Việt Nam (`3,62 tỷ`, `08/11/2026`) |
| Event delegation | Một listener cho cả danh sách (lưu tin, bộ lọc, phân trang) |
| Template literals | Dựng HTML; mọi dữ liệu chèn vào đều qua hàm `esc()` để chống XSS |
| `?.`, `??`, `||=` | Cú pháp ES2020–ES2021 cho code gọn |

Khóa `localStorage` đang dùng: `toam_favs`, `toam_my_listings`, `toam_user`, `toam_view`, `toam_contacts` (yêu cầu liên hệ).

## 4. Dịch vụ bên ngoài

| Dịch vụ | Dùng ở đâu | Phụ thuộc |
|---|---|---|
| **Google Fonts** — Be Vietnam Pro (400–800) | Toàn bộ chữ | Mất mạng → rơi về font hệ thống |
| **Unsplash** (`images.unsplash.com`) | Ảnh tin, dự án, khu vực, bài viết | Mất mạng → hiện nền gradient thay thế |
| **Google Maps embed** (`maps.google.com/maps?...&output=embed`) | Bản đồ ở trang chi tiết | Không cần API key; mất mạng → khung trống |

Website không gọi dịch vụ nào cần tài khoản hay khóa bí mật.

### Triển khai: Vercel
- Project Vercel liên kết với repo GitHub `lienle8976/demo_webbds`. Mỗi lần push lên nhánh `main`, Vercel tự deploy lại.
- Cấu hình: Framework Preset **Other**, không có lệnh build, thư mục gốc là thư mục dự án.
- Tên miền: `webbdsnew.vercel.app` (và tên mặc định `demowebbds-seven.vercel.app`).
- File `.vercelignore` chỉ cho đưa lên các trang `*.html`, `css/`, `js/`. Nhờ vậy `CLAUDE.md`, `.claude/`, `docs/`, `README.md` không bị lộ công khai. **Thêm thư mục mới mà website cần (ví dụ `img/`) thì phải thêm dòng `!img` vào `.vercelignore`.**

## 5. Công cụ phát triển

### Python `http.server`
- Phục vụ website tại **http://localhost:8000/**.
- Tự bật mỗi khi mở phiên Claude Code nhờ hook `SessionStart` (`.claude/settings.json` → `.claude/hooks/start-server.ps1`). Nếu cổng đã bận thì không bật thêm.
- Bật tay: `python -m http.server 8000`.

### Microsoft Edge headless
Dùng để kiểm thử tự động vì máy không có Node.js:
- `--dump-dom`: lấy HTML sau khi JavaScript chạy → đếm thẻ tin, kiểm tra nội dung.
- `--enable-logging`: bắt lỗi JavaScript (`Uncaught`).
- `--screenshot`: chụp màn hình desktop; mobile chụp qua iframe rộng 390px.

Quy trình chi tiết trong skill `/kiem-tra` (`.claude/skills/kiem-tra/SKILL.md`).

### Claude Code
| Thành phần | Vai trò |
|---|---|
| `CLAUDE.md` | Quy ước dự án Claude đọc mỗi phiên |
| `.claude/settings.json` | Quyền dùng chung + hook bật server |
| `.claude/skills/kiem-tra` | Lệnh `/kiem-tra` |
| `.claude/skills/them-trang` | Lệnh `/them-trang` |
| `.claude/skills/tao-form` | Lệnh `/tao-form` — tạo form, luôn bắt buộc họ tên, email, SĐT, mô tả |
| `.claude/agents/ui-reviewer.md` | Agent rà soát giao diện (chỉ đọc) |

### Khác
- **Git** — quản lý mã nguồn.
- **PowerShell 5.1 / Git Bash** — chạy script, hook trên Windows.

## 6. Trình duyệt hỗ trợ

Các trình duyệt hiện đại: Chrome/Edge 85+, Firefox 79+, Safari 14+ (do dùng `??`, `||=`, `aspect-ratio`, `gap` trong Flexbox). Không hỗ trợ Internet Explorer.

## 7. Giới hạn hiện tại

- **Không có backend:** tin đăng, tin đã lưu, đăng nhập chỉ nằm trong trình duyệt của từng người; xóa dữ liệu trình duyệt là mất.
- **`localStorage` tách theo địa chỉ:** dữ liệu khi mở bằng `file:///` khác với khi mở bằng `http://localhost:8000`.
- **Đăng nhập là giả lập**, không có mật khẩu thật hay phân quyền.
- **Dữ liệu là dữ liệu mẫu** sinh ngẫu nhiên; ảnh không khớp chính xác với nội dung tin.
- **Không tối ưu SEO:** nội dung được dựng bằng JavaScript nên công cụ tìm kiếm khó đọc.

## 8. Hướng nâng cấp

| Nhu cầu | Gợi ý công nghệ |
|---|---|
| Lưu dữ liệu thật, nhiều người dùng | Backend Node.js (Express) hoặc Python (FastAPI) + PostgreSQL; hoặc Firebase/Supabase nếu muốn nhanh |
| Đăng nhập thật | Firebase Auth / Supabase Auth, hoặc JWT tự làm |
| Tải ảnh lên | Cloudinary, Firebase Storage, S3 |
| SEO, đường dẫn đẹp (`/ban-can-ho/ha-noi`) | Render phía server: Next.js, Nuxt, Astro |
| Kiểm thử tự động bài bản | Cài Node.js + Playwright |
| Bản đồ có ghim nhiều tin | Leaflet + OpenStreetMap |
