# demo_webbds

Website rao vặt bất động sản **Tổ Ấm** (mua bán, cho thuê nhà đất, dự án), viết bằng HTML/CSS/JavaScript thuần, không cần cài đặt hay build.

## Cách chạy

Mở `index.html` bằng trình duyệt. Hoặc chạy một web server tĩnh trong thư mục này, ví dụ:

```bash
npx serve .
# hoặc
python -m http.server 8000
```

Chi tiết công nghệ, dịch vụ bên ngoài, giới hạn và hướng nâng cấp: xem [docs/cong-nghe.md](docs/cong-nghe.md).

## Lệnh Claude Code

| Lệnh | Tác dụng |
|---|---|
| `/tao-form <mô tả>` | Tạo form mới đúng quy ước (luôn bắt buộc họ tên, email, SĐT, mô tả). VD: `/tao-form form ký gửi nhà trên trang ky-gui` |
| `/them-trang <mô tả>` | Thêm trang mới (header/footer chung, menu, logic trong `app.js`) |
| `/kiem-tra` | Kiểm tra các trang bằng Edge headless: lỗi JS, chụp màn hình, thử thao tác |

## Cấu trúc

```
├── CLAUDE.md       Hướng dẫn cho Claude Code (quy ước, cách chạy, cách kiểm tra)
├── .claude/
│   ├── settings.json            Quyền dùng chung + hook tự bật server cổng 8000
│   ├── hooks/start-server.ps1   Script bật python -m http.server 8000
│   ├── skills/kiem-tra/         /kiem-tra — kiểm tra trang bằng Edge headless
│   ├── skills/them-trang/       /them-trang — thêm trang mới đúng quy ước
│   ├── skills/tao-form/         /tao-form — tạo form (luôn bắt buộc họ tên, email, SĐT, mô tả)
│   └── agents/ui-reviewer.md    Agent rà soát giao diện
├── index.html      Trang chủ: ô tìm kiếm, tin bán nổi bật, tin cho thuê, khu vực, dự án, cẩm nang
├── tim-kiem.html   Kết quả tìm kiếm + bộ lọc nhanh bên phải, sắp xếp, phân trang
├── chi-tiet.html   Chi tiết tin: ảnh, đặc điểm, bản đồ, tính lãi vay, liên hệ, tin tương tự
├── dang-tin.html   Form đăng tin, xem trước thẻ tin khi đang nhập
├── du-an.html      Danh sách dự án, lọc theo khu vực / trạng thái
├── da-luu.html     Tin đã lưu (bấm ♥)
├── lien-he.html    Form liên hệ, thông tin văn phòng, câu hỏi thường gặp
├── docs/
│   └── cong-nghe.md   Công nghệ sử dụng, giới hạn, hướng nâng cấp
├── css/style.css   Toàn bộ giao diện
└── js/
    ├── data.js     Dữ liệu mẫu (tin đăng, dự án, tỉnh thành, bài viết)
    └── app.js      Header/footer dùng chung + logic từng trang
```

Mỗi trang có `<body data-page="...">`; `app.js` dựa vào đó để chạy đúng phần logic. Header và footer được chèn tự động vào `<div id="header">` / `<div id="footer">`.

Các trang truyền dữ liệu qua URL:

| Trang | Tham số |
|---|---|
| `tim-kiem.html` | `mode` (ban/thue), `city`, `type`, `price`, `area`, `beds`, `q`, `sort`, `page` |
| `chi-tiet.html` | `id` (mã tin, ví dụ `L1005`) |
| `du-an.html` | `city`, `status`, `q` |

## Dữ liệu

- Tin mẫu được sinh trong `js/data.js` với seed cố định nên lần nào tải cũng giống nhau. Muốn thêm tỉnh thành, loại nhà đất hay dự án thì sửa các mảng `CITIES`, `TYPES`, `PROJECT_NAMES` trong file đó.
- Tin bạn đăng, tin đã lưu và trạng thái đăng nhập lưu trong `localStorage` của trình duyệt (chưa có backend).
- Ảnh lấy từ Unsplash, cần kết nối mạng.
