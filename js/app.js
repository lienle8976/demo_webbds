/* =========================================================
   Tổ Ấm — logic dùng chung + từng trang
   Mỗi trang khai báo <body data-page="..."> để chạy đúng phần logic.
   ========================================================= */
(function () {
  const { CITIES, TYPES, listings: SEED, projects, PRICE_RANGES, AREA_RANGES, articles } = window.APP_DATA;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const PAGE = document.body.dataset.page;
  const PARAMS = new URLSearchParams(location.search);

  /* ================= Tiện ích ================= */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n, d = 1) => Number(n.toFixed(d)).toLocaleString('vi-VN');

  function formatPrice(l) {
    if (!l.price) return 'Thỏa thuận';
    if (l.mode === 'thue') return `${num(l.price / 1e6)} triệu/tháng`;
    return l.price >= 1e9 ? `${num(l.price / 1e9, 2)} tỷ` : `${num(l.price / 1e6, 0)} triệu`;
  }
  function formatMoney(v) {
    if (v >= 1e9) return `${num(v / 1e9, 2)} tỷ`;
    if (v >= 1e6) return `${num(v / 1e6, 1)} triệu`;
    return `${Math.round(v).toLocaleString('vi-VN')} đ`;
  }
  const ppm = (l) => (l.area ? l.price / l.area : 0);
  function formatPpm(l) {
    const v = ppm(l);
    if (!v) return '— /m²';
    return l.mode === 'thue' ? `${num(v / 1e3, 0)} nghìn/m²` : `${num(v / 1e6)} tr/m²`;
  }
  function timeAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 60) return `${Math.max(1, m)} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Hôm qua';
    if (d < 30) return `${d} ngày trước`;
    return new Date(ts).toLocaleDateString('vi-VN');
  }
  const normalize = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const initials = (name) => String(name).trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  const cityName = (id) => CITIES.find((c) => c.id === id)?.name || '';
  const vipRank = (l) => (l.vip === 'Kim cương' ? 2 : l.vip ? 1 : 0);
  const byNewest = (a, b) => vipRank(b) - vipRank(a) || b.postedAt - a.postedAt;

  // Loại nhà đất theo nhu cầu; '' = gộp cả bán và thuê (bỏ trùng)
  function typesFor(mode) {
    if (mode) return TYPES[mode];
    const seen = new Set();
    return [...TYPES.ban, ...TYPES.thue].filter((t) => !seen.has(t.id) && seen.add(t.id));
  }
  // Tạo query string, bỏ các giá trị rỗng
  function qs(obj) {
    const p = new URLSearchParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2600);
  }

  // Ảnh lỗi → nền gradient thay thế
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName === 'IMG' && !img.dataset.failed) {
      img.dataset.failed = '1';
      img.removeAttribute('src');
      img.classList.add('img-fallback');
    }
  }, true);

  /* ================= Lưu trữ cục bộ ================= */
  const store = {
    get(key, def) { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  };
  const favs = new Set(store.get('toam_favs', []));
  const myListings = store.get('toam_my_listings', []);
  const all = [...myListings, ...SEED];
  let onFavChange = () => {};

  function toggleFav(id) {
    if (favs.has(id)) { favs.delete(id); toast('Đã bỏ lưu tin'); }
    else { favs.add(id); toast('Đã lưu tin vào danh sách yêu thích'); }
    store.set('toam_favs', [...favs]);
    updateFavCount();
    $$(`[data-fav="${id}"]`).forEach((b) => b.classList.toggle('is-active', favs.has(id)));
    onFavChange();
  }
  function updateFavCount() {
    const el = $('#favCount');
    if (!el) return;
    el.textContent = favs.size;
    el.hidden = favs.size === 0;
  }
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (!fav) return;
    e.preventDefault();
    e.stopPropagation();
    toggleFav(fav.dataset.fav);
  });

  /* ================= Bố cục chung: header, footer, modal ================= */
  const LOGO = `
    <span class="logo__mark">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/></svg>
    </span>
    <span class="logo__text">Tổ Ấm<small>Nhà đất toàn quốc</small></span>`;

  function renderLayout() {
    const activeNav = PAGE === 'search' ? (PARAMS.get('mode') || 'ban') : PAGE;
    const nav = [
      ['tim-kiem.html?mode=ban', 'Nhà đất bán', 'ban'],
      ['tim-kiem.html?mode=thue', 'Nhà đất cho thuê', 'thue'],
      ['du-an.html', 'Dự án', 'projects'],
      ['index.html#locations', 'Khu vực', ''],
      ['index.html#news', 'Cẩm nang', ''],
      ['lien-he.html', 'Liên hệ', 'contact'],
    ];
    $('#header').outerHTML = `
      <header class="header">
        <div class="container header__inner">
          <a href="index.html" class="logo">${LOGO}</a>
          <nav class="nav" id="nav">
            ${nav.map(([href, label, key]) => `<a href="${href}" class="${key && key === activeNav ? 'is-active' : ''}">${label}</a>`).join('')}
          </nav>
          <div class="header__actions">
            <a class="icon-btn ${PAGE === 'saved' ? 'is-active' : ''}" href="da-luu.html" title="Tin đã lưu">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>
              <span class="badge" id="favCount">0</span>
            </a>
            <button class="btn btn--ghost hide-sm" id="loginBtn">${store.get('toam_user', null) ? 'Tài khoản' : 'Đăng nhập'}</button>
            <a class="btn btn--primary" href="dang-tin.html">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span class="hide-xs">Đăng tin</span>
            </a>
            <button class="icon-btn burger" id="burger" aria-label="Menu">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
          </div>
        </div>
      </header>`;

    $('#footer').outerHTML = `
      <footer class="footer">
        <div class="container footer__grid">
          <div>
            <a href="index.html" class="logo logo--light">${LOGO}</a>
            <p class="footer__desc">Nền tảng kết nối người mua, người bán, người thuê và môi giới bất động sản. Dự án demo phục vụ mục đích học tập.</p>
          </div>
          <div>
            <h4>Khám phá</h4>
            <a href="tim-kiem.html?mode=ban">Nhà đất bán</a>
            <a href="tim-kiem.html?mode=thue">Nhà đất cho thuê</a>
            <a href="du-an.html">Dự án</a>
            <a href="da-luu.html">Tin đã lưu</a>
            <a href="lien-he.html">Liên hệ</a>
          </div>
          <div>
            <h4>Quy định</h4>
            <a href="#">Quy định đăng tin</a>
            <a href="#">Quy chế hoạt động</a>
            <a href="#">Điều khoản thỏa thuận</a>
            <a href="#">Chính sách bảo mật</a>
          </div>
          <div>
            <h4>Đăng ký nhận tin</h4>
            <form class="subscribe" id="subscribeForm">
              <input type="email" placeholder="Email của bạn" required />
              <button class="btn btn--primary" type="submit">Gửi</button>
            </form>
            <p class="footer__desc">Hotline: 1900 0000 · Email: hotro@toam.example</p>
          </div>
        </div>
        <div class="footer__bottom container">© ${new Date().getFullYear()} Tổ Ấm. Dữ liệu trong trang là dữ liệu mẫu.</div>
      </footer>`;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal" id="modal" aria-hidden="true">
        <div class="modal__backdrop" data-close></div>
        <div class="modal__dialog" role="dialog" aria-modal="true">
          <button class="modal__close" data-close aria-label="Đóng">×</button>
          <div class="modal__body" id="modalBody"></div>
        </div>
      </div>
      <div class="toast" id="toast"></div>`);

    $('#burger').addEventListener('click', () => $('#nav').classList.toggle('is-open'));
    $('#loginBtn').addEventListener('click', openLogin);
    $('#subscribeForm').addEventListener('submit', (e) => { e.preventDefault(); e.target.reset(); toast('Đăng ký nhận tin thành công!'); });
    $('#modal').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    window.addEventListener('scroll', () => $('.header').classList.toggle('is-scrolled', window.scrollY > 10), { passive: true });
    updateFavCount();
  }

  function openModal(html, size = '') {
    const modal = $('#modal');
    $('#modalBody').innerHTML = html;
    modal.querySelector('.modal__dialog').className = `modal__dialog ${size}`;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    const modal = $('#modal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ================= Thành phần dùng chung ================= */
  const heartSvg = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
  const pinSvg = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';

  // preview = true: thẻ xem trước ở trang đăng tin (không có link, không nút lưu)
  function cardHtml(l, preview = false) {
    const specs = [
      `<span>${l.area || '—'} m²</span>`,
      l.beds ? `<span>${l.beds} PN</span>` : '',
      `<span>${formatPpm(l)}</span>`,
    ].join('');
    const title = esc(l.title) || '<span class="muted">Tiêu đề tin đăng</span>';
    return `
      <article class="card">
        <div class="card__media">
          ${l.images[0] ? `<img src="${esc(l.images[0])}" alt="" loading="lazy" />` : '<div class="img-fallback"></div>'}
          ${l.vip ? `<span class="tag tag--${l.vip === 'VIP' ? 'vip' : 'diamond'}">${l.vip}</span>` : ''}
          ${l.mine ? '<span class="tag tag--mine">Tin của bạn</span>' : ''}
          <span class="card__count">${l.images.length} ảnh</span>
        </div>
        <div class="card__body">
          <h3 class="card__title">${preview ? title : `<a class="card__link" href="chi-tiet.html?id=${l.id}">${title}</a>`}</h3>
          <div class="card__price"><strong>${formatPrice(l)}</strong>${specs}</div>
          <p class="card__addr">${pinSvg} ${esc(l.district)}${l.city ? ', ' + esc(l.city) : ''}</p>
          <p class="card__desc">${esc(String(l.description || '').split('\n')[0])}</p>
          <div class="card__foot">
            <div class="agent-mini"><span class="avatar">${initials(l.agent.name || '?')}</span><div><b>${esc(l.agent.name) || 'Tên liên hệ'}</b><small>${timeAgo(l.postedAt)}</small></div></div>
            ${preview ? '' : `<button class="fav ${favs.has(l.id) ? 'is-active' : ''}" data-fav="${l.id}" title="Lưu tin">${heartSvg}</button>`}
          </div>
        </div>
      </article>`;
  }

  const emptyHtml = (title, text, action = '') =>
    `<div class="empty"><div class="empty__icon">🏠</div><h3>${title}</h3><p class="muted">${text}</p>${action}</div>`;

  function projectCardHtml(p) {
    const cls = p.status === 'Đang mở bán' ? 'open' : p.status === 'Sắp mở bán' ? 'soon' : 'done';
    return `
      <article class="project" data-project="${p.id}" tabindex="0">
        <div class="project__media">
          <img src="${esc(p.image)}" alt="" loading="lazy" />
          <span class="status status--${cls}">${p.status}</span>
        </div>
        <div class="project__body">
          <small class="muted">${esc(p.kind)}</small>
          <h3>${esc(p.name)}</h3>
          <p class="card__addr">${pinSvg} ${esc(p.district)}, ${esc(p.city)}</p>
          <p class="muted">${esc(p.scale)}</p>
          <div class="project__price">Từ <strong>${p.priceFrom} triệu/m²</strong></div>
        </div>
      </article>`;
  }
  function bindProjectCards(root) {
    const open = (el) => el && openProject(projects.find((x) => x.id === el.dataset.project));
    root.addEventListener('click', (e) => open(e.target.closest('[data-project]')));
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(e.target.closest('[data-project]')); });
  }
  function openProject(p) {
    const count = all.filter((l) => l.cityId === p.cityId && l.mode === 'ban').length;
    openModal(`
      <div class="gallery"><img class="gallery__main" src="${esc(p.image)}" alt="" /></div>
      <div class="detail__pad">
        <span class="status status--inline">${p.status}</span>
        <h2>${esc(p.name)}</h2>
        <p class="muted">${esc(p.district)}, ${esc(p.city)}</p>
        <div class="keyfacts">
          <div><span>Giá từ</span><strong>${p.priceFrom} tr/m²</strong></div>
          <div><span>Loại hình</span><strong>${esc(p.kind)}</strong></div>
          <div><span>Quy mô</span><strong>${esc(p.scale)}</strong></div>
        </div>
        <p>Chủ đầu tư: <b>${esc(p.developer)}</b></p>
        <p class="muted">Đây là dự án mẫu. Để nhận bảng giá và chính sách bán hàng, vui lòng để lại thông tin.</p>
        <form class="post-form" id="leadForm" novalidate>
          ${requiredFieldsHtml(`Tôi muốn nhận bảng giá và chính sách bán hàng dự án ${p.name}.`)}
          <button class="btn btn--primary btn--block">Nhận báo giá</button>
        </form>
        <p class="mt"><a href="tim-kiem.html?mode=ban&city=${p.cityId}">Xem ${count} tin bán tại ${esc(p.city)} →</a></p>
      </div>`);
    $('#leadForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!validateForm(ev.target)) return;
      saveContact(ev.target, { topic: 'Nhận báo giá dự án', project: p.name });
      closeModal();
      toast('Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.');
    });
  }

  /* ---------- Tính lãi vay (dư nợ giảm dần) ---------- */
  function loanCalcHtml(price = 3e9) {
    return `
      <div class="loan">
        <div class="loan__inputs">
          <label>Giá trị nhà (triệu)<input type="number" name="price" min="100" step="50" value="${Math.round(price / 1e6)}" /></label>
          <label>Tỷ lệ vay: <b data-out="ratio">70%</b><input type="range" name="ratio" min="10" max="85" step="5" value="70" /></label>
          <label>Thời hạn: <b data-out="years">20 năm</b><input type="range" name="years" min="1" max="35" value="20" /></label>
          <label>Lãi suất (%/năm)<input type="number" name="rate" min="0" max="30" step="0.1" value="8.5" /></label>
        </div>
        <div class="loan__result">
          <div><span>Số tiền vay</span><strong data-out="loan">–</strong></div>
          <div><span>Gốc trả hàng tháng</span><strong data-out="principal">–</strong></div>
          <div><span>Trả tháng đầu (gốc + lãi)</span><strong class="accent" data-out="first">–</strong></div>
          <div><span>Tổng lãi phải trả</span><strong data-out="interest">–</strong></div>
          <small class="muted">Tính theo phương pháp dư nợ giảm dần, chỉ mang tính tham khảo.</small>
        </div>
      </div>`;
  }
  function bindLoanCalc(root) {
    const box = root.querySelector('.loan');
    const out = (k, v) => (box.querySelector(`[data-out="${k}"]`).textContent = v);
    const calc = () => {
      const f = Object.fromEntries([...box.querySelectorAll('input')].map((i) => [i.name, +i.value || 0]));
      const loan = f.price * 1e6 * (f.ratio / 100);
      const n = Math.max(1, f.years * 12);
      const r = f.rate / 100 / 12;
      out('ratio', `${f.ratio}%`);
      out('years', `${f.years} năm`);
      out('loan', formatMoney(loan));
      out('principal', formatMoney(loan / n));
      out('first', formatMoney(loan / n + loan * r));
      out('interest', formatMoney((loan * r * (n + 1)) / 2));
    };
    box.addEventListener('input', calc);
    calc();
  }
  function openLoanTool() {
    openModal(`<div class="detail__pad"><h2>Tính lãi vay mua nhà</h2><p class="muted">Điều chỉnh các thông số để ước tính khoản trả hàng tháng.</p>${loanCalcHtml()}</div>`);
    bindLoanCalc($('#modalBody'));
  }

  /* ---------- Đăng nhập (giả lập) ---------- */
  function openLogin() {
    const user = store.get('toam_user', null);
    if (user) {
      openModal(`
        <div class="detail__pad auth">
          <h2>Xin chào, ${esc(user)}</h2>
          <p class="muted">Bạn có ${myListings.length} tin đã đăng và ${favs.size} tin đã lưu.</p>
          <div class="stack">
            <a class="btn btn--ghost btn--block" href="da-luu.html">Xem tin đã lưu</a>
            <a class="btn btn--ghost btn--block" href="dang-tin.html">Đăng tin mới</a>
            <button class="btn btn--primary btn--block" id="logoutBtn">Đăng xuất</button>
          </div>
        </div>`, 'modal__dialog--narrow');
      $('#logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('toam_user');
        $('#loginBtn').textContent = 'Đăng nhập';
        closeModal();
        toast('Đã đăng xuất');
      });
      return;
    }
    openModal(`
      <div class="detail__pad auth">
        <h2>Xin chào bạn</h2>
        <p class="muted">Đăng nhập để lưu tin và quản lý tin đăng.</p>
        <form id="loginForm" class="post-form">
          <label>Số điện thoại hoặc email<input name="user" required /></label>
          <label>Mật khẩu<input type="password" required minlength="6" /></label>
          <button class="btn btn--primary btn--block btn--lg">Đăng nhập</button>
          <p class="muted center">Bản demo: nhập bất kỳ, mật khẩu từ 6 ký tự.</p>
        </form>
      </div>`, 'modal__dialog--narrow');
    $('#loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      store.set('toam_user', e.target.user.value.trim());
      $('#loginBtn').textContent = 'Tài khoản';
      closeModal();
      toast('Đăng nhập thành công');
    });
  }

  /* ---------- Lọc tin ---------- */
  function filterListings(s) {
    const kw = normalize(s.q || '');
    const sorters = {
      new: byNewest,
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      areaDesc: (a, b) => b.area - a.area,
      ppmAsc: (a, b) => ppm(a) - ppm(b),
    };
    return all.filter((l) => {
      if (s.mode && l.mode !== s.mode) return false;
      if (s.city && l.cityId !== s.city) return false;
      if (s.type && l.type !== s.type) return false;
      if (s.price !== '' && s.mode) {
        const r = PRICE_RANGES[s.mode][s.price];
        if (r && (l.price < r.min || l.price >= r.max)) return false;
      }
      if (s.area !== '') {
        const r = AREA_RANGES[s.area];
        if (r && (l.area < r.min || l.area >= r.max)) return false;
      }
      if (s.beds && l.beds < +s.beds) return false;
      if (kw && !normalize(`${l.title} ${l.address} ${l.typeName}`).includes(kw)) return false;
      return true;
    }).sort(sorters[s.sort] || byNewest);
  }

  // 4 trường bắt buộc của mọi form gửi yêu cầu liên hệ: họ tên, email, SĐT, mô tả (xem skill /tao-form)
  function requiredFieldsHtml(message = '', placeholder = 'Mô tả nhu cầu của bạn...') {
    return `
      <label>Họ và tên *<input name="name" required minlength="2" maxlength="60" autocomplete="name" placeholder="Nguyễn Văn A" /></label>
      <label>Email *<input name="email" type="email" required pattern="[^@\\s]+@[^@\\s]+\\.[^@\\s]+" maxlength="100" autocomplete="email" placeholder="email@vidu.com" /></label>
      <label>Số điện thoại *<input name="phone" required pattern="[0-9 +]{9,13}" inputmode="tel" autocomplete="tel" placeholder="0912 345 678" /></label>
      <label>Mô tả thông tin *<textarea name="message" rows="3" required minlength="10" maxlength="1000" placeholder="${esc(placeholder)}">${esc(message)}</textarea></label>
      <p class="form-error"></p>`;
  }

  // Lưu yêu cầu liên hệ vào localStorage (bản demo chưa có backend); extra: nguồn gửi, mã tin...
  function saveContact(form, extra = {}) {
    const f = Object.fromEntries(new FormData(form));
    const item = { ...f, ...extra, name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), message: f.message.trim(), sentAt: Date.now() };
    const contacts = store.get('toam_contacts', []);
    contacts.unshift(item);
    store.set('toam_contacts', contacts);
    return item;
  }

  // Kiểm tra form theo thuộc tính HTML (required, pattern...), báo lỗi tiếng Việt vào .form-error trong form
  function validateForm(form) {
    // Trình duyệt chỉ kiểm tra minlength khi người dùng tự gõ, và coi chuỗi toàn dấu cách là hợp lệ
    // → tự kiểm tra độ dài sau khi trim
    const tooShort = (el) => el.minLength > 0 && (el.required || el.value) && el.value.trim().length < el.minLength;
    const invalid = [...form.elements].find((el) => el.willValidate && (!el.checkValidity() || tooShort(el)));
    const error = form.querySelector('.form-error');
    if (!invalid) { error.textContent = ''; return true; }
    const label = invalid.closest('label')?.textContent.split('*')[0].trim()
      || invalid.closest('fieldset')?.querySelector('legend')?.textContent.replace('*', '').trim()
      || 'Thông tin';
    error.textContent = `Vui lòng kiểm tra lại: ${label}`;
    invalid.focus();
    return false;
  }

  function fillSelect(sel, placeholder, items) {
    sel.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') + items.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
  }

  /* =========================================================
     TRANG CHỦ — index.html
     ========================================================= */
  function pageHome() {
    let tab = 'ban';
    const setupSelects = () => {
      const city = $('#sCity').value;
      fillSelect($('#sCity'), 'Toàn quốc', CITIES.map((c) => [c.id, c.name]));
      fillSelect($('#sType'), 'Loại nhà đất', TYPES[tab === 'thue' ? 'thue' : 'ban'].map((t) => [t.id, t.name]));
      fillSelect($('#sPrice'), 'Mức giá', PRICE_RANGES[tab === 'thue' ? 'thue' : 'ban'].map((r, i) => [i, r.label]));
      fillSelect($('#sArea'), 'Diện tích', AREA_RANGES.map((r, i) => [i, r.label]));
      $('#sCity').value = city;
    };
    $$('.search__tab').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.mode;
      $$('.search__tab').forEach((x) => x.classList.toggle('is-active', x === b));
      $('.search__row--filters').classList.toggle('is-hidden', tab === 'projects');
      setupSelects();
    }));
    $('#searchForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const city = $('#sCity').value;
      const q = $('#sKeyword').value.trim();
      if (tab === 'projects') { location.href = `du-an.html${qs({ city, q })}`; return; }
      location.href = `tim-kiem.html${qs({
        mode: tab, city, q,
        type: $('#sType').value, price: $('#sPrice').value, area: $('#sArea').value, beds: $('#sBeds').value,
      })}`;
    });
    $('#resetBtn').addEventListener('click', () => { $('#searchForm').reset(); setupSelects(); });
    setupSelects();

    $('#statListings').textContent = all.length.toLocaleString('vi-VN');
    $('#statProjects').textContent = projects.length;

    $('#saleCards').innerHTML = all.filter((l) => l.mode === 'ban').sort(byNewest).slice(0, 8).map((l) => cardHtml(l)).join('');
    $('#rentCards').innerHTML = all.filter((l) => l.mode === 'thue').sort((a, b) => b.postedAt - a.postedAt).slice(0, 8).map((l) => cardHtml(l)).join('');

    $('#locationGrid').innerHTML = CITIES.map((c, i) => `
      <a class="loc ${i < 2 ? 'loc--big' : ''}" href="tim-kiem.html?city=${c.id}">
        <img src="${esc(c.cover)}" alt="" loading="lazy" />
        <div class="loc__info"><h3>${esc(c.name)}</h3><span>${all.filter((l) => l.cityId === c.id).length} tin đăng</span></div>
      </a>`).join('');

    $('#projectGrid').innerHTML = projects.slice(0, 4).map(projectCardHtml).join('');
    bindProjectCards($('#projectGrid'));

    $('#newsGrid').innerHTML = articles.map((a, i) => `
      <article class="article ${i === 0 ? 'article--feature' : ''}">
        <img src="${esc(a.image)}" alt="" loading="lazy" />
        <div class="article__body">
          <span class="tag tag--soft">${esc(a.tag)}</span>
          <h3>${esc(a.title)}</h3>
          <p class="muted">${esc(a.excerpt)}</p>
          <small class="muted">${a.date}</small>
        </div>
      </article>`).join('');

    $('[data-tool="loan"]').addEventListener('click', openLoanTool);
  }

  /* =========================================================
     TÌM KIẾM — tim-kiem.html?mode=&city=&type=&price=&area=&beds=&q=&sort=&page=
     ========================================================= */
  function pageSearch() {
    const PAGE_SIZE = 10;
    const KEYS = ['mode', 'city', 'type', 'price', 'area', 'beds', 'q', 'sort', 'page'];
    const s = Object.fromEntries(KEYS.map((k) => [k, PARAMS.get(k) || '']));
    s.sort ||= 'new';
    s.page = +s.page || 1;
    let view = store.get('toam_view', 'list');

    const pushUrl = () => history.replaceState(null, '', `tim-kiem.html${qs({ ...s, sort: s.sort === 'new' ? '' : s.sort, page: s.page > 1 ? s.page : '' })}`);

    function renderBar() {
      fillSelect($('#bMode'), 'Tất cả nhu cầu', [['ban', 'Nhà đất bán'], ['thue', 'Nhà đất cho thuê']]);
      fillSelect($('#bCity'), 'Toàn quốc', CITIES.map((c) => [c.id, c.name]));
      $('#bMode').value = s.mode;
      $('#bCity').value = s.city;
      $('#bKeyword').value = s.q;
      $('#sortSel').value = s.sort;
    }

    function group(title, key, options) {
      return `<div class="filter-box"><h4>${title}</h4><div class="filter-list">
        ${options.map(([v, label, count]) => `<button data-k="${key}" data-v="${v}" class="${String(s[key]) === String(v) ? 'is-active' : ''}">
          <span>${esc(label)}</span>${count != null ? `<small>${count}</small>` : ''}</button>`).join('')}
      </div></div>`;
    }
    function renderSidebar() {
      const base = (patch) => filterListings({ ...s, ...patch }).length;
      $('#sidebar').innerHTML = [
        group('Nhu cầu', 'mode', [['', 'Tất cả', base({ mode: '', type: '', price: '' })], ['ban', 'Nhà đất bán', base({ mode: 'ban', type: '', price: '' })], ['thue', 'Nhà đất cho thuê', base({ mode: 'thue', type: '', price: '' })]]),
        group('Loại nhà đất', 'type', typesFor(s.mode).map((t) => [t.id, t.name, base({ type: t.id })])),
        s.mode ? group('Lọc theo khoảng giá', 'price', PRICE_RANGES[s.mode].map((r, i) => [i, r.label])) : '',
        group('Lọc theo diện tích', 'area', AREA_RANGES.map((r, i) => [i, r.label])),
        group('Số phòng ngủ', 'beds', [1, 2, 3, 4].map((n) => [n, `${n}+ phòng`])),
        group('Tỉnh thành', 'city', CITIES.map((c) => [c.id, c.name, base({ city: c.id })])),
      ].join('');
    }

    function renderChips() {
      const chips = [];
      if (s.type) chips.push(['type', typesFor(s.mode).find((t) => t.id === s.type)?.name]);
      if (s.price !== '' && s.mode) chips.push(['price', PRICE_RANGES[s.mode][s.price]?.label]);
      if (s.area !== '') chips.push(['area', AREA_RANGES[s.area]?.label]);
      if (s.beds) chips.push(['beds', `${s.beds}+ phòng ngủ`]);
      if (s.city) chips.push(['city', cityName(s.city)]);
      if (s.q) chips.push(['q', `“${s.q}”`]);
      $('#activeChips').innerHTML = chips.filter(([, t]) => t).map(([k, t]) => `<button class="chip" data-chip="${k}">${esc(t)} <span>×</span></button>`).join('')
        + (chips.length ? '<button class="link-btn" data-chip="all">Xóa tất cả</button>' : '');
    }

    function render() {
      const list = filterListings(s);
      const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      s.page = Math.min(s.page, pages);
      const label = s.mode === 'ban' ? 'Mua bán nhà đất' : s.mode === 'thue' ? 'Cho thuê nhà đất' : 'Nhà đất';
      const typeName = s.type ? typesFor(s.mode).find((t) => t.id === s.type)?.name : '';
      const title = `${typeName ? (s.mode === 'ban' ? 'Bán ' : s.mode === 'thue' ? 'Cho thuê ' : '') + typeName.toLowerCase() : label} ${s.city ? 'tại ' + cityName(s.city) : 'trên toàn quốc'}`;
      $('#resultTitle').textContent = title;
      document.title = `${title} — Tổ Ấm`;
      $('#crumbCurrent').textContent = label;
      $('#resultMeta').textContent = `Hiện có ${list.length.toLocaleString('vi-VN')} bất động sản.`;

      $('#cards').className = `cards cards--${view}`;
      $('#cards').innerHTML = list.length
        ? list.slice((s.page - 1) * PAGE_SIZE, s.page * PAGE_SIZE).map((l) => cardHtml(l)).join('')
        : emptyHtml('Không tìm thấy tin phù hợp', 'Hãy thử nới rộng tiêu chí tìm kiếm.', '<button class="btn btn--ghost" data-chip="all">Xóa bộ lọc</button>');
      $$('.view-switch button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));

      renderPagination(pages);
      renderChips();
      renderSidebar();
      pushUrl();
    }

    function renderPagination(pages) {
      const p = s.page;
      const nums = [];
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - p) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
      }
      $('#pagination').innerHTML = pages <= 1 ? '' : `
        <button data-page="${p - 1}" ${p === 1 ? 'disabled' : ''}>‹</button>
        ${nums.map((n) => (n === '…' ? '<span>…</span>' : `<button data-page="${n}" class="${n === p ? 'is-active' : ''}">${n}</button>`)).join('')}
        <button data-page="${p + 1}" ${p === pages ? 'disabled' : ''}>›</button>`;
    }

    const update = (patch) => { Object.assign(s, patch, { page: patch.page || 1 }); render(); };

    $('#searchBar').addEventListener('submit', (e) => {
      e.preventDefault();
      const mode = $('#bMode').value;
      update({ mode, city: $('#bCity').value, q: $('#bKeyword').value.trim(), ...(mode !== s.mode ? { type: '', price: '' } : {}) });
    });
    $('#sidebar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      const { k, v } = b.dataset;
      const value = String(s[k]) === v && k !== 'mode' ? '' : v;
      update({ [k]: value, ...(k === 'mode' ? { type: '', price: '' } : {}) });
      renderBar();
    });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-chip]');
      if (!c) return;
      if (c.dataset.chip === 'all') update({ type: '', price: '', area: '', beds: '', city: '', q: '' });
      else update({ [c.dataset.chip]: '' });
      renderBar();
    });
    $('#pagination').addEventListener('click', (e) => {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      update({ page: +b.dataset.page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('#sortSel').addEventListener('change', (e) => update({ sort: e.target.value }));
    $$('.view-switch button').forEach((b) => b.addEventListener('click', () => {
      view = b.dataset.view;
      store.set('toam_view', view);
      render();
    }));

    renderBar();
    render();
  }

  /* =========================================================
     CHI TIẾT TIN — chi-tiet.html?id=L1000
     ========================================================= */
  function pageDetail() {
    const l = all.find((x) => x.id === PARAMS.get('id'));
    const root = $('#detailRoot');
    if (!l) {
      root.innerHTML = emptyHtml('Tin đăng không tồn tại', 'Tin có thể đã bị gỡ hoặc đường dẫn không đúng.', '<a class="btn btn--primary" href="tim-kiem.html">Xem tin khác</a>');
      return;
    }
    document.title = `${l.title} — Tổ Ấm`;
    const specs = [
      ['Loại hình', l.typeName],
      ['Mức giá', formatPrice(l)],
      ['Diện tích', `${l.area} m²`],
      l.floors && ['Số tầng', l.floors],
      l.beds && ['Số phòng ngủ', `${l.beds} phòng`],
      l.baths && ['Số toilet', `${l.baths} phòng`],
      ['Hướng nhà', l.direction],
      ['Pháp lý', l.legal],
      ['Nội thất', l.furniture],
    ].filter(Boolean);
    const mapQ = encodeURIComponent(`${l.district}, ${l.city}, Việt Nam`);
    const related = all.filter((x) => x.id !== l.id && x.mode === l.mode && x.cityId === l.cityId).sort(byNewest).slice(0, 4);
    const listUrl = `tim-kiem.html${qs({ mode: l.mode })}`;

    root.innerHTML = `
      <nav class="crumbs">
        <a href="index.html">Trang chủ</a> / <a href="${listUrl}">${l.mode === 'ban' ? 'Bán' : 'Cho thuê'}</a> /
        <a href="tim-kiem.html${qs({ mode: l.mode, city: l.cityId })}">${esc(l.city)}</a> /
        <a href="tim-kiem.html${qs({ mode: l.mode, city: l.cityId, type: l.type })}">${esc(l.typeName)}</a>
      </nav>
      <div class="gallery gallery--page">
        <img class="gallery__main" id="galleryMain" src="${esc(l.images[0])}" alt="" />
        <div class="gallery__thumbs">
          ${l.images.map((src, i) => `<img src="${esc(src)}" data-src="${esc(src)}" class="${i === 0 ? 'is-active' : ''}" alt="" />`).join('')}
        </div>
      </div>
      <div class="detail__grid detail__grid--page">
        <div class="detail__main">
          <h1 class="detail__title">${esc(l.title)}</h1>
          <p class="muted">${esc(l.address)}</p>
          <div class="keyfacts">
            <div><span>Mức giá</span><strong class="accent">${formatPrice(l)}</strong><small>~${formatPpm(l)}</small></div>
            <div><span>Diện tích</span><strong>${l.area} m²</strong></div>
            ${l.beds ? `<div><span>Phòng ngủ</span><strong>${l.beds} PN</strong></div>` : ''}
            <div class="keyfacts__actions">
              <button class="icon-btn" id="shareBtn" title="Sao chép liên kết"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg></button>
              <button class="fav fav--lg ${favs.has(l.id) ? 'is-active' : ''}" data-fav="${l.id}" title="Lưu tin">${heartSvg}</button>
            </div>
          </div>

          <h3>Thông tin mô tả</h3>
          <p class="desc">${esc(l.description)}</p>

          <h3>Đặc điểm bất động sản</h3>
          <dl class="specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>

          <h3>Xem trên bản đồ</h3>
          <iframe class="map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=${mapQ}&z=14&output=embed" title="Bản đồ"></iframe>

          ${l.mode === 'ban' ? `<h3>Ước tính khoản vay</h3>${loanCalcHtml(l.price)}` : ''}

          <dl class="meta">
            <div><dt>Ngày đăng</dt><dd>${new Date(l.postedAt).toLocaleDateString('vi-VN')}</dd></div>
            <div><dt>Loại tin</dt><dd>${l.vip ? 'Tin ' + l.vip : 'Tin thường'}</dd></div>
            <div><dt>Mã tin</dt><dd>${l.id}</dd></div>
          </dl>
        </div>

        <aside class="detail__side">
          <div class="contact">
            <div class="contact__who">
              <span class="avatar avatar--lg">${initials(l.agent.name)}</span>
              <div><small class="muted">Được đăng bởi</small><b>${esc(l.agent.name)}</b><span class="tag tag--soft">${esc(l.agent.tag)}</span></div>
            </div>
            <button class="btn btn--primary btn--block" id="revealPhone">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>
              <span>${esc(String(l.agent.phone).slice(0, 8))} *** · Hiện số</span>
            </button>
            <button class="btn btn--ghost btn--block" id="msgBtn">Gửi tin nhắn</button>
            <form class="post-form contact__form is-hidden" id="msgForm" novalidate>
              ${requiredFieldsHtml(`Tôi quan tâm đến tin ${l.id}. Vui lòng liên hệ lại.`)}
              <button class="btn btn--primary btn--block">Gửi yêu cầu liên hệ</button>
            </form>
          </div>
          <div class="note">
            <b>Lưu ý an toàn</b>
            <p>Không chuyển tiền đặt cọc khi chưa xem nhà và kiểm tra giấy tờ pháp lý.</p>
          </div>
        </aside>
      </div>

      ${related.length ? `
        <section class="section section--tight">
          <div class="section__head"><h2>Bất động sản tương tự</h2><a href="tim-kiem.html${qs({ mode: l.mode, city: l.cityId })}" class="see-all">Xem tất cả →</a></div>
          <div class="cards cards--grid">${related.map((r) => cardHtml(r)).join('')}</div>
        </section>` : ''}`;

    root.querySelector('.gallery__thumbs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-src]');
      if (!t || t.dataset.failed) return;
      $('#galleryMain').src = t.dataset.src;
      $$('.gallery__thumbs img', root).forEach((x) => x.classList.toggle('is-active', x === t));
    });
    $('#revealPhone').addEventListener('click', function () {
      this.querySelector('span').textContent = l.agent.phone;
      this.classList.add('is-revealed');
    });
    $('#msgBtn').addEventListener('click', () => $('#msgForm').classList.toggle('is-hidden'));
    $('#msgForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(e.target)) return;
      saveContact(e.target, { topic: 'Hỏi về tin đăng', listingId: l.id });
      e.target.classList.add('is-hidden');
      toast('Đã gửi yêu cầu tới người đăng tin');
    });
    $('#shareBtn').addEventListener('click', () => {
      navigator.clipboard?.writeText(location.href).then(() => toast('Đã sao chép liên kết'), () => toast(location.href));
    });
    if (l.mode === 'ban') bindLoanCalc(root);
    if (PARAMS.get('new')) {
      toast('Đăng tin thành công!');
      history.replaceState(null, '', `chi-tiet.html?id=${l.id}`);
    }
  }

  /* =========================================================
     ĐĂNG TIN — dang-tin.html
     ========================================================= */
  function pagePost() {
    const form = $('#postForm');
    fillSelect(form.elements.city, '', CITIES.map((c) => [c.id, c.name]));

    const syncType = () => {
      const mode = form.elements.mode.value;
      fillSelect(form.elements.type, '', TYPES[mode].map((t) => [t.id, t.name]));
      $('#priceLabel').textContent = mode === 'ban' ? 'Tổng giá (triệu đồng)' : 'Giá thuê (triệu/tháng)';
    };
    const syncDistrict = () => {
      const c = CITIES.find((x) => x.id === form.elements.city.value);
      fillSelect(form.elements.district, '', c.districts.map((d) => [d, d]));
    };

    // Dựng đối tượng tin từ dữ liệu form (dùng cho cả xem trước và lưu)
    function buildListing() {
      const f = Object.fromEntries(new FormData(form));
      const city = CITIES.find((c) => c.id === f.city);
      const type = TYPES[f.mode].find((t) => t.id === f.type);
      const sample = SEED.find((l) => l.type === type.id) || SEED[0];
      const beds = +f.beds || 0;
      return {
        id: 'U' + Date.now().toString(36).toUpperCase(),
        mine: true,
        mode: f.mode,
        type: type.id,
        typeName: type.name,
        cityId: city.id,
        city: city.name,
        district: f.district,
        address: [f.street.trim(), f.district, city.name].filter(Boolean).join(', '),
        area: +f.area || 0,
        beds,
        baths: +f.baths || (beds ? Math.max(1, beds - 1) : 0),
        floors: +f.floors || 0,
        price: (+f.price || 0) * 1e6,
        direction: f.direction || 'Đang cập nhật',
        legal: f.mode === 'ban' ? f.legal : 'Hợp đồng thuê',
        furniture: f.furniture,
        vip: f.vip,
        images: f.image.trim() ? [f.image.trim(), ...sample.images.slice(1)] : sample.images,
        agent: { name: f.name.trim(), phone: f.phone.trim(), tag: 'Chính chủ' },
        postedAt: Date.now(),
        title: f.title.trim(),
        description: f.description.trim(),
      };
    }
    const renderPreview = () => { $('#preview').innerHTML = cardHtml(buildListing(), true); };

    form.addEventListener('change', (e) => {
      if (e.target.name === 'mode') syncType();
      if (e.target.name === 'city') syncDistrict();
      $('.legal-field').classList.toggle('is-hidden', form.elements.mode.value !== 'ban');
    });
    form.addEventListener('input', renderPreview);
    form.addEventListener('change', renderPreview);
    syncType();
    syncDistrict();
    renderPreview();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;
      const listing = buildListing();
      myListings.unshift(listing);
      store.set('toam_my_listings', myListings);
      location.href = `chi-tiet.html?id=${listing.id}&new=1`;
    });
  }

  /* =========================================================
     DỰ ÁN — du-an.html?city=&status=&q=
     ========================================================= */
  function pageProjects() {
    const f = { city: PARAMS.get('city') || '', status: PARAMS.get('status') || '', q: PARAMS.get('q') || '' };
    fillSelect($('#pCity'), 'Toàn quốc', CITIES.map((c) => [c.id, c.name]));
    $('#pCity').value = f.city;
    $('#pStatus').value = f.status;
    $('#pKeyword').value = f.q;

    function render() {
      const kw = normalize(f.q);
      const list = projects.filter((p) =>
        (!f.city || p.cityId === f.city) &&
        (!f.status || p.status === f.status) &&
        (!kw || normalize(`${p.name} ${p.city} ${p.district} ${p.kind}`).includes(kw)));
      $('#projectMeta').textContent = `Hiện có ${list.length} dự án${f.city ? ' tại ' + cityName(f.city) : ''}.`;
      $('#projectGrid').innerHTML = list.length ? list.map(projectCardHtml).join('') : emptyHtml('Không có dự án phù hợp', 'Hãy thử chọn khu vực hoặc trạng thái khác.');
      history.replaceState(null, '', `du-an.html${qs(f)}`);
    }
    $('#projectFilter').addEventListener('submit', (e) => { e.preventDefault(); f.q = $('#pKeyword').value.trim(); render(); });
    $('#pCity').addEventListener('change', (e) => { f.city = e.target.value; render(); });
    $('#pStatus').addEventListener('change', (e) => { f.status = e.target.value; render(); });
    bindProjectCards($('#projectGrid'));
    render();
  }

  /* =========================================================
     TIN ĐÃ LƯU — da-luu.html
     ========================================================= */
  function pageSaved() {
    function render() {
      const list = all.filter((l) => favs.has(l.id));
      $('#savedMeta').textContent = list.length ? `Bạn đã lưu ${list.length} tin.` : '';
      $('#clearSaved').hidden = !list.length;
      $('#cards').innerHTML = list.length
        ? list.map((l) => cardHtml(l)).join('')
        : emptyHtml('Bạn chưa lưu tin nào', 'Bấm biểu tượng ♥ trên tin đăng để lưu lại và xem sau.', '<a class="btn btn--primary" href="tim-kiem.html">Tìm nhà ngay</a>');
    }
    onFavChange = render;
    $('#clearSaved').addEventListener('click', () => {
      if (!confirm('Xóa tất cả tin đã lưu?')) return;
      favs.clear();
      store.set('toam_favs', []);
      updateFavCount();
      render();
      toast('Đã xóa danh sách tin đã lưu');
    });
    render();
  }

  /* =========================================================
     LIÊN HỆ — lien-he.html
     ========================================================= */
  function pageContact() {
    const form = $('#contactForm');
    fillSelect(form.elements.city, 'Chưa xác định', CITIES.map((c) => [c.id, c.name]));

    const msg = form.elements.message;
    const updateCount = () => { $('#charCount').textContent = msg.value.length; };
    msg.addEventListener('input', updateCount);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;
      const c = saveContact(form, { city: cityName(form.elements.city.value) });
      $('#successText').textContent = `Cảm ơn ${c.name}! Yêu cầu “${c.topic}” đã được ghi nhận. Chúng tôi sẽ gọi lại số ${c.phone} (${c.callTime.toLowerCase()}) và gửi xác nhận tới ${c.email}.`;
      form.classList.add('is-hidden');
      $('#contactSuccess').classList.remove('is-hidden');
      toast('Đã gửi yêu cầu liên hệ');
    });

    $('#sendAnother').addEventListener('click', () => {
      form.reset();
      updateCount();
      $('#contactSuccess').classList.add('is-hidden');
      form.classList.remove('is-hidden');
      form.elements.name.focus();
    });

    // Điền sẵn SĐT nếu người dùng đã đăng nhập bằng số điện thoại
    const user = store.get('toam_user', null);
    if (user && /^[0-9 +]{9,13}$/.test(user)) form.elements.phone.value = user;
  }

  /* ================= Khởi chạy ================= */
  renderLayout();
  ({ home: pageHome, search: pageSearch, detail: pageDetail, post: pagePost, projects: pageProjects, saved: pageSaved, contact: pageContact })[PAGE]?.();
})();
