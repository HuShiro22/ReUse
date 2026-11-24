/* ============================================================
   ReUse v2.0 — Authentication, session & user profile
   DEMO ONLY: session + password hash live in localStorage.
   ============================================================ */
const Auth = {
  currentUser() {
    const s = DB.session();
    if (!s || !s.userId) return null;
    const u = DB.userById(s.userId);
    if (!u || u.status !== 'active') { DB.saveSession(null); return null; }
    return u;
  },
  login(identifier, password) {
    const idf = String(identifier || '').trim().toLowerCase();
    if (!idf || !password) return { ok: false, error: 'Email/username dan password wajib diisi.' };
    const user = DB.users().find(u =>
      u.username.toLowerCase() === idf || u.email.toLowerCase() === idf
    );
    if (!user) return { ok: false, error: 'Akun tidak ditemukan. Periksa email atau username kamu.' };
    if (user.passwordHash !== hashPassword(password)) return { ok: false, error: 'Password salah. Silakan coba lagi.' };
    if (user.status !== 'active') return { ok: false, error: 'Akun kamu sedang dinonaktifkan. Hubungi administrator ReUse.' };
    DB.saveSession({ userId: user.id, at: new Date().toISOString() });
    const meta = DB.meta(); meta.introDone = true; DB.saveMeta(meta);
    return { ok: true, user };
  },
  register(payload) {
    const users = DB.users();
    const username = payload.username.trim();
    const email = payload.email.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { ok: false, field: 'username', error: 'Username sudah digunakan. Coba yang lain.' };
    }
    if (users.some(u => u.email.toLowerCase() === email)) {
      return { ok: false, field: 'email', error: 'Email sudah terdaftar. Gunakan email lain atau login.' };
    }
    const user = {
      id: uid('u'),
      name: payload.name.trim(),
      username,
      email,
      phone: payload.phone.trim(),
      location: payload.location.trim(),
      role: payload.role === 'seller' ? 'seller' : 'customer',
      status: 'active',
      passwordHash: hashPassword(payload.password),
      avatar: '',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    DB.saveUsers(users);
    return { ok: true, user };
  },
  logout() {
    DB.saveSession(null);
  },
  requireRole(roles) {
    const user = this.currentUser();
    if (!user) return { ok: false, redirect: '/login' };
    if (roles && roles.length && !roles.includes(user.role)) return { ok: false, redirect: user.role === 'admin' ? '/admin' : '/' };
    return { ok: true, user };
  }
};

/* ---------------- Login page ---------------- */
let pendingLoginUsername = '';

function renderLogin() {
  const root = document.getElementById('app');
  root.innerHTML = `
  <div class="auth">
    <aside class="auth-art">
      <div>
        <a class="brand" href="#/"><span class="brand-mark">↻</span> ReUse</a>
        <span class="kicker" style="color:#a9c9ae">GIVE THINGS A SECOND LIFE</span>
        <h2>Barang baik<br>layak punya<br>cerita baru.</h2>
        <p>Masuk untuk melanjutkan belanja barang preloved, mengelola produkmu, atau membuka dashboard sesuai hak akses akun.</p>
        <ul>
          <li><span>✓</span> Katalog barang bekas berkualitas dari Banda Aceh dan sekitarnya</li>
          <li><span>✓</span> Kelola produk, status moderasi, dan profil penjual</li>
          <li><span>✓</span> Checkout langsung ke WhatsApp penjual</li>
        </ul>
      </div>
      <div class="quote">ReUse Marketplace · Prototype v2.0</div>
    </aside>
    <section class="auth-panel">
      <div class="auth-card">
        <a class="auth-back" href="#/">← Kembali ke beranda</a>
        <h1>Selamat datang kembali</h1>
        <p class="lead">Masuk dengan akun ReUse kamu.</p>
        <div class="alert" id="loginAlert"></div>
        <form id="loginForm" onsubmit="handleLogin(event)" novalidate>
          <div class="field" id="f-loginId">
            <label for="loginId">Email atau Username</label>
            <input id="loginId" name="identifier" autocomplete="username" placeholder="nama@email.com atau username">
          </div>
          <div class="field" id="f-loginPw">
            <label for="loginPw">Password</label>
            <div class="password-wrap">
              <input id="loginPw" name="password" type="password" autocomplete="current-password" placeholder="Password kamu">
              <button type="button" class="password-toggle" onclick="togglePassword('loginPw', this)">Lihat</button>
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:-4px">
            <button type="button" style="border:0;background:none;color:var(--forest);font-weight:750;font-size:12px;padding:2px" onclick="openForgotPassword()">Lupa password?</button>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:14px" type="submit">Login →</button>
        </form>
        <p class="swap">Belum punya akun? <a href="#/register">Daftar sekarang</a></p>

        <div class="demo-box">
          <strong>Akun demo</strong>
          <div class="demo-account"><span>Admin</span><code>admin / admin123</code><button type="button" onclick="fillLogin('admin','admin123')">Isi</button></div>
          <div class="demo-account"><span>Seller</span><code>nadia / nadia123</code><button type="button" onclick="fillLogin('nadia','nadia123')">Isi</button></div>
          <div class="demo-account"><span>Customer</span><code>aisyah / aisyah123</code><button type="button" onclick="fillLogin('aisyah','aisyah123')">Isi</button></div>
        </div>
        <p class="small" style="margin-top:12px">Akun administrator memiliki halaman login terpisah di <a href="#/admin-login" style="color:var(--forest);font-weight:750">Admin Login</a>.</p>
      </div>
    </section>
  </div>`;
  document.getElementById('siteHeader').innerHTML = '';
  document.getElementById('siteFooter').innerHTML = '';
  if (pendingLoginUsername) {
    const input = document.getElementById('loginId');
    if (input) input.value = pendingLoginUsername;
    pendingLoginUsername = '';
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? 'Sembunyi' : 'Lihat';
}

function fillLogin(username, password) {
  const u = document.getElementById('loginId');
  const p = document.getElementById('loginPw');
  if (!u || !p) return;
  u.value = username;
  p.value = password;
  const btn = p.parentElement.querySelector('.password-toggle');
  if (btn && p.type === 'text') { p.type = 'password'; btn.textContent = 'Lihat'; }
  document.getElementById('loginPw').focus();
}

function handleLogin(e) {
  e.preventDefault();
  const f = e.target;
  const identifier = f.identifier.value.trim();
  const password = f.password.value;
  clearAlert('loginAlert');
  f.querySelectorAll('.field').forEach(x => x.classList.remove('invalid'));
  if (!identifier) { markInvalid(f, 'identifier', 'Email atau username wajib diisi.'); return; }
  if (!password) { markInvalid(f, 'password', 'Password wajib diisi.'); return; }
  withLoader(() => {
    const res = Auth.login(identifier, password);
    if (!res.ok) { setAlert('loginAlert', 'error', res.error); return; }
    toast('Login berhasil. Selamat datang, ' + res.user.name + '!', 'success');
    if (res.user.role === 'admin') navigate('/admin');
    else navigate('/');
  });
}

/* ---------------- Register page ---------------- */
function renderRegister() {
  const root = document.getElementById('app');
  const cats = DB.categories().map(c => c.name);
  root.innerHTML = `
  <div class="auth">
    <aside class="auth-art">
      <div>
        <a class="brand" href="#/"><span class="brand-mark">↻</span> ReUse</a>
        <span class="kicker" style="color:#a9c9ae">JOIN THE CIRCLE</span>
        <h2>Satu akun,<br>banyak kesempatan<br>kedua.</h2>
        <p>Daftar sebagai Customer untuk berbelanja, atau sebagai Seller untuk mulai menjual barang yang tidak lagi kamu gunakan.</p>
        <ul>
          <li><span>✓</span> Gratis, tanpa biaya pendaftaran</li>
          <li><span>✓</span> Produk seller melewati moderasi admin</li>
          <li><span>✓</span> Transaksi langsung dengan penjual via WhatsApp</li>
        </ul>
      </div>
      <div class="quote">${cats.length} kategori · Banda Aceh &amp; sekitarnya</div>
    </aside>
    <section class="auth-panel">
      <div class="auth-card">
        <a class="auth-back" href="#/">← Kembali ke beranda</a>
        <h1>Buat akun baru</h1>
        <p class="lead">Lengkapi data di bawah. Semua kolom wajib diisi.</p>
        <div class="alert" id="regAlert"></div>
        <form id="registerForm" onsubmit="handleRegister(event)" novalidate>
          <div class="field"><label for="regName">Nama lengkap</label><input id="regName" name="name" placeholder="Contoh: Nadia Putri"></div>
          <div class="form-row">
            <div class="field"><label for="regUsername">Username</label><input id="regUsername" name="username" placeholder="nadiasaleh" autocomplete="username"></div>
            <div class="field"><label for="regEmail">Email</label><input id="regEmail" name="email" type="email" placeholder="nama@email.com" autocomplete="email"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="regPhone">Nomor WhatsApp</label><input id="regPhone" name="phone" placeholder="08xxxxxxxxxx" inputmode="tel"></div>
            <div class="field"><label for="regLocation">Lokasi</label><input id="regLocation" name="location" placeholder="Banda Aceh"></div>
          </div>
          <div class="form-row">
            <div class="field"><label for="regPassword">Password</label>
              <div class="password-wrap">
                <input id="regPassword" name="password" type="password" placeholder="Minimal 8 karakter" autocomplete="new-password">
                <button type="button" class="password-toggle" onclick="togglePassword('regPassword', this)">Lihat</button>
              </div>
            </div>
            <div class="field"><label for="regConfirm">Konfirmasi password</label>
              <div class="password-wrap">
                <input id="regConfirm" name="confirm" type="password" placeholder="Ulangi password" autocomplete="new-password">
                <button type="button" class="password-toggle" onclick="togglePassword('regConfirm', this)">Lihat</button>
              </div>
            </div>
          </div>
          <div class="field">
            <label>Jenis akun</label>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <label style="flex:1;min-width:150px;display:flex;gap:9px;align-items:flex-start;border:1px solid var(--line);border-radius:11px;padding:11px;cursor:pointer;font-weight:600">
                <input type="radio" name="role" value="customer" checked style="width:auto;margin-top:2px">
                <span><strong style="display:block;color:var(--forest)">Customer</strong><small class="small">Mencari dan membeli barang</small></span>
              </label>
              <label style="flex:1;min-width:150px;display:flex;gap:9px;align-items:flex-start;border:1px solid var(--line);border-radius:11px;padding:11px;cursor:pointer;font-weight:600">
                <input type="radio" name="role" value="seller" style="width:auto;margin-top:2px">
                <span><strong style="display:block;color:var(--forest)">Seller</strong><small class="small">Menjual barang &amp; kelola dashboard</small></span>
              </label>
            </div>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:8px" type="submit">Daftar sekarang</button>
        </form>
        <p class="swap">Sudah punya akun? <a href="#/login">Login di sini</a></p>
        <div class="hint">Akun administrator tidak dapat dibuat melalui halaman ini. Gunakan halaman Admin Login.</div>
      </div>
    </section>
  </div>`;
  document.getElementById('siteHeader').innerHTML = '';
  document.getElementById('siteFooter').innerHTML = '';
}

function handleRegister(e) {
  e.preventDefault();
  const f = e.target;
  clearAlert('regAlert');
  f.querySelectorAll('.field').forEach(x => x.classList.remove('invalid'));
  const data = {
    name: f.name.value.trim(),
    username: f.username.value.trim(),
    email: f.email.value.trim(),
    phone: f.phone.value.trim(),
    location: f.location.value.trim(),
    password: f.password.value,
    confirm: f.confirm.value,
    role: (f.querySelector('input[name="role"]:checked') || {}).value || 'customer'
  };
  if (data.name.length < 3) return markInvalid(f, 'name', 'Nama lengkap minimal 3 karakter.');
  if (!/^[a-zA-Z0-9._]{3,20}$/.test(data.username)) return markInvalid(f, 'username', 'Username 3–20 karakter, hanya huruf, angka, titik, atau garis bawah.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return markInvalid(f, 'email', 'Format email tidak valid.');
  if (!/^\+?\d{9,15}$/.test(data.phone.replace(/[\s-]/g, ''))) return markInvalid(f, 'phone', 'Nomor WhatsApp harus 9–15 digit angka.');
  if (data.location.length < 3) return markInvalid(f, 'location', 'Lokasi minimal 3 karakter.');
  if (data.password.length < 8) return markInvalid(f, 'password', 'Password minimal 8 karakter.');
  if (data.password !== data.confirm) return markInvalid(f, 'confirm', 'Konfirmasi password tidak sama.');

  withLoader(() => {
    const res = Auth.register(data);
    if (!res.ok) {
      if (res.field) markInvalid(f, res.field, res.error);
      else setAlert('regAlert', 'error', res.error);
      return;
    }
    pendingLoginUsername = data.username;
    toast('Registrasi berhasil. Silakan login dengan akun baru kamu.', 'success');
    navigate('/login');
  });
}

/* ---------------- Admin login (separate) ---------------- */
function renderAdminLogin() {
  document.getElementById('siteHeader').innerHTML = '';
  document.getElementById('siteFooter').innerHTML = '';
  document.getElementById('app').innerHTML = `
  <div class="auth" style="grid-template-columns:1fr;background:linear-gradient(160deg,#1b382b,#244c3a)">
    <section style="display:grid;place-items:center;padding:40px 20px;min-height:100vh">
      <div class="auth-card" style="background:#fff;padding:30px;border-radius:22px;box-shadow:var(--shadow-lg)">
        <a class="brand" href="#/" style="font-size:24px;margin-bottom:22px"><span class="brand-mark">↻</span> ReUse <span class="admin-tag" style="background:var(--soft);color:var(--forest)">ADMIN</span></a>
        <h1 style="font-size:26px">Admin Login</h1>
        <p class="lead">Halaman khusus administrator. Akun seller dan customer tidak dapat masuk di sini.</p>
        <div class="alert" id="adminAlert"></div>
        <form onsubmit="handleAdminLogin(event)" novalidate>
          <div class="field"><label for="adminUser">Username administrator</label><input id="adminUser" name="username" autocomplete="username" placeholder="admin"></div>
          <div class="field"><label for="adminPw">Password</label>
            <div class="password-wrap">
              <input id="adminPw" name="password" type="password" placeholder="Password admin" autocomplete="current-password">
              <button type="button" class="password-toggle" onclick="togglePassword('adminPw', this)">Lihat</button>
            </div>
          </div>
          <button class="btn btn-primary btn-block" type="submit">Masuk ke Admin Dashboard</button>
        </form>
        <div class="demo-box"><strong>Kredensial demo</strong><div class="demo-account"><span>Administrator</span><code>admin / admin123</code><button type="button" onclick="fillAdminLogin()">Isi</button></div></div>
        <p class="swap"><a href="#/login">← Login pengguna biasa</a> · <a href="#/">Beranda</a></p>
        <div class="hint" style="margin-top:14px">Demo frontend: kredensial ini tersimpan di browser. Untuk produksi, autentikasi admin wajib divalidasi backend dengan password ter-hash.</div>
      </div>
    </section>
  </div>`;
}

function fillAdminLogin() {
  document.getElementById('adminUser').value = 'admin';
  document.getElementById('adminPw').value = 'admin123';
}

function handleAdminLogin(e) {
  e.preventDefault();
  const f = e.target;
  clearAlert('adminAlert');
  withLoader(() => {
    const res = Auth.login(f.username.value, f.password.value);
    if (!res.ok) { setAlert('adminAlert', 'error', res.error); return; }
    if (res.user.role !== 'admin') {
      DB.saveSession(null);
      setAlert('adminAlert', 'error', 'Akun ini bukan administrator. Gunakan halaman login pengguna.');
      return;
    }
    toast('Login administrator berhasil.', 'success');
    navigate('/admin');
  });
}

/* ---------------- Forgot password (demo reset) ---------------- */
function openForgotPassword() {
  openModal(`
    <h2>Lupa Password</h2>
    <p class="modal-sub">Masukkan email akun kamu. Pada prototype ini password akan langsung direset tanpa verifikasi email.</p>
    <div class="alert" id="forgotAlert"></div>
    <form onsubmit="handleForgotPassword(event)">
      <div class="field"><label>Email terdaftar</label><input name="email" type="email" placeholder="nama@email.com" required></div>
      <div class="field"><label>Password baru</label><input name="password" type="password" placeholder="Minimal 8 karakter" required></div>
      <div class="field"><label>Konfirmasi password baru</label><input name="confirm" type="password" placeholder="Ulangi password" required></div>
      <button class="btn btn-primary btn-block" type="submit">Simpan Password Baru</button>
    </form>
    <div class="hint warn">Demo saja: pada produksi gunakan tautan reset berbatas waktu yang dikirim ke email pengguna.</div>
  `, 'small');
}

function handleForgotPassword(e) {
  e.preventDefault();
  const f = e.target;
  const email = f.email.value.trim().toLowerCase();
  const password = f.password.value;
  const users = DB.users();
  const user = users.find(u => u.email.toLowerCase() === email);
  if (!user) return setAlert('forgotAlert', 'error', 'Email tidak ditemukan pada akun ReUse.');
  if (password.length < 8) return setAlert('forgotAlert', 'error', 'Password baru minimal 8 karakter.');
  if (password !== f.confirm.value) return setAlert('forgotAlert', 'error', 'Konfirmasi password tidak sama.');
  user.passwordHash = hashPassword(password);
  DB.saveUsers(users);
  closeModal();
  toast('Password berhasil direset. Silakan login.', 'success');
}

/* ---------------- Logout ---------------- */
function requestLogout() {
  const user = Auth.currentUser();
  if (!user) { navigate('/login'); return; }
  confirmDialog({
    title: 'Keluar dari akun?',
    message: 'Kamu akan keluar dari akun ' + user.name + '. Data produk, akun, dan marketplace tetap tersimpan.',
    confirmText: 'Ya, Logout',
    cancelText: 'Batal',
    danger: true
  }).then(ok => {
    if (!ok) return;
    Auth.logout();
    closeProfileMenu();
    toast('Logout berhasil. Sampai jumpa lagi!', 'info');
    navigate('/');
    renderHeader();
  });
}

/* ---------------- Profile page ---------------- */
let pendingAvatar = null;

function renderProfile() {
  const user = Auth.currentUser();
  if (!user) { navigate('/login'); return; }
  pendingAvatar = null;
  const roleLabel = user.role === 'admin' ? 'Administrator' : user.role === 'seller' ? 'Seller' : 'Customer';
  const myProducts = DB.products().filter(p => p.sellerId === user.id);
  document.getElementById('app').innerHTML = `
  <div class="page"><div class="container">
    <div class="page-head">
      <div><span class="kicker">ACCOUNT SETTINGS</span><h1>Profil Saya</h1><p class="sub">Kelola informasi akun dan keamanan kamu.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${user.role === 'seller' ? `<a class="btn btn-light btn-sm" href="#/seller">Seller Dashboard</a>` : ''}
        ${user.role === 'admin' ? `<a class="btn btn-light btn-sm" href="#/admin">Admin Dashboard</a>` : ''}
        <button class="btn btn-outline btn-sm" onclick="requestLogout()">Logout</button>
      </div>
    </div>
    <div class="profile-layout">
      <div class="card profile-card">
        ${avatarHtml(user, 'lg')}
        <h2>${safe(user.name)}</h2>
        <div class="small">@${safe(user.username)}</div>
        <div class="role"><span class="badge ${user.role === 'seller' ? 'badge-approved' : user.role === 'admin' ? 'badge-sold' : 'badge-pending'}">${roleLabel}</span>
        <span class="badge ${user.status === 'active' ? 'badge-approved' : 'badge-rejected'}">${user.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></div>
        <div class="profile-facts">
          <div><span>Email</span><b style="word-break:break-all;text-align:right">${safe(user.email)}</b></div>
          <div><span>WhatsApp</span><b>${safe(user.phone)}</b></div>
          <div><span>Lokasi</span><b>${safe(user.location)}</b></div>
          <div><span>Bergabung</span><b>${fmtDate(user.createdAt)}</b></div>
          ${user.role === 'seller' ? `<div><span>Produk</span><b>${myProducts.length}</b></div>` : ''}
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <label class="btn btn-light btn-sm" style="cursor:pointer">Ganti Foto<input type="file" accept="image/*" onchange="onAvatarChange(event)" style="display:none"></label>
          ${user.avatar ? `<button class="btn btn-outline btn-sm" onclick="removeAvatar()">Hapus Foto</button>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="tabs">
          <button class="tab active" data-ptab="info" onclick="showProfileTab('info')">Informasi Profil</button>
          <button class="tab" data-ptab="security" onclick="showProfileTab('security')">Keamanan</button>
        </div>
        <div id="profileTabBody">${profileInfoForm(user)}</div>
      </div>
    </div>
  </div></div>`;
}

function profileInfoForm(user) {
  return `
    <div class="alert" id="profileAlert"></div>
    <form onsubmit="saveProfile(event)" novalidate>
      <div class="form-row">
        <div class="field"><label>Nama lengkap</label><input name="name" value="${safe(user.name)}"></div>
        <div class="field"><label>Username</label><input name="username" value="${safe(user.username)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Email</label><input name="email" type="email" value="${safe(user.email)}"></div>
        <div class="field"><label>Nomor WhatsApp</label><input name="phone" value="${safe(user.phone)}"></div>
      </div>
      <div class="field"><label>Lokasi</label><input name="location" value="${safe(user.location)}"></div>
      <div class="field"><label>Jenis akun</label><input value="${user.role === 'seller' ? 'Seller' : user.role === 'admin' ? 'Administrator' : 'Customer'}" disabled></div>
      <div class="small">Jenis akun tidak dapat diubah sendiri. Status akun: <b>${user.status === 'active' ? 'Aktif' : 'Nonaktif'}</b>.</div>
      <div class="modal-actions" style="justify-content:flex-start">
        <button class="btn btn-primary" type="submit">Simpan Perubahan</button>
        <button class="btn btn-outline" type="button" onclick="renderProfile()">Reset</button>
      </div>
    </form>`;
}

function showProfileTab(tab) {
  const user = Auth.currentUser();
  if (!user) return;
  document.querySelectorAll('[data-ptab]').forEach(b => b.classList.toggle('active', b.dataset.ptab === tab));
  const body = document.getElementById('profileTabBody');
  if (tab === 'security') {
    body.innerHTML = `
      <div class="alert" id="passwordAlert"></div>
      <form onsubmit="changePassword(event)" novalidate>
        <div class="field"><label>Password saat ini</label><input name="current" type="password" autocomplete="current-password"></div>
        <div class="form-row">
          <div class="field"><label>Password baru</label><input name="next" type="password" placeholder="Minimal 8 karakter" autocomplete="new-password"></div>
          <div class="field"><label>Konfirmasi password baru</label><input name="confirm" type="password" autocomplete="new-password"></div>
        </div>
        <button class="btn btn-primary" type="submit">Ganti Password</button>
      </form>
      <div class="hint">Sesi demo ini tersimpan di localStorage browser. Setelah logout, halaman dashboard tidak dapat dibuka kembali tanpa login.</div>`;
  } else {
    body.innerHTML = profileInfoForm(user);
  }
}

function onAvatarChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('File harus berupa gambar.', 'error'); return; }
  if (file.size > 400 * 1024) { toast('Ukuran foto maksimal 400 KB.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    pendingAvatar = reader.result;
    const user = Auth.currentUser();
    const users = DB.users();
    const idx = users.findIndex(u => u.id === user.id);
    users[idx].avatar = pendingAvatar;
    DB.saveUsers(users);
    toast('Foto profil diperbarui.', 'success');
    renderProfile();
    renderHeader();
  };
  reader.readAsDataURL(file);
}

function removeAvatar() {
  const user = Auth.currentUser();
  const users = DB.users();
  const idx = users.findIndex(u => u.id === user.id);
  users[idx].avatar = '';
  DB.saveUsers(users);
  toast('Foto profil dihapus.', 'info');
  renderProfile();
  renderHeader();
}

function saveProfile(e) {
  e.preventDefault();
  const f = e.target;
  const current = Auth.currentUser();
  const users = DB.users();
  const idx = users.findIndex(u => u.id === current.id);
  const name = f.name.value.trim();
  const username = f.username.value.trim();
  const email = f.email.value.trim().toLowerCase();
  const phone = f.phone.value.trim();
  const location = f.location.value.trim();
  clearAlert('profileAlert');
  if (name.length < 3) return setAlert('profileAlert', 'error', 'Nama lengkap minimal 3 karakter.');
  if (!/^[a-zA-Z0-9._]{3,20}$/.test(username)) return setAlert('profileAlert', 'error', 'Username 3–20 karakter, hanya huruf, angka, titik, atau garis bawah.');
  if (users.some((u, i) => i !== idx && u.username.toLowerCase() === username.toLowerCase())) return setAlert('profileAlert', 'error', 'Username sudah digunakan akun lain.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setAlert('profileAlert', 'error', 'Format email tidak valid.');
  if (users.some((u, i) => i !== idx && u.email.toLowerCase() === email)) return setAlert('profileAlert', 'error', 'Email sudah digunakan akun lain.');
  if (!/^\+?\d{9,15}$/.test(phone.replace(/[\s-]/g, ''))) return setAlert('profileAlert', 'error', 'Nomor WhatsApp harus 9–15 digit.');
  if (location.length < 3) return setAlert('profileAlert', 'error', 'Lokasi minimal 3 karakter.');

  users[idx] = Object.assign({}, users[idx], { name, username, email, phone, location });
  DB.saveUsers(users);
  // Keep product phone in sync so checkout always reaches the seller
  const products = DB.products();
  let changed = false;
  products.forEach(p => { if (p.sellerId === current.id) { p.phone = phone; changed = true; } });
  if (changed) DB.saveProducts(products);
  toast('Profil berhasil diperbarui.', 'success');
  renderProfile();
  renderHeader();
}

function changePassword(e) {
  e.preventDefault();
  const f = e.target;
  const user = Auth.currentUser();
  clearAlert('passwordAlert');
  if (hashPassword(f.current.value) !== user.passwordHash) return setAlert('passwordAlert', 'error', 'Password saat ini salah.');
  if (f.next.value.length < 8) return setAlert('passwordAlert', 'error', 'Password baru minimal 8 karakter.');
  if (f.next.value !== f.confirm.value) return setAlert('passwordAlert', 'error', 'Konfirmasi password tidak sama.');
  const users = DB.users();
  const idx = users.findIndex(u => u.id === user.id);
  users[idx].passwordHash = hashPassword(f.next.value);
  DB.saveUsers(users);
  f.reset();
  toast('Password berhasil diperbarui.', 'success');
}
