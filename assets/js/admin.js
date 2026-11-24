/* ============================================================
   ReUse v2.0 — Administrator dashboard
   ============================================================ */
const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Overview', icon: '▤' },
  { key: 'products', label: 'Products', icon: '▦' },
  { key: 'users', label: 'Users', icon: '♙' },
  { key: 'categories', label: 'Categories', icon: '◇' },
  { key: 'reports', label: 'Reports', icon: '⚑' },
  { key: 'logs', label: 'Activity Log', icon: '◷' }
];
let adminProductFilters = { q: '', category: '', status: '' };
let adminUserFilters = { q: '', role: '' };

function requireAdmin() {
  const user = Auth.currentUser();
  if (!user || user.role !== 'admin') {
    toast('Akses ditolak. Halaman ini hanya untuk administrator.', 'error');
    navigate('/login');
    return null;
  }
  return user;
}

function adminGo(section) {
  const side = document.getElementById('adminSide');
  if (side) side.classList.remove('show');
  navigate(section === 'overview' ? '/admin' : '/admin/' + section);
}
function toggleAdminSide() {
  const side = document.getElementById('adminSide');
  if (side) side.classList.toggle('show');
}

function renderAdmin(path) {
  const admin = requireAdmin();
  if (!admin) return;
  const segment = (path.split('/')[2] || 'overview');
  const section = ADMIN_SECTIONS.some(s => s.key === segment) ? segment : 'overview';
  const title = (ADMIN_SECTIONS.find(s => s.key === section) || {}).label || 'Overview';

  document.getElementById('app').innerHTML = `
  <div class="admin">
    <aside class="admin-side" id="adminSide">
      <a class="admin-brand" href="#/admin"><span class="brand-mark">↻</span> ReUse <span class="admin-tag">ADMIN</span></a>
      <nav class="admin-nav">
        ${ADMIN_SECTIONS.map(s => `<button class="${section === s.key ? 'active' : ''}" onclick="adminGo('${s.key}')"><span>${s.icon}</span> ${s.label}</button>`).join('')}
        <div class="sep"></div>
        <button onclick="navigate('/')"><span>⌂</span> Lihat Website</button>
      </nav>
      <div class="admin-side-foot">
        <div style="display:flex;gap:8px;align-items:center;padding:0 8px 8px">
          ${avatarHtml(admin)}
          <div><strong style="color:#fff;font-size:12px;display:block">${safe(admin.name)}</strong><span>Administrator</span></div>
        </div>
        <button onclick="requestLogout()">↩ Logout</button>
      </div>
    </aside>
    <div class="admin-main">
      <div class="admin-top">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="admin-mobile-toggle" onclick="toggleAdminSide()" aria-label="Menu admin">☰</button>
          <div><div class="crumb">Admin / ${title}</div><h1>${title}</h1></div>
        </div>
        <div class="admin-user">
          <span class="badge badge-approved">Session aktif</span>
          <span>${safe(admin.username)}</span>
          ${avatarHtml(admin)}
        </div>
      </div>
      <div class="admin-content" id="adminContent">
        ${adminContent(section)}
      </div>
    </div>
  </div>`;
}

function adminContent(section) {
  if (section === 'products') return adminProductsHtml();
  if (section === 'users') return adminUsersHtml();
  if (section === 'categories') return adminCategoriesHtml();
  if (section === 'reports') return adminReportsHtml();
  if (section === 'logs') return adminLogsHtml();
  return adminOverviewHtml();
}

/* ---------------- Overview ---------------- */
function adminOverviewHtml() {
  const users = DB.users();
  const products = DB.products();
  const reports = DB.reports();
  const members = users.filter(u => u.role !== 'admin');
  const withProducts = members.filter(u => products.some(p => p.sellerId === u.id));
  const active = products.filter(p => p.status === 'approved');
  const pending = products.filter(p => p.status === 'pending');
  const rejected = products.filter(p => p.status === 'rejected');
  const openReports = reports.filter(r => r.status === 'open' || r.status === 'under_review');
  const stat = (icon, label, value, cls) => `<div class="stat ${cls || ''}"><div class="stat-icon">${icon}</div><div><b>${value}</b><span>${label}</span></div></div>`;

  return `
    <div class="admin-section-title"><div><h2>Ringkasan Marketplace</h2><p>Statistik dihitung langsung dari data yang tersimpan di marketplace.</p></div>
      <span class="small">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    <div class="stat-grid stats-4">
      ${stat('♙', 'Total Users', users.length)}
      ${stat('☺', 'Total Members', members.length)}
      ${stat('↗', 'Penjual Aktif', withProducts.length)}
      ${stat('▦', 'Total Products', products.length)}
      ${stat('✓', 'Active Products', active.length, 'ok')}
      ${stat('◷', 'Pending Products', pending.length, 'warn')}
      ${stat('✕', 'Rejected Products', rejected.length, 'danger')}
      ${stat('⚑', 'Total Reports', reports.length, reports.length ? 'warn' : '')}
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <h3>Pertumbuhan Pengguna</h3>
        <p class="chart-sub">Jumlah akun kumulatif per bulan (6 bulan terakhir)</p>
        ${userGrowthChart()}
      </div>
      <div class="chart-card">
        <h3>Partisipasi Menjual</h3>
        <p class="chart-sub">Member yang sudah memasang produk vs belum</p>
        ${donutChart(withProducts.length, members.length - withProducts.length)}
      </div>
      <div class="chart-card">
        <h3>Produk per Kategori</h3>
        <p class="chart-sub">Seluruh produk termasuk yang belum disetujui</p>
        ${categoryBars()}
      </div>
      <div class="chart-card">
        <h3>Aktivitas Penambahan Produk</h3>
        <p class="chart-sub">Produk baru dalam 7 hari terakhir</p>
        ${additionBars()}
      </div>
    </div>

    <div class="chart-grid" style="grid-template-columns:1fr 1fr">
      <div class="chart-card">
        <h3>Menunggu Persetujuan (${pending.length})</h3>
        <p class="chart-sub">Produk baru dari seller yang perlu dimoderasi.</p>
        ${pending.length ? pending.slice(0, 4).map(p => {
          const seller = DB.userById(p.sellerId);
          return `<div class="cart-row">
            <img src="${safe(productImage(p))}" alt="${safe(p.name)}">
            <div class="cart-row-info"><strong>${safe(p.name)}</strong><small>${safe(seller ? seller.name : '-')} · ${rupiah(p.price)}</small></div>
            <div class="row-actions"><button class="btn btn-primary btn-sm" onclick="approveProduct('${p.id}')">Setujui</button>
              <button class="btn btn-outline btn-sm" onclick="openRejectProduct('${p.id}')">Tolak</button></div>
          </div>`;
        }).join('') : '<div class="empty" style="padding:26px">Tidak ada produk menunggu persetujuan.</div>'}
        <button class="btn btn-light btn-sm" style="margin-top:12px" onclick="adminGo('products')">Kelola semua produk</button>
      </div>
      <div class="chart-card">
        <h3>Laporan Aktif (${openReports.length})</h3>
        <p class="chart-sub">Laporan pembeli yang belum selesai ditangani.</p>
        ${openReports.length ? openReports.slice(0, 4).map(r => {
          const p = r.productId ? DB.productById(r.productId) : null;
          const reporter = DB.userById(r.reporterId);
          return `<div class="cart-row">
            <div class="cart-row-info"><strong>${safe(r.reason)}</strong><small>${safe(p ? p.name : 'Produk dihapus')} · oleh ${safe(reporter ? reporter.name : 'Pengguna')}</small></div>
            <button class="btn btn-light btn-sm" onclick="adminGo('reports')">Tinjau</button>
          </div>`;
        }).join('') : '<div class="empty" style="padding:26px">Tidak ada laporan aktif.</div>'}
        <button class="btn btn-light btn-sm" style="margin-top:12px" onclick="adminGo('reports')">Buka Report Management</button>
      </div>
    </div>

    <div class="chart-card" style="margin-top:14px">
      <h3>Aktivitas Administrator Terbaru</h3>
      <p class="chart-sub">Catatan tindakan admin tersimpan pada Activity Log.</p>
      ${recentLogsHtml(4)}
    </div>`;
}

function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

function userGrowthChart() {
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: monthKey(d), label: d.toLocaleDateString('id-ID', { month: 'short' }), count: 0 });
  }
  DB.users().forEach(u => {
    const d = new Date(u.createdAt);
    if (isNaN(d)) return;
    const b = buckets.find(x => x.key === monthKey(d));
    if (b) b.count += 1;
  });
  const before = DB.users().filter(u => {
    const d = new Date(u.createdAt);
    return !isNaN(d) && d < new Date(now.getFullYear(), now.getMonth() - 5, 1);
  }).length;
  let run = before;
  buckets.forEach(b => { run += b.count; b.total = run; });
  const w = 520, h = 190, padL = 34, padR = 12, padT = 16, padB = 26;
  const max = Math.max(1, ...buckets.map(b => b.total));
  const stepX = (w - padL - padR) / (buckets.length - 1 || 1);
  const pts = buckets.map((b, i) => [padL + i * stepX, h - padB - (b.total / max) * (h - padT - padB)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${pts[pts.length - 1][0].toFixed(1)} ${h - padB} L ${pts[0][0].toFixed(1)} ${h - padB} Z`;
  const grid = [0, .25, .5, .75, 1].map(f => {
    const y = padT + f * (h - padT - padB);
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="#eef0e7" stroke-width="1"/>`;
  }).join('');
  const labels = buckets.map((b, i) => `<text x="${pts[i][0].toFixed(1)}" y="${h - 8}" font-size="9.5" fill="#8b938a" text-anchor="middle">${escapeSvg(b.label)}</text>`).join('');
  const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4" fill="#fff" stroke="#244c3a" stroke-width="2"><title>${escapeSvg(buckets[i].label)}: ${buckets[i].total} akun</title></circle>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik pertumbuhan pengguna" style="width:100%;height:auto">
    ${grid}
    <path d="${area}" fill="#6d9b7822"/>
    <path d="${line}" fill="none" stroke="#244c3a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}
    <text x="${padL}" y="11" font-size="9.5" fill="#8b938a">${max} akun</text>
  </svg>`;
}
function escapeSvg(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function donutChart(withProducts, withoutProducts) {
  const total = withProducts + withoutProducts || 1;
  const r = 54, c = 2 * Math.PI * r;
  const a = (withProducts / total) * c;
  return `<div class="donut-wrap">
    <svg width="144" height="144" viewBox="0 0 144 144" role="img" aria-label="Perbandingan member yang punya produk dan belum">
      <circle cx="72" cy="72" r="${r}" fill="none" stroke="#e9efe8" stroke-width="18"/>
      ${withProducts ? `<circle cx="72" cy="72" r="${r}" fill="none" stroke="#244c3a" stroke-width="18" stroke-dasharray="${a.toFixed(2)} ${(c - a).toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 72 72)"/>` : ''}
      ${withoutProducts ? `<circle cx="72" cy="72" r="${r}" fill="none" stroke="#6d9b78" stroke-width="18" stroke-dasharray="${(c - a).toFixed(2)} ${a.toFixed(2)}" stroke-dashoffset="${(-a).toFixed(2)}" transform="rotate(-90 72 72)"/>` : ''}
      <text x="72" y="69" text-anchor="middle" font-size="22" font-weight="800" fill="#244c3a">${withProducts + withoutProducts}</text>
      <text x="72" y="86" text-anchor="middle" font-size="10" fill="#73786f">member</text>
    </svg>
    <div class="legend">
      <div><span style="background:#244c3a"></span>Punya produk <b>${withProducts}</b> (${Math.round(withProducts / total * 100)}%)</div>
      <div><span style="background:#6d9b78"></span>Belum punya produk <b>${withoutProducts}</b> (${Math.round(withoutProducts / total * 100)}%)</div>
      <div><span style="background:#e9efe8"></span>Administrator <b>${DB.users().filter(u => u.role === 'admin').length}</b></div>
    </div>
  </div>`;
}

function categoryBars() {
  const products = DB.products();
  if (!products.length) return '<div class="chart-empty">Belum ada produk.</div>';
  const cats = DB.categories().map(c => ({ name: c.name, count: products.filter(p => p.category === c.name).length }));
  const max = Math.max(1, ...cats.map(c => c.count));
  return cats.map(c => `<div class="bar-row">
    <span title="${safe(c.name)}">${safe(c.name.length > 18 ? c.name.slice(0, 17) + '…' : c.name)}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${(c.count / max * 100).toFixed(1)}%"></div></div>
    <b style="color:var(--forest)">${c.count}</b>
  </div>`).join('');
}

function additionBars() {
  const products = DB.products();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }), key: d.toDateString(), count: 0 });
  }
  products.forEach(p => {
    const d = new Date(p.createdAt);
    const b = days.find(x => x.key === d.toDateString());
    if (b) b.count += 1;
  });
  const max = Math.max(1, ...days.map(d => d.count));
  return days.map(d => `<div class="bar-row">
    <span>${escapeSvg(d.label)}</span>
    <div class="bar-track"><div class="bar-fill alt" style="width:${(d.count / max * 100).toFixed(1)}%"></div></div>
    <b style="color:var(--forest)">${d.count}</b>
  </div>`).join('');
}

/* ---------------- Admin products ---------------- */
function adminProductsHtml() {
  const cats = DB.categories();
  return `
    <div class="admin-section-title"><div><h2>Product Management</h2><p>Setujui, tolak, nonaktifkan, atau hapus produk marketplace.</p></div>
      <span class="small" id="adminProductCount"></span></div>
    <div class="admin-table-tools">
      <div class="search"><span>⌕</span><input id="adminProductSearch" type="search" value="${safe(adminProductFilters.q)}" placeholder="Cari nama produk atau penjual..." oninput="adminProductFilters.q=this.value;renderAdminProductTable()"></div>
      <select id="adminProductCategory" onchange="adminProductFilters.category=this.value;renderAdminProductTable()">
        <option value="">Semua kategori</option>
        ${cats.map(c => `<option value="${safe(c.name)}" ${adminProductFilters.category === c.name ? 'selected' : ''}>${safe(c.name)}</option>`).join('')}
      </select>
      <select id="adminProductStatus" onchange="adminProductFilters.status=this.value;renderAdminProductTable()">
        <option value="">Semua status</option>
        ${PRODUCT_STATUSES.map(s => `<option value="${s}" ${adminProductFilters.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
      </select>
    </div>
    <div id="adminProductTable">${adminProductTableHtml()}</div>`;
}

function adminFilteredProducts() {
  let list = DB.products();
  const q = adminProductFilters.q.toLowerCase().trim();
  if (q) {
    list = list.filter(p => {
      const seller = DB.userById(p.sellerId);
      return (p.name + ' ' + p.category + ' ' + (seller ? seller.name + ' ' + seller.username : '')).toLowerCase().includes(q);
    });
  }
  if (adminProductFilters.category) list = list.filter(p => p.category === adminProductFilters.category);
  if (adminProductFilters.status) list = list.filter(p => p.status === adminProductFilters.status);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderAdminProductTable() {
  const el = document.getElementById('adminProductTable');
  if (!el) return;
  el.innerHTML = adminProductTableHtml();
}

function adminProductTableHtml() {
  const list = adminFilteredProducts();
  const counter = document.getElementById('adminProductCount');
  if (counter) counter.textContent = list.length + ' produk';
  if (!list.length) return `<div class="table-wrap"><div class="empty" style="padding:40px">Tidak ada produk pada filter ini.</div></div>`;
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Produk</th><th>Pemilik</th><th>Kategori</th><th>Harga</th><th>Status</th><th>Diunggah</th><th>Aksi</th></tr></thead>
    <tbody>${list.map(p => {
      const seller = DB.userById(p.sellerId);
      return `<tr>
        <td><div class="cell-product">
          <img src="${safe(productImage(p))}" alt="${safe(p.name)}" onerror="this.src='${PLACEHOLDER}'">
          <div><strong>${safe(p.name)}</strong><small>${safe(p.condition)}${p.sold ? ' · Terjual' : ''}</small></div>
        </div></td>
        <td><strong style="font-size:12.5px">${safe(seller ? seller.name : 'Tidak diketahui')}</strong><div class="small">@${safe(seller ? seller.username : '-')}</div></td>
        <td>${safe(p.category)}</td>
        <td style="font-weight:800;color:var(--forest);white-space:nowrap">${rupiah(p.price)}</td>
        <td>${statusBadge(p.status, p.sold)}${p.status === 'rejected' && p.rejectionReason ? `<div class="small" style="color:var(--danger);max-width:190px;margin-top:4px">${safe(p.rejectionReason)}</div>` : ''}</td>
        <td style="white-space:nowrap">${fmtDate(p.createdAt)}</td>
        <td><div class="row-actions">
          <button class="btn btn-light btn-sm" onclick="showDetail('${p.id}')">Detail</button>
          ${p.status !== 'approved' ? `<button class="btn btn-primary btn-sm" onclick="approveProduct('${p.id}')">Setujui</button>` : ''}
          ${p.status !== 'rejected' ? `<button class="btn btn-outline btn-sm" onclick="openRejectProduct('${p.id}')">Tolak</button>` : ''}
          ${p.status !== 'removed' ? `<button class="btn btn-outline btn-sm" onclick="removeProductAdmin('${p.id}')">Nonaktifkan</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteProductAdmin('${p.id}')">Hapus</button>
        </div></td>
      </tr>`;
    }).join('')}</tbody></table></div>
    <p class="small" style="margin-top:10px">Produk <b>Approved</b> langsung tampil di katalog publik. Produk <b>Pending</b> dan <b>Rejected</b> tidak tampil.</p>`;
}

function approveProduct(id) {
  const admin = requireAdmin();
  const p = DB.productById(id);
  if (!admin || !p) return;
  const products = DB.products();
  const idx = products.findIndex(x => x.id === id);
  products[idx].status = 'approved';
  products[idx].rejectionReason = '';
  products[idx].updatedAt = new Date().toISOString();
  DB.saveProducts(products);
  logAdmin('approve_product', 'Menyetujui produk "' + p.name + '" milik ' + ((DB.userById(p.sellerId) || {}).name || 'seller') + '.');
  toast('Produk berhasil disetujui dan tampil di katalog.', 'success');
  renderAdmin(location.hash.replace(/^#/, '') || '/admin');
  refreshGrids();
}

function openRejectProduct(id) {
  const admin = requireAdmin();
  const p = DB.productById(id);
  if (!admin || !p) return;
  openModal(`
    <h2>Tolak Produk</h2>
    <p class="modal-sub">"${safe(p.name)}" akan ditolak dan tidak tampil di katalog. Seller dapat melihat alasan penolakan.</p>
    <div class="alert" id="rejectAlert"></div>
    <form onsubmit="submitRejectProduct(event, '${id}')">
      <div class="field"><label>Alasan penolakan</label><textarea name="reason" placeholder="Contoh: Foto produk tidak jelas dan deskripsi tidak lengkap." required></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" type="submit">Tolak Produk</button>
      </div>
    </form>`, 'small');
}
function submitRejectProduct(e, id) {
  e.preventDefault();
  const admin = requireAdmin();
  if (!admin) return;
  const reason = e.target.reason.value.trim();
  if (reason.length < 5) { setAlert('rejectAlert', 'error', 'Alasan penolakan minimal 5 karakter.'); return; }
  const products = DB.products();
  const idx = products.findIndex(x => x.id === id);
  if (idx < 0) return;
  products[idx].status = 'rejected';
  products[idx].rejectionReason = reason;
  products[idx].updatedAt = new Date().toISOString();
  DB.saveProducts(products);
  logAdmin('reject_product', 'Menolak produk "' + products[idx].name + '". Alasan: ' + reason);
  closeModal();
  toast('Produk ditolak. Seller dapat melihat alasannya.', 'info');
  renderAdmin(location.hash.replace(/^#/, '') || '/admin');
  refreshGrids();
}

function removeProductAdmin(id) {
  const admin = requireAdmin();
  const p = DB.productById(id);
  if (!admin || !p) return;
  confirmDialog({
    title: 'Nonaktifkan produk?',
    message: '"' + p.name + '" akan berstatus Removed dan hilang dari katalog publik, tetapi datanya tetap tersimpan untuk audit.',
    confirmText: 'Nonaktifkan',
    danger: true
  }).then(ok => {
    if (!ok) return;
    const products = DB.products();
    const idx = products.findIndex(x => x.id === id);
    products[idx].status = 'removed';
    products[idx].updatedAt = new Date().toISOString();
    DB.saveProducts(products);
    logAdmin('remove_product', 'Menonaktifkan produk "' + p.name + '".');
    toast('Produk dinonaktifkan.', 'info');
    renderAdmin(location.hash.replace(/^#/, '') || '/admin');
    refreshGrids();
    syncCounts();
  });
}

function deleteProductAdmin(id) {
  const admin = requireAdmin();
  const p = DB.productById(id);
  if (!admin || !p) return;
  confirmDialog({
    title: 'Hapus produk permanen?',
    message: '"' + p.name + '" akan dihapus dari seluruh data marketplace, termasuk wishlist dan keranjang pengguna.',
    confirmText: 'Hapus Permanen',
    danger: true
  }).then(ok => {
    if (!ok) return;
    removeProductEverywhere(id);
    logAdmin('delete_product', 'Menghapus permanen produk "' + p.name + '".');
    toast('Produk berhasil dihapus.', 'success');
    renderAdmin(location.hash.replace(/^#/, '') || '/admin');
    refreshGrids();
    syncCounts();
  });
}

/* ---------------- Admin users ---------------- */
function adminUsersHtml() {
  return `
    <div class="admin-section-title"><div><h2>User Management</h2><p>Lihat seluruh akun terdaftar dan atur statusnya.</p></div>
      <span class="small" id="adminUserCount"></span></div>
    <div class="admin-table-tools">
      <div class="search"><span>⌕</span><input id="adminUserSearch" type="search" value="${safe(adminUserFilters.q)}" placeholder="Cari nama, username, atau email..." oninput="adminUserFilters.q=this.value;renderAdminUserTable()"></div>
      <select onchange="adminUserFilters.role=this.value;renderAdminUserTable()">
        <option value="">Semua role</option>
        <option value="member" ${adminUserFilters.role === 'member' ? 'selected' : ''}>Member</option>
        <option value="admin" ${adminUserFilters.role === 'admin' ? 'selected' : ''}>Administrator</option>
      </select>
    </div>
    <div id="adminUserTable">${adminUserTableHtml()}</div>`;
}

function adminFilteredUsers() {
  let list = DB.users();
  const q = adminUserFilters.q.toLowerCase().trim();
  if (q) list = list.filter(u => (u.name + ' ' + u.username + ' ' + u.email).toLowerCase().includes(q));
  if (adminUserFilters.role) list = list.filter(u => u.role === adminUserFilters.role);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function renderAdminUserTable() {
  const el = document.getElementById('adminUserTable');
  if (!el) return;
  el.innerHTML = adminUserTableHtml();
}
function adminUserTableHtml() {
  const list = adminFilteredUsers();
  const counter = document.getElementById('adminUserCount');
  if (counter) counter.textContent = list.length + ' akun';
  if (!list.length) return '<div class="table-wrap"><div class="empty" style="padding:40px">Tidak ada akun pada filter ini.</div></div>';
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Pengguna</th><th>Email</th><th>WhatsApp</th><th>Role</th><th>Registrasi</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${list.map(u => `
      <tr>
        <td><div class="cell-product">${avatarHtml(u)}<div><strong>${safe(u.name)}</strong><small>@${safe(u.username)} · ${safe(u.location)}</small></div></div></td>
        <td>${safe(u.email)}</td>
        <td style="white-space:nowrap">${safe(u.phone)}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-sold' : 'badge-approved'}">${u.role === 'admin' ? 'Administrator' : 'Member'}</span></td>
        <td style="white-space:nowrap">${fmtDate(u.createdAt)}</td>
        <td><span class="badge ${u.status === 'active' ? 'badge-approved' : 'badge-rejected'}">${u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
        <td><div class="row-actions">
          <button class="btn btn-light btn-sm" onclick="openAdminUser('${u.id}')">Detail</button>
          ${u.role === 'admin'
            ? '<button class="btn btn-outline btn-sm" disabled title="Akun administrator dilindungi">Dilindungi</button>'
            : (u.status === 'active'
              ? `<button class="btn btn-danger btn-sm" onclick="toggleUserStatus('${u.id}')">Nonaktifkan</button>`
              : `<button class="btn btn-primary btn-sm" onclick="toggleUserStatus('${u.id}')">Aktifkan</button>`)}
        </div></td>
      </tr>`).join('')}</tbody></table></div>`;
}

function openAdminUser(id) {
  if (!requireAdmin()) return;
  const u = DB.userById(id);
  if (!u) return;
  const products = DB.products().filter(p => p.sellerId === id);
  openModal(`
    <div style="display:flex;gap:14px;align-items:center">${avatarHtml(u, 'lg')}
      <div><h2 style="margin:0">${safe(u.name)}</h2><div class="small">@${safe(u.username)}</div>
        <span class="badge ${u.role === 'admin' ? 'badge-sold' : 'badge-approved'}">${u.role === 'admin' ? 'Administrator' : 'Member'}</span></div>
    </div>
    <div class="meta-list">
      <div><b>Email:</b> ${safe(u.email)}</div>
      <div><b>WhatsApp:</b> ${safe(u.phone)}</div>
      <div><b>Lokasi:</b> ${safe(u.location)}</div>
      <div><b>Terdaftar:</b> ${fmtDate(u.createdAt)}</div>
      <div><b>Status akun:</b> ${u.status === 'active' ? 'Aktif' : 'Nonaktif'}</div>
      <div><b>Total produk:</b> ${products.length} (${products.filter(p => p.status === 'approved').length} approved)</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Tutup</button>
      ${u.role !== 'admin' ? `<button class="btn ${u.status === 'active' ? 'btn-danger' : 'btn-primary'}" onclick="toggleUserStatus('${u.id}');closeModal()">${u.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}</button>` : '<button class="btn btn-outline" disabled>Akun administrator dilindungi</button>'}
    </div>`, 'small');
}

function toggleUserStatus(id) {
  const admin = requireAdmin();
  if (!admin) return;
  const users = DB.users();
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) return;
  if (users[idx].role === 'admin') { toast('Akun administrator tidak dapat dinonaktifkan dari pengelolaan pengguna.', 'error'); return; }
  if (users[idx].id === admin.id) { toast('Kamu tidak dapat menonaktifkan akun sendiri.', 'error'); return; }
  const next = users[idx].status === 'active' ? 'inactive' : 'active';
  users[idx].status = next;
  DB.saveUsers(users);
  logAdmin(next === 'inactive' ? 'deactivate_user' : 'activate_user', (next === 'inactive' ? 'Menonaktifkan' : 'Mengaktifkan') + ' akun ' + users[idx].name + ' (@' + users[idx].username + ').');
  toast('Status akun ' + users[idx].name + ' diubah menjadi ' + (next === 'inactive' ? 'nonaktif' : 'aktif') + '.', 'success');
  renderAdmin(location.hash.replace(/^#/, '') || '/admin');
}

/* ---------------- Admin categories ---------------- */
function adminCategoriesHtml() {
  const cats = DB.categories();
  const products = DB.products();
  return `
    <div class="admin-section-title"><div><h2>Category Management</h2><p>Kategori yang tampil pada katalog dan form produk seller.</p></div>
      <button class="btn btn-primary btn-sm" onclick="openCategoryForm()">＋ Tambah Kategori</button></div>
    <div class="cat-cards">
      ${cats.length ? cats.map(c => {
        const used = products.filter(p => p.category === c.name).length;
        return `<div class="cat-card">
          <div class="top"><div><span class="emoji">${safe(c.icon)}</span><h3>${safe(c.name)}</h3><p>${used} produk menggunakan kategori ini</p></div></div>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" onclick="openCategoryForm('${c.id}')">Ubah Nama</button>
            <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">Hapus</button>
          </div>
        </div>`;
      }).join('') : '<div class="empty">Belum ada kategori.</div>'}
    </div>
    <div class="hint">Kategori yang masih digunakan produk tidak dihapus langsung: admin harus mengonfirmasi pemindahan produk ke kategori lain terlebih dahulu.</div>`;
}

function openCategoryForm(id) {
  if (!requireAdmin()) return;
  const cat = id ? DB.categories().find(c => c.id === id) : null;
  openModal(`
    <h2>${cat ? 'Ubah Kategori' : 'Tambah Kategori'}</h2>
    <p class="modal-sub">${cat ? 'Perubahan nama berlaku untuk produk pada kategori ini.' : 'Kategori baru langsung tersedia di form produk seller.'}</p>
    <div class="alert" id="catAlert"></div>
    <form onsubmit="saveCategory(event${cat ? ", '" + cat.id + "'" : ''})">
      <div class="field"><label>Nama kategori</label><input name="name" value="${cat ? safe(cat.name) : ''}" placeholder="Contoh: Sports & Outdoor"></div>
      <div class="field"><label>Ikon (opsional, satu karakter)</label><input name="icon" maxlength="2" value="${cat ? safe(cat.icon) : '◆'}" placeholder="◆"></div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" type="submit">${cat ? 'Simpan' : 'Tambah Kategori'}</button>
      </div>
    </form>`, 'small');
}

function saveCategory(e, id) {
  e.preventDefault();
  if (!requireAdmin()) return;
  const name = e.target.name.value.trim();
  const icon = e.target.icon.value.trim() || '◆';
  if (name.length < 3) { setAlert('catAlert', 'error', 'Nama kategori minimal 3 karakter.'); return; }
  const cats = DB.categories();
  if (cats.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) {
    setAlert('catAlert', 'error', 'Kategori dengan nama tersebut sudah ada.');
    return;
  }
  if (id) {
    const idx = cats.findIndex(c => c.id === id);
    const oldName = cats[idx].name;
    cats[idx].name = name;
    cats[idx].icon = icon;
    DB.saveCategories(cats);
    const products = DB.products();
    products.forEach(p => { if (p.category === oldName) p.category = name; });
    DB.saveProducts(products);
    logAdmin('update_category', 'Mengubah kategori "' + oldName + '" menjadi "' + name + '".');
    toast('Kategori diperbarui.', 'success');
  } else {
    cats.push({ id: uid('cat'), name, icon });
    DB.saveCategories(cats);
    logAdmin('create_category', 'Menambahkan kategori baru "' + name + '".');
    toast('Kategori baru ditambahkan.', 'success');
  }
  closeModal();
  renderAdmin(location.hash.replace(/^#/, '') || '/admin');
}

function deleteCategory(id) {
  if (!requireAdmin()) return;
  const cats = DB.categories();
  const cat = cats.find(c => c.id === id);
  if (!cat) return;
  const products = DB.products();
  const used = products.filter(p => p.category === cat.name);
  if (cats.length <= 1) { toast('Minimal satu kategori harus tersedia.', 'error'); return; }
  const target = cats.find(c => c.id !== id);
  if (used.length) {
    confirmDialog({
      title: 'Hapus kategori yang masih digunakan?',
      message: `Kategori "${cat.name}" digunakan oleh ${used.length} produk. Produk tersebut akan dipindahkan ke kategori "${target.name}" sebelum kategori dihapus.`,
      confirmText: 'Pindahkan & Hapus',
      danger: true
    }).then(ok => {
      if (!ok) return;
      products.forEach(p => { if (p.category === cat.name) p.category = target.name; });
      DB.saveProducts(products);
      DB.saveCategories(cats.filter(c => c.id !== id));
      logAdmin('delete_category', `Menghapus kategori "${cat.name}" dan memindahkan ${used.length} produk ke "${target.name}".`);
      toast('Kategori dihapus dan produk dipindahkan.', 'success');
      renderAdmin('/admin/categories');
      refreshGrids();
    });
    return;
  }
  confirmDialog({
    title: 'Hapus kategori?',
    message: `Kategori "${cat.name}" tidak digunakan produk mana pun dan akan dihapus.`,
    confirmText: 'Hapus Kategori',
    danger: true
  }).then(ok => {
    if (!ok) return;
    DB.saveCategories(cats.filter(c => c.id !== id));
    logAdmin('delete_category', 'Menghapus kategori "' + cat.name + '".');
    toast('Kategori dihapus.', 'success');
    renderAdmin('/admin/categories');
  });
}

/* ---------------- Admin reports ---------------- */
function adminReportsHtml() {
  const reports = [...DB.reports()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <div class="admin-section-title"><div><h2>Report Management</h2><p>Tinjau laporan pembeli dan ambil tindakan pada produk atau akun terkait.</p></div>
      <span class="small">${reports.filter(r => r.status === 'open').length} laporan baru</span></div>
    ${reports.length ? `<div class="report-list">${reports.map(r => {
      const reporter = DB.userById(r.reporterId);
      const product = r.productId ? DB.productById(r.productId) : null;
      const owner = product ? DB.userById(product.sellerId) : null;
      const label = { open: 'Open', under_review: 'Under Review', resolved: 'Resolved', rejected: 'Rejected' }[r.status] || r.status;
      return `<div class="report-card">
        <div class="report-head">
          <div><strong>${safe(r.reason)}</strong>
            <div class="small">Dilaporkan oleh ${safe(reporter ? reporter.name + ' (@' + reporter.username + ')' : 'Pengguna dihapus')} · ${fmtDateTime(r.createdAt)}</div>
          </div>
          <span class="badge badge-${r.status === 'under_review' ? 'under_review' : r.status === 'resolved' ? 'resolved' : r.status === 'rejected' ? 'rejected' : 'open'}">${label}</span>
        </div>
        <div class="report-body">${safe(r.description)}</div>
        <div class="small">
          <b>Produk:</b> ${product ? safe(product.name) + ' · ' + rupiah(product.price) + ' · ' + (product.status) : 'Produk sudah dihapus'}
          ${owner ? ` · <b>Pemilik:</b> ${safe(owner.name)} (@${safe(owner.username)})` : ''}
        </div>
        <div class="row-actions">
          ${product ? `<button class="btn btn-light btn-sm" onclick="showDetail('${product.id}')">Lihat Produk</button>` : ''}
          ${r.status === 'open' ? `<button class="btn btn-outline btn-sm" onclick="setReportStatus('${r.id}','under_review')">Under Review</button>` : ''}
          ${r.status !== 'resolved' ? `<button class="btn btn-primary btn-sm" onclick="setReportStatus('${r.id}','resolved')">Selesaikan</button>` : ''}
          ${r.status !== 'rejected' ? `<button class="btn btn-outline btn-sm" onclick="setReportStatus('${r.id}','rejected')">Tolak Laporan</button>` : ''}
          ${product && product.status !== 'removed' ? `<button class="btn btn-danger btn-sm" onclick="reportRemoveProduct('${r.id}')">Nonaktifkan Produk</button>` : ''}
          ${owner && owner.role !== 'admin' && owner.status === 'active' ? `<button class="btn btn-danger btn-sm" onclick="reportDeactivateOwner('${r.id}')">Nonaktifkan Akun Penjual</button>` : ''}
        </div>
      </div>`;
    }).join('')}</div>` : '<div class="table-wrap"><div class="empty" style="padding:44px">Belum ada laporan masuk.</div></div>'}`;
}

function setReportStatus(id, status) {
  if (!requireAdmin()) return;
  const reports = DB.reports();
  const idx = reports.findIndex(r => r.id === id);
  if (idx < 0) return;
  reports[idx].status = status;
  DB.saveReports(reports);
  const labels = { under_review: 'ditandai Under Review', resolved: 'diselesaikan', rejected: 'ditolak' };
  logAdmin('report_' + status, 'Laporan "' + reports[idx].reason + '" ' + (labels[status] || status) + '.');
  toast('Laporan berhasil ' + (labels[status] || 'diperbarui') + '.', 'success');
  renderAdmin('/admin/reports');
}

function reportRemoveProduct(reportId) {
  if (!requireAdmin()) return;
  const report = DB.reports().find(r => r.id === reportId);
  if (!report || !report.productId) return;
  const product = DB.productById(report.productId);
  if (!product) return;
  confirmDialog({
    title: 'Nonaktifkan produk terlapor?',
    message: '"' + product.name + '" akan berstatus Removed dan tidak tampil di katalog.',
    confirmText: 'Nonaktifkan Produk',
    danger: true
  }).then(ok => {
    if (!ok) return;
    const products = DB.products();
    const idx = products.findIndex(p => p.id === product.id);
    products[idx].status = 'removed';
    products[idx].updatedAt = new Date().toISOString();
    DB.saveProducts(products);
    const reports = DB.reports();
    const rIdx = reports.findIndex(r => r.id === reportId);
    reports[rIdx].status = 'resolved';
    DB.saveReports(reports);
    logAdmin('remove_product', 'Menonaktifkan produk terlapor "' + product.name + '".');
    toast('Produk dinonaktifkan dan laporan diselesaikan.', 'success');
    renderAdmin('/admin/reports');
    refreshGrids();
    syncCounts();
  });
}

function reportDeactivateOwner(reportId) {
  if (!requireAdmin()) return;
  const report = DB.reports().find(r => r.id === reportId);
  if (!report || !report.productId) return;
  const product = DB.productById(report.productId);
  const owner = product ? DB.userById(product.sellerId) : null;
  if (!owner || owner.role === 'admin') { toast('Akun penjual tidak dapat dinonaktifkan.', 'error'); return; }
  confirmDialog({
    title: 'Nonaktifkan akun penjual?',
    message: 'Akun ' + owner.name + ' (@' + owner.username + ') akan dinonaktifkan dan tidak dapat login.',
    confirmText: 'Nonaktifkan Akun',
    danger: true
  }).then(ok => {
    if (!ok) return;
    const users = DB.users();
    const idx = users.findIndex(u => u.id === owner.id);
    users[idx].status = 'inactive';
    DB.saveUsers(users);
    logAdmin('deactivate_user', 'Menonaktifkan akun ' + owner.name + ' terkait laporan "' + report.reason + '".');
    toast('Akun seller dinonaktifkan.', 'success');
    renderAdmin('/admin/reports');
  });
}

/* ---------------- Admin activity log ---------------- */
function recentLogsHtml(limit) {
  const logs = DB.logs().slice(0, limit || 4);
  if (!logs.length) return '<div class="empty" style="padding:26px">Belum ada aktivitas administrator.</div>';
  return `<div class="log-list">${logs.map(l => {
    const admin = DB.userById(l.adminId);
    return `<div class="log-item"><span class="dot"></span><div><b>${safe(admin ? admin.name : 'Administrator')}</b> — ${safe(l.description)}<time>${fmtDateTime(l.timestamp)} · ${safe(l.action)}</time></div></div>`;
  }).join('')}</div>`;
}

function adminLogsHtml() {
  const logs = DB.logs();
  const secLogs = SEC.logs();
  return `
    <div class="admin-section-title"><div><h2>Admin Activity Log</h2><p>Riwayat tindakan administrator pada marketplace.</p></div>
      <span class="small">${logs.length} aktivitas</span></div>
    ${logs.length ? `<div class="log-list">${logs.map(l => {
      const admin = DB.userById(l.adminId);
      return `<div class="log-item"><span class="dot"></span><div style="flex:1">
        <b>${safe(admin ? admin.name : 'Administrator')}</b> — ${safe(l.description)}
        <time>${fmtDateTime(l.timestamp)} · aksi: ${safe(l.action)}</time>
      </div></div>`;
    }).join('')}</div>` : '<div class="table-wrap"><div class="empty" style="padding:44px">Belum ada aktivitas administrator yang tercatat.<br><span class="small">Setujui, tolak, atau kelola data untuk mulai mencatat log.</span></div></div>'}

    <div class="admin-section-title" style="margin-top:26px"><div><h2>Log Keamanan</h2><p>Percobaan login, verifikasi MFA, sesi, dan perubahan password.</p></div>
      <span class="small">${secLogs.length} peristiwa</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <button class="btn btn-outline btn-sm" onclick="clearSecurityLogs()">Bersihkan Log Keamanan</button>
      <span class="small">Retensi otomatis ${SEC.POLICY.logDays} hari · maksimal ${SEC.POLICY.maxAttempts} percobaan login / ${Math.round(SEC.POLICY.windowMs / 60000)} menit</span>
    </div>
    ${secLogs.length ? `<div class="log-list">${secLogs.map(l => `
      <div class="log-item"><span class="dot"></span><div style="flex:1">
        <b>${safe(l.event)}</b> — ${safe(l.detail)}
        <time>${fmtDateTime(l.at)}</time>
      </div></div>`).join('')}</div>` : '<div class="table-wrap"><div class="empty" style="padding:34px">Belum ada peristiwa keamanan yang tercatat.</div></div>'}

    <div class="admin-section-title" style="margin-top:26px"><div><h2>Backup &amp; Pemulihan</h2><p>Snapshot data marketplace dalam satu file JSON.</p></div></div>
    <div class="table-wrap" style="padding:18px">
      <p class="small" style="margin:0">File backup memuat akun, produk, kategori, laporan, dan log — termasuk hash password demo. Simpan file secara privat dan jangan unggah ke tempat publik. Foto profil tidak disertakan agar ukuran file tetap kecil.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-primary btn-sm" onclick="downloadBackup()">Unduh Backup JSON</button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer">Pulihkan dari File<input type="file" accept="application/json,.json" style="display:none" onchange="restoreBackupFromFile(event)"></label>
      </div>
      <div class="small" style="margin-top:10px">Saat ini: ${DB.users().length} akun · ${DB.products().length} produk · ${DB.categories().length} kategori · ${DB.reports().length} laporan · ${logs.length} log aktivitas</div>
    </div>`;
}

/* ---------------- Backup & log keamanan ---------------- */
function downloadBackup() {
  try {
    const blob = new Blob([SEC.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reuse-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    logAdmin('backup_data', 'Mengunduh snapshot data marketplace.');
    SEC.log('backup_created', 'Administrator mengunduh backup data.');
    toast('Backup diunduh. Simpan file di tempat yang aman.', 'success');
    renderAdmin('/admin/logs');
  } catch (err) {
    console.error(err);
    toast('Backup gagal dibuat. Coba lagi.', 'error');
  }
}

function restoreBackupFromFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Ukuran file backup maksimal 5 MB.', 'error'); e.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    confirmDialog({
      title: 'Pulihkan data dari backup?',
      message: 'Seluruh data marketplace saat ini akan diganti dengan isi file backup. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Pulihkan',
      cancelText: 'Batal',
      danger: true
    }).then(ok => {
      e.target.value = '';
      if (!ok) return;
      const res = SEC.importData(reader.result);
      if (!res.ok) { toast(res.error, 'error'); return; }
      SEC.log('backup_restored', 'Data dipulihkan dari file backup oleh administrator.');
      logAdmin('restore_backup', 'Memulihkan data dari backup: ' + res.counts.users + ' akun, ' + res.counts.products + ' produk.');
      toast('Data berhasil dipulihkan dari backup.', 'success');
      renderAdmin('/admin/logs');
    });
  };
  reader.readAsText(file);
}

function clearSecurityLogs() {
  confirmDialog({
    title: 'Bersihkan log keamanan?',
    message: 'Semua catatan percobaan login, MFA, dan perubahan password akan dihapus. Log aktivitas admin tetap tersimpan.',
    confirmText: 'Bersihkan',
    cancelText: 'Batal',
    danger: true
  }).then(ok => {
    if (!ok) return;
    SEC.clearLogs();
    logAdmin('clear_security_logs', 'Membersihkan log keamanan.');
    toast('Log keamanan dibersihkan.', 'info');
    renderAdmin('/admin/logs');
  });
}
