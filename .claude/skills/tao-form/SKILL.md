---
name: tao-form
description: Tạo form (liên hệ, tư vấn, đăng ký nhận báo giá, ký gửi, báo lỗi...) cho website My Home theo đúng quy ước dự án. Mọi form luôn BẮT BUỘC có 4 trường họ tên, email, số điện thoại, mô tả thông tin; kiểm tra bằng validateForm() với thông báo tiếng Việt, lưu localStorage, hiện trạng thái gửi thành công. Dùng khi người dùng yêu cầu tạo/thêm/sửa một form nhập thông tin.
argument-hint: "[loại form] [ở trang nào] — VD: form ký gửi nhà trên trang ky-gui"
---

# Tạo form trong website My Home

## Yêu cầu lần này

$ARGUMENTS

- Nếu phần trên **trống**: hỏi người dùng 2 điều trước khi làm — form dùng để làm gì, và đặt ở trang nào (trang có sẵn, trang mới, hay popup).
- Nếu đã có mô tả: tự suy ra các trường phụ hợp lý cho loại form đó (ví dụ form ký gửi: nhu cầu bán/cho thuê, loại nhà, khu vực, giá mong muốn), luôn giữ đủ 4 trường bắt buộc bên dưới, rồi làm luôn.
- Báo lại cho người dùng: form nằm ở trang nào, có những trường gì, kết quả kiểm tra (mục 4).

Mẫu chuẩn đang dùng: form liên hệ ở `lien-he.html` + hàm `pageContact()` trong `js/app.js`. Khi tạo form mới, làm theo mẫu đó.

## Quy tắc bắt buộc

**Mọi form gửi yêu cầu liên hệ** (người dùng để lại thông tin để được gọi lại/tư vấn/báo giá/ký gửi/báo lỗi) **luôn phải có đủ 4 trường bắt buộc sau** — không được bỏ, không được để tùy chọn. Không áp dụng cho form đăng nhập, ô đăng ký nhận tin (chỉ email) và form đăng tin.

Các form đang tuân theo quy tắc: form liên hệ (`lien-he.html`), form "Nhận báo giá" trong popup dự án (`openProject`), form "Gửi tin nhắn" ở trang chi tiết tin (`pageDetail`).

| Trường | `name` | Ràng buộc |
|---|---|---|
| Họ và tên | `name` | `required minlength="2" maxlength="60" autocomplete="name"` |
| Email | `email` | `type="email" required pattern="[^@\s]+@[^@\s]+\.[^@\s]+" maxlength="100" autocomplete="email"` |
| Số điện thoại | `phone` | `required pattern="[0-9 +]{9,13}" inputmode="tel" autocomplete="tel"` |
| Mô tả thông tin | `message` | `<textarea>` `required minlength="10" maxlength="1000"` |

- Nhãn có dấu `*`, và đặt dòng *"Các trường có dấu * là bắt buộc."* ở đầu form.
- Có thể thêm trường riêng của từng form (chủ đề, khu vực, thời gian gọi lại, mã tin...) **sau** 4 trường trên, nhưng không thay thế chúng.
- Toàn bộ chữ bằng tiếng Việt có dấu.

## 1. HTML

Đặt form trong `.form-card`, dùng class `.post-form` để có sẵn kiểu nhãn/ô nhập. Bắt buộc có `novalidate` (để JS tự báo lỗi tiếng Việt) và `<p class="form-error"></p>` **bên trong form**, ngay trên nút gửi.

**Form dựng bằng JavaScript** (trong modal, sidebar...): không viết tay 4 trường mà dùng hàm có sẵn `requiredFieldsHtml(noiDungMacDinh, placeholder)` trong `app.js` — hàm trả về 4 trường bắt buộc + `<p class="form-error">`:

```js
openModal(`<form class="post-form" id="xxxForm" novalidate>
  ${requiredFieldsHtml('Tôi muốn ...')}
  <button class="btn btn--primary btn--block">Gửi</button>
</form>`);
```

**Form viết trong file HTML** (như `lien-he.html`): viết tay theo mẫu dưới, giữ đúng `name` và ràng buộc trong bảng trên.

```html
<section class="form-card contact-card">
  <form class="post-form" id="xxxForm" novalidate>
    <h3>Tiêu đề form</h3>
    <p class="muted small">Các trường có dấu * là bắt buộc.</p>

    <label>Họ và tên *<input name="name" required minlength="2" maxlength="60" autocomplete="name" placeholder="Nguyễn Văn A" /></label>
    <div class="grid-2">
      <label>Email *<input name="email" type="email" required pattern="[^@\s]+@[^@\s]+\.[^@\s]+" maxlength="100" autocomplete="email" placeholder="email@vidu.com" /></label>
      <label>Số điện thoại *<input name="phone" required pattern="[0-9 +]{9,13}" inputmode="tel" autocomplete="tel" placeholder="0912 345 678" /></label>
    </div>

    <!-- trường riêng của form (nếu có) -->

    <label>Mô tả thông tin *<textarea name="message" rows="5" required minlength="10" maxlength="1000" placeholder="..."></textarea></label>

    <p class="form-error" id="formError"></p>
    <button class="btn btn--primary btn--lg btn--block">Gửi</button>
  </form>

  <div class="form-success is-hidden" id="xxxSuccess">
    <div class="form-success__icon">✓</div>
    <h3>Đã gửi thành công!</h3>
    <p class="muted" id="xxxSuccessText"></p>
    <button class="btn btn--ghost" id="xxxAgain">Gửi lại</button>
  </div>
</section>
```

Thành phần có sẵn trong `css/style.css`, dùng lại thay vì viết CSS mới:
- Lựa chọn dạng nút: `<fieldset class="seg seg--wrap"><legend>... *</legend><label><input type="radio" ...><span>...</span></label>...</fieldset>`
- Ô đồng ý: `<label class="check"><input type="checkbox" name="agree" required /><span>... *</span></label>`
- Đếm ký tự: `<small class="muted char-count"><span id="charCount">0</span>/1000 ký tự</small>`
- Lưới 2/3 cột: `.grid-2`, `.grid-3` (tự về 1 cột trên mobile)

Nếu form nằm trong modal (ví dụ form trong `openProject()`), vẫn giữ đủ 4 trường bắt buộc.

## 2. JavaScript (`js/app.js`)

- Viết trong hàm `pageXxx()` của trang (hoặc hàm mở modal), **không** viết `<script>` trong HTML.
- Kiểm tra bằng hàm dùng chung `validateForm(form)` — nó tìm trường sai đầu tiên, ghi *"Vui lòng kiểm tra lại: <nhãn>"* vào `.form-error` bên trong form và focus vào trường đó. Nhãn được lấy từ chữ trước dấu `*`, nên nhãn phải viết dạng `Tên trường *<input>`.
- Lưu bằng hàm dùng chung `saveContact(form, extra)`: đọc `FormData`, `trim()` 4 trường bắt buộc, thêm `sentAt`, lưu vào `localStorage` khóa `toam_contacts`, trả về bản ghi. `extra` để ghi nguồn gửi, ví dụ `{ topic: 'Nhận báo giá dự án', project: p.name }`.
- Chèn dữ liệu người dùng vào HTML phải qua `esc()`; nếu chỉ gán `textContent` thì không cần.

```js
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm(form)) return;
  const c = saveContact(form, { topic: 'Chủ đề form' });
  $('#xxxSuccessText').textContent = `Cảm ơn ${c.name}! ...`;
  form.classList.add('is-hidden');
  $('#xxxSuccess').classList.remove('is-hidden');
  toast('Đã gửi thành công');
});
```

## 3. Nếu form nằm trên trang mới

Làm theo skill `/them-trang` (tạo file HTML, `data-page`, đăng ký `pageXxx`, thêm vào menu `nav` trong `renderLayout()` và footer). Menu có 6 mục trở lên thì kiểm tra header ở ~1210px không bị xuống dòng.

## 4. Kiểm tra (bắt buộc trước khi báo xong)

Theo skill `/kiem-tra`, tạo bản sao trang có script tự thao tác rồi `--dump-dom`, xác nhận:

1. Gửi form trống → báo lỗi **Họ và tên**.
2. Có tên, thiếu email → báo lỗi **Email**; email sai dạng (`abc@`, `abc@def`) → báo lỗi **Email**.
3. Số điện thoại sai (`12`) → báo lỗi **Số điện thoại**.
4. Thiếu mô tả hoặc dưới 10 ký tự → báo lỗi **Mô tả thông tin**.
5. Đủ thông tin hợp lệ → form ẩn, khung thành công hiện, `localStorage` có bản ghi mới.
6. Không có lỗi JS; chụp màn hình desktop + mobile (390px qua iframe).

Cập nhật `README.md`, `CLAUDE.md`, `docs/cong-nghe.md` nếu thêm trang hoặc khóa `localStorage` mới.
