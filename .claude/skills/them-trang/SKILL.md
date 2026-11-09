---
name: them-trang
description: Thêm một trang HTML mới vào website My Home theo đúng quy ước của dự án (header/footer dùng chung, data-page, hàm pageXxx trong app.js, tham số URL). Dùng khi người dùng muốn tạo trang mới như trang tin tức, liên hệ, môi giới, quản lý tin đăng...
---

# Thêm trang mới

Ví dụ thêm trang `moi-gioi.html` (danh sách môi giới).

## 1. Tạo file HTML ở thư mục gốc

Tên file viết thường, không dấu, nối bằng gạch ngang. Sao chép phần `<head>` của một trang có sẵn (ví dụ `da-luu.html`) để giữ font và CSS, rồi:

```html
<body data-page="agents">
  <div id="header"></div>

  <main class="container page">
    <nav class="crumbs"><a href="index.html">Trang chủ</a> / Môi giới</nav>
    <h1 class="page-title">Môi giới</h1>
    <div id="agentList"></div>
  </main>

  <div id="footer"></div>
  <script src="js/data.js"></script>
  <script src="js/app.js"></script>
</body>
```

## 2. Viết logic trong `js/app.js`

- Thêm hàm `function pageAgents() { ... }` cạnh các hàm `pageXxx` khác, có khối comment tiêu đề giống các trang khác.
- Đăng ký trong object ở cuối file: `({ home: pageHome, ..., agents: pageAgents })[PAGE]?.();`
- Đọc tham số URL từ `PARAMS`, tạo link bằng `qs({...})`, chèn dữ liệu bằng `esc()`.
- Tái sử dụng: `cardHtml(listing)`, `projectCardHtml(p)`, `emptyHtml(...)`, `openModal(...)`, `toast(...)`, `store.get/set`.

## 3. Dữ liệu (nếu cần)

Thêm vào `js/data.js` và xuất qua `window.APP_DATA`. **Thêm sau** các đoạn đang gọi `rand()` để không làm thay đổi tin mẫu hiện có.

## 4. Điều hướng

- Thêm link vào mảng `nav` hoặc footer trong `renderLayout()` (`app.js`) — không sửa từng file HTML.
- Nếu muốn menu sáng khi đang ở trang mới, dùng key trùng với `data-page`.

## 5. CSS

Thêm vào `css/style.css` trong khối có comment riêng; dùng biến màu (`--primary`, `--primary-ink`, `--on-primary`...), thêm quy tắc responsive vào các media query có sẵn.

## 6. Kiểm tra

Chạy skill `/kiem-tra` cho trang mới (không lỗi JS, desktop + mobile), và cập nhật bảng cấu trúc trong `README.md` và `CLAUDE.md`.
