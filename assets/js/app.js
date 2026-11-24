/* ============================================================
   ReUse v2.0 — App shell: routing, navigation, modals, toasts
   ============================================================ */
function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return (h || '/').split('?')[0];
}
function navigate(path) {
  if (currentPath() === path) { router(); return; }
  location.hash = '#' + path;
}
function pageTitle(text) {
  document.title = text ? text + ' | ReUse' : 'ReUse | Give Things a Second Life';
}

/* ---------------- Header ---------------- */
function renderHeader() {
  const el = document.getElementById('siteHeader');
  if (!el) return;
  const user = Auth.currentUser();
  const path = currentPath();
  const active = p => path === p ? 'active' : '';
  const items = [
    `<a class="${active('/')}" href="#/">Home</a>`,
    `<a href="#/" onclick="goHomeSection('categories')">Kategori</a>`,
    `<a class="${active('/explore')}" href="#/explore">Explore</a>`,
    `<a href="#/" onclick="goHomeSection('about')">Tentang Kami</a>`
  ];
  if (user && user.role !== 'admin') items.push(`<a class="${active('/orders')}" href="#/orders">Pesanan</a>`);
  if (user && user.role !== 'admin') items.push(`<a class="${active('/seller')}" href="#/seller">Seller Dashboard</a>`);
  if (user && user.role === 'admin') items.push(`<a href="#/admin">Admin Dashboard</a>`);

  el.innerHTML = `<header class="site"><div class="container nav">
    <a class="brand" href="#/" aria-label="ReUse beranda"><span class="brand-mark">↻</span> ReUse</a>
    <nav class="navlinks">${items.join('')}</nav>
    <div class="nav-actions">
      ${user ? `
        ${user.role !== 'admin' ? `
          <button class="icon-btn" onclick="openWishlist()" aria-label="Wishlist" title="Wishlist">♡<span class="count" id="wishCount">0</span></button>
          <button class="icon-btn" onclick="openCart()" aria-label="Keranjang" title="Keranjang">🛒<span class="count" id="cartCount">0</span></button>
          <button class="icon-btn" onclick="navigate('/chat')" aria-label="Pesan" title="Pesan">✉<span class="count hide" id="chatCount">0</span></button>
        ` : ''}
        <button class="icon-btn" onclick="navigate('/notifications')" aria-label="Notifikasi" title="Notifikasi">🔔<span class="count hide" id="notifyCount">0</span></button>
        <div class="profile-menu">
          <button class="profile-trigger" onclick="toggleProfileMenu(event)" aria-haspopup="true">
            ${avatarHtml(user)}<span class="profile-name">${safe(user.name.split(' ')[0])}</span><span class="caret" style="font-size:10px;color:var(--muted)">▾</span>
          </button>
          <div class="profile-dropdown" id="profileDropdown">
            <div class="who"><strong>${safe(user.name)}</strong><small>@${safe(user.username)} · ${user.role === 'admin' ? 'Administrator' : 'Member'}</small></div>
            <a href="#/profile" onclick="closeProfileMenu()">👤 Profil Saya</a>
            ${user.role !== 'admin' ? `<a href="#/orders" onclick="closeProfileMenu()">▦ Pesanan Saya</a>
            <a href="#/chat" onclick="closeProfileMenu()">✉ Pesan</a>` : ''}
            <a href="#/notifications" onclick="closeProfileMenu()">🔔 Notifikasi</a>
            ${user.role !== 'admin' ? `<button onclick="closeProfileMenu();openWishlist()">♡ Wishlist</button>
            <button onclick="closeProfileMenu();openCart()">🛒 Keranjang</button>` : ''}
            ${user.role !== 'admin' ? `<a href="#/seller" onclick="closeProfileMenu()">▦ Seller Dashboard</a>` : ''}
            ${user.role === 'admin' ? `<a href="#/admin" onclick="closeProfileMenu()">▤ Admin Dashboard</a>` : ''}
            <button class="danger" onclick="requestLogout()">↩ Logout</button>
          </div>
        </div>
      ` : `
        <a class="btn btn-outline" href="#/login">Login</a>
        <a class="btn btn-primary" href="#/register">Register</a>
      `}
      <button class="hamburger" onclick="toggleMobileMenu()" aria-label="Menu">☰</button>
    </div>
  </div>
  <div class="mobile-menu" id="mobileMenu"><div class="container">
    ${items.map(i => i.replace(/<\/?a/g, m => m)).join('')}
    ${user && user.role !== 'admin' ? '<a href="#/chat" onclick="closeMobileMenu()">✉ Pesan</a>' : ''}
    ${user ? '<a href="#/notifications" onclick="closeMobileMenu()">🔔 Notifikasi</a>' : ''}
    <div class="mm-actions">
      ${user ? `<a class="btn btn-light" href="#/profile" onclick="closeMobileMenu()">Profil</a><button class="btn btn-primary" onclick="requestLogout()">Logout</button>`
        : `<a class="btn btn-outline" href="#/login" onclick="closeMobileMenu()">Login</a><a class="btn btn-primary" href="#/register" onclick="closeMobileMenu()">Register</a>`}
    </div>
  </div></div>`;
  syncCounts();
}
function toggleMobileMenu() {
  const m = document.getElementById('mobileMenu');
  if (m) m.classList.toggle('show');
}
function closeMobileMenu() {
  const m = document.getElementById('mobileMenu');
  if (m) m.classList.remove('show');
}
function toggleProfileMenu(e) {
  if (e) e.stopPropagation();
  const d = document.getElementById('profileDropdown');
  if (d) d.classList.toggle('show');
}
function closeProfileMenu() {
  const d = document.getElementById('profileDropdown');
  if (d) d.classList.remove('show');
}
function syncCounts() {
  const user = Auth.currentUser();
  const cartCount = document.getElementById('cartCount');
  const wishCount = document.getElementById('wishCount');
  if (cartCount) cartCount.textContent = user ? DB.cart().filter(c => c.userId === user.id).reduce((s, c) => s + c.quantity, 0) : 0;
  if (wishCount) wishCount.textContent = user ? DB.wishlist().filter(w => w.userId === user.id).length : 0;
  const chatCount = document.getElementById('chatCount');
  if (chatCount) {
    const n = user && user.role !== 'admin' ? unreadChatCount(user.id) : 0;
    chatCount.textContent = n;
    chatCount.classList.toggle('hide', n === 0);
  }
  const notifyCount = document.getElementById('notifyCount');
  if (notifyCount) {
    const n = user ? unreadNotifyCount(user.id) : 0;
    notifyCount.textContent = n;
    notifyCount.classList.toggle('hide', n === 0);
  }
}

/* ---------------- Footer ---------------- */
function renderFooter() {
  const el = document.getElementById('siteFooter');
  if (!el) return;
  el.innerHTML = `<footer class="site"><div class="container">
    <div class="footer-grid">
      <div style="max-width:400px">
        <div class="footer-brand">↻ ReUse</div>
        <p class="footer-text">Give Things a Second Life. Marketplace barang bekas yang menghubungkan penjual dan pembeli untuk gaya hidup yang lebih berkelanjutan.</p>
        <p class="footer-text" style="margin-top:8px">Tahap awal: Banda Aceh dan sekitarnya<br>Responsive Web Marketplace · MVP 2.0</p>
      </div>
      <div class="footer-col"><strong>JELAJAHI</strong><a href="#/">Home</a><br><a href="#/explore">Explore</a><br><a href="#/" onclick="goHomeSection('categories')">Kategori</a><br><a href="#/" onclick="goHomeSection('about')">Tentang Kami</a></div>
      <div class="footer-col"><strong>AKUN</strong><a href="#/login">Login</a><br><a href="#/register">Register</a><br><a href="#/profile">Profil</a><br><a href="#/orders">Pesanan Saya</a><br><a href="#/chat">Pesan</a><br><a href="#/seller">Seller Dashboard</a></div>
      <div class="footer-col"><strong>LAINNYA</strong><a href="#/admin-login">Admin Login</a><br><a href="#/privasi">Kebijakan Privasi</a><br><a href="#/explore">Explore Produk</a><br><a href="#/" onclick="goHomeSection('about')">Tentang Kami</a></div>
    </div>
    <div class="copyright"><span>© 2026 ReUse Marketplace. Frontend prototype untuk demonstrasi.</span><span>Data disimpan di localStorage browser · v2.0</span></div>
  </div></footer>`;
}

/* ---------------- Chrome visibility ---------------- */
function setChrome(show) {
  if (show) {
    renderHeader();
    renderFooter();
  } else {
    document.getElementById('siteHeader').innerHTML = '';
    document.getElementById('siteFooter').innerHTML = '';
  }
}

/* ---------------- Modals ---------------- */
let confirmResolver = null;

function openModal(html, size) {
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  if (!overlay || !box) return;
  box.className = 'modal' + (size ? ' ' + size : '');
  document.getElementById('modalBody').innerHTML = html;
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const first = box.querySelector('input:not([type="hidden"]), textarea, select');
    if (first && window.innerWidth > 700) first.focus();
  }, 70);
}
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  const body = document.getElementById('modalBody');
  if (body) body.innerHTML = '';
  if (confirmResolver) { const r = confirmResolver; confirmResolver = null; r(false); }
}
function overlayClick(e) {
  if (e.target && e.target.id === 'modalOverlay') closeModal();
}
function resolveConfirm(value) {
  const r = confirmResolver;
  confirmResolver = null;
  closeModal();
  if (r) r(value);
}
function confirmDialog(opts) {
  return new Promise(resolve => {
    confirmResolver = resolve;
    openModal(`
      <h2>${safe(opts.title || 'Konfirmasi')}</h2>
      <p class="modal-sub">${safe(opts.message || '')}</p>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="resolveConfirm(false)">${safe(opts.cancelText || 'Cancel')}</button>
        <button class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" onclick="resolveConfirm(true)">${safe(opts.confirmText || 'Ya')}</button>
      </div>`, 'small');
  });
}

/* ---------------- Toasts, alerts, loader ---------------- */
function toast(message, type) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = message;
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity .25s, transform .25s';
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 260);
  }, 3400);
}
function setAlert(id, type, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert show ' + type;
  el.textContent = message;
}
function clearAlert(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'alert';
  el.textContent = '';
}
function markInvalid(form, name, message) {
  const input = form.querySelector(`[name="${name}"]`);
  if (!input) { return; }
  const field = input.closest('.field');
  if (field) {
    field.classList.add('invalid');
    let err = field.querySelector('.error');
    if (!err) { err = document.createElement('div'); err.className = 'error'; field.appendChild(err); }
    err.textContent = message;
  }
  if (input.focus) input.focus();
  if (input.scrollIntoView) input.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function withLoader(fn) {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('show');
  setTimeout(() => {
    try { fn(); }
    catch (err) { console.error(err); toast('Terjadi kesalahan tak terduga. Coba lagi.', 'error'); }
    finally { if (loader) loader.classList.remove('show'); }
  }, 300);
}

/* ---------------- Router ---------------- */
function goHomeSection(id) {
  closeMobileMenu();
  if (currentPath() !== '/') {
    location.hash = '#/';
    setTimeout(() => scrollToId(id), 220);
  } else {
    scrollToId(id);
  }
}

function router() {
  const path = currentPath();
  const user = Auth.currentUser();
  if (SEC.consumeIdleFlag()) toast('Sesi berakhir karena tidak aktif selama 30 menit. Silakan login kembali.', 'info');
  if (user) SEC.touchSession();
  closeProfileMenu();
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'auto' });

  if (path === '/welcome') {
    if (user) { navigate(user.role === 'admin' ? '/admin' : '/'); return; }
    setChrome(false);
    renderWelcome();
    pageTitle('Selamat Datang');
    return;
  }
  if (path === '/admin-login') {
    if (user && user.role === 'admin') { navigate('/admin'); return; }
    setChrome(false);
    renderAdminLogin();
    pageTitle('Admin Login');
    return;
  }
  if (!DB.meta().introDone && !user && (path === '/' || path === '/explore')) {
    setChrome(false);
    navigate('/welcome');
    return;
  }
  if (path.startsWith('/admin')) {
    if (!user || user.role !== 'admin') {
      toast('Silakan login sebagai administrator untuk membuka Admin Dashboard.', 'error');
      navigate('/login');
      return;
    }
    setChrome(false);
    renderAdmin(path);
    pageTitle('Admin Dashboard');
    return;
  }
  if (path === '/login') {
    if (user) { navigate(user.role === 'admin' ? '/admin' : '/'); return; }
    setChrome(false);
    renderLogin();
    pageTitle('Login');
    return;
  }
  if (path === '/register') {
    if (user) { navigate(user.role === 'admin' ? '/admin' : '/'); return; }
    setChrome(false);
    renderRegister();
    pageTitle('Register');
    return;
  }
  if (path === '/privasi') {
    setChrome(true);
    renderPrivacy();
    pageTitle('Kebijakan Privasi');
    return;
  }
  if (path === '/orders') {
    if (!user) { toast('Silakan login untuk membuka pesanan.', 'info'); navigate('/login'); return; }
    if (user.role === 'admin') { toast('Pesanan hanya tersedia untuk akun member.', 'info'); navigate('/admin'); return; }
    setChrome(true);
    renderOrders();
    return;
  }
  if (path === '/chat' || path.startsWith('/chat/')) {
    if (!user) { toast('Silakan login untuk membuka pesan.', 'info'); navigate('/login'); return; }
    setChrome(true);
    renderChats(path.startsWith('/chat/') ? path.split('/')[2] : null);
    return;
  }
  if (path === '/notifications') {
    if (!user) { toast('Silakan login untuk melihat notifikasi.', 'info'); navigate('/login'); return; }
    setChrome(true);
    renderNotifications();
    return;
  }
  if (path === '/profile') {
    if (!user) { toast('Silakan login terlebih dahulu.', 'info'); navigate('/login'); return; }
    setChrome(true);
    renderProfile();
    pageTitle('Profil Saya');
    syncCounts();
    return;
  }
  if (path === '/seller') {
    if (!user) { toast('Silakan login untuk membuka Seller Dashboard.', 'info'); navigate('/login'); return; }
    if (user.role === 'admin') {
      toast('Akun administrator tidak menggunakan Seller Dashboard.', 'info');
      navigate('/admin');
      return;
    }
    setChrome(true);
    renderSeller();
    pageTitle('Seller Dashboard');
    syncCounts();
    return;
  }

  if (path.startsWith('/product/')) {
    const productId = decodeURIComponent(path.split('/')[2] || '');
    setChrome(true);
    renderExplore();
    pageTitle('Detail Produk');
    syncCounts();
    if (DB.productById(productId)) setTimeout(() => showDetail(productId), 80);
    else toast('Produk tidak ditemukan atau sudah dihapus.', 'error');
    return;
  }

  setChrome(true);
  if (path === '/explore') { renderExplore(); pageTitle('Explore'); }
  else { renderHome(); pageTitle(); }
  syncCounts();
}

/* ---------------- Boot ---------------- */
function boot() {
  DB.init();
  SEC.prune();
  if (!location.hash) location.hash = '#/';
  window.addEventListener('hashchange', router);
  document.addEventListener('click', () => closeProfileMenu());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeProfileMenu(); closeMobileMenu(); }
  });
  router();
}
boot();
