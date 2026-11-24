/* ============================================================
   ReUse v2.1 — Pesanan, chat/negosiasi, ulasan & notifikasi
   Semua data demo disimpan di localStorage (lihat store.js).
   ============================================================ */

const ORDER_STATUS = {
  pending:   { label: 'Menunggu',   cls: 'pending' },
  accepted:  { label: 'Disepakati', cls: 'under_review' },
  completed: { label: 'Selesai',    cls: 'resolved' },
  declined:  { label: 'Ditolak',    cls: 'rejected' },
  cancelled: { label: 'Dibatalkan', cls: 'removed' }
};

function orderStatusBadge(status) {
  const m = ORDER_STATUS[status] || { label: status, cls: 'removed' };
  return `<span class="badge badge-${m.cls}">${m.label}</span>`;
}
function orderById(id) { return DB.orders().find(o => o.id === id) || null; }
function productName(id) {
  const p = DB.productById(id);
  return p ? p.name : 'Produk dihapus';
}
function ordersFor(userId, side) {
  return DB.orders()
    .filter(o => side === 'seller' ? o.sellerId === userId : o.buyerId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function activeOrderCount(userId, side) {
  return ordersFor(userId, side).filter(o => o.status === 'pending' || o.status === 'accepted').length;
}

/* ---------------- Notifikasi ---------------- */
function notify(userId, text, link, type) {
  if (!userId) return;
  const list = DB.notify();
  list.unshift({
    id: uid('n'),
    userId,
    text: SEC.cleanText(text, 220),
    link: link || '',
    type: type || 'info',
    read: false,
    at: new Date().toISOString()
  });
  DB.saveNotify(list.slice(0, 400));
}
function unreadNotifyCount(userId) {
  return DB.notify().filter(n => n.userId === userId && !n.read).length;
}
function markNotifyRead(id) {
  const list = DB.notify();
  const n = list.find(x => x.id === id);
  if (!n) return;
  n.read = true;
  DB.saveNotify(list);
  syncCounts();
}
function markAllNotifyRead() {
  const user = Auth.currentUser();
  if (!user) return;
  const list = DB.notify();
  list.forEach(n => { if (n.userId === user.id) n.read = true; });
  DB.saveNotify(list);
  syncCounts();
  renderNotifications();
  toast('Semua notifikasi ditandai sudah dibaca.', 'info');
}
function openNotification(id) {
  const user = Auth.currentUser();
  if (!user) return;
  const n = DB.notify().find(x => x.id === id && x.userId === user.id);
  if (!n) return;
  markNotifyRead(id);
  if (n.link) navigate(n.link);
  else renderNotifications();
}
function renderNotifications() {
  const user = Auth.currentUser();
  if (!user) { navigate('/login'); return; }
  const list = DB.notify().filter(n => n.userId === user.id);
  const unread = list.filter(n => !n.read).length;
  const icon = t => ({ order: '▦', chat: '✉', product: '◇', account: '☺', info: '◉' }[t] || '◉');
  document.getElementById('app').innerHTML = `
  <div class="page"><div class="container" style="max-width:820px">
    <div class="page-head">
      <div><span class="kicker">NOTIFICATION CENTER</span><h1>Notifikasi</h1><p class="sub">${unread ? unread + ' notifikasi belum dibaca.' : 'Semua notifikasi sudah dibaca.'}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${unread ? '<button class="btn btn-outline btn-sm" onclick="markAllNotifyRead()">Tandai semua dibaca</button>' : ''}
        <button class="btn btn-light btn-sm" onclick="navigate('/orders')">Pesanan Saya</button>
      </div>
    </div>
    ${list.length ? `<div class="notif-list">${list.map(n => `
      <button class="notif-item ${n.read ? '' : 'unread'}" onclick="openNotification('${n.id}')">
        <span class="notif-icon">${icon(n.type)}</span>
        <span class="notif-copy"><strong>${safe(n.text)}</strong><small>${fmtDateTime(n.at)} · ${safe(n.type)}</small></span>
        ${n.read ? '' : '<span class="unread-dot" aria-label="Belum dibaca"></span>'}
      </button>`).join('')}</div>` : `<div class="card">${emptyState('Belum ada notifikasi', 'Pemberitahuan tentang pesanan, chat, dan status produk akan muncul di sini.')}</div>`}
  </div></div>`;
  pageTitle('Notifikasi');
  syncCounts();
}

/* ---------------- Pesanan ---------------- */
/* Membuat pesanan atas nama pembeli tertentu (dipakai juga saat penjual
   menerima tawaran chat, ketika pengguna aktif adalah penjual). */
function insertOrder(productId, buyerId, sellerId, price, quantity, note) {
  const orders = DB.orders();
  const existing = orders.find(o => o.productId === productId && o.buyerId === buyerId && (o.status === 'pending' || o.status === 'accepted'));
  if (existing) return { order: existing, created: false };
  const now = new Date().toISOString();
  const order = {
    id: uid('o'),
    productId,
    buyerId,
    sellerId,
    price: Math.max(0, Number(price) || 0),
    quantity: Math.max(1, Math.min(10, Number(quantity) || 1)),
    note: SEC.cleanText(note, 300),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    reviewId: null,
    declineReason: ''
  };
  orders.unshift(order);
  DB.saveOrders(orders);
  return { order, created: true };
}

function createOrder(productId, quantity, note, priceOverride) {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login dulu untuk membuat pesanan.', 'info'); navigate('/login'); return null; }
  if (user.role === 'admin') { toast('Akun administrator tidak dapat membuat pesanan.', 'info'); return null; }
  const p = DB.productById(productId);
  if (!p || p.status !== 'approved' || p.sold) { toast('Produk sudah tidak tersedia.', 'error'); return null; }
  if (p.sellerId === user.id) { toast('Ini produk kamu sendiri.', 'info'); return null; }
  const override = Number(priceOverride);
  const res = insertOrder(productId, user.id, p.sellerId, override > 0 ? override : p.price, quantity, note);
  if (!res.created) {
    toast('Kamu sudah punya pesanan aktif untuk produk ini.', 'info');
    navigate('/orders');
    return res.order;
  }
  notify(p.sellerId, user.name + ' mengajukan pesanan untuk "' + p.name + '".', '/orders', 'order');
  toast('Pesanan diajukan. Menunggu konfirmasi penjual.', 'success');
  syncCounts();
  return res.order;
}

function applySale(productId) {
  const products = DB.products();
  const idx = products.findIndex(p => p.id === productId);
  if (idx >= 0) {
    products[idx].sold = true;
    products[idx].updatedAt = new Date().toISOString();
    DB.saveProducts(products);
  }
  DB.saveCart(DB.cart().filter(c => c.productId !== productId));
  DB.saveWishlist(DB.wishlist().filter(w => w.productId !== productId));
  refreshGrids();
  syncCounts();
}

function refreshOrdersView() {
  syncCounts();
  if (document.getElementById('ordersBody')) renderOrdersBody();
  if (document.getElementById('sellerBody') && sellerTab === 'orders') renderSellerBody();
  if (document.getElementById('sellerBody') && sellerTab === 'overview') renderSellerBody();
}

function acceptOrder(id) {
  const user = Auth.currentUser();
  const orders = DB.orders();
  const idx = orders.findIndex(o => o.id === id);
  if (!user || idx < 0) return;
  const o = orders[idx];
  if (o.sellerId !== user.id) { toast('Hanya penjual yang dapat menerima pesanan ini.', 'error'); return; }
  if (o.status !== 'pending') { toast('Pesanan ini sudah diproses.', 'info'); return; }
  o.status = 'accepted';
  o.updatedAt = new Date().toISOString();
  DB.saveOrders(orders);
  notify(o.buyerId, 'Pesanan "' + productName(o.productId) + '" disepakati penjual. Lanjutkan pembayaran/pengambilan.', '/orders', 'order');
  toast('Pesanan diterima. Pembeli sudah diberi tahu.', 'success');
  refreshOrdersView();
}

function openDeclineOrder(id) {
  const user = Auth.currentUser();
  const o = orderById(id);
  if (!user || !o || o.sellerId !== user.id) return;
  openModal(`
    <h2>Tolak Pesanan</h2>
    <p class="modal-sub">${safe(productName(o.productId))} — pembeli akan melihat alasan penolakan.</p>
    <div class="alert" id="declineAlert"></div>
    <form onsubmit="submitDeclineOrder(event, '${id}')">
      <div class="field"><label>Alasan penolakan</label><textarea name="reason" maxlength="300" placeholder="Contoh: Barang sudah diambil pembeli lain."></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" onclick="closeModal()">Batal</button>
        <button class="btn btn-danger" type="submit">Tolak Pesanan</button>
      </div>
    </form>`, 'small');
}
function submitDeclineOrder(e, id) {
  e.preventDefault();
  const user = Auth.currentUser();
  const reason = SEC.cleanText(e.target.reason.value, 300);
  if (!user) return;
  if (reason.length < 5) { setAlert('declineAlert', 'error', 'Alasan penolakan minimal 5 karakter.'); return; }
  const orders = DB.orders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx < 0) return;
  const o = orders[idx];
  if (o.sellerId !== user.id) return;
  o.status = 'declined';
  o.declineReason = reason;
  o.updatedAt = new Date().toISOString();
  DB.saveOrders(orders);
  notify(o.buyerId, 'Pesanan "' + productName(o.productId) + '" ditolak penjual: ' + reason, '/orders', 'order');
  closeModal();
  toast('Pesanan ditolak.', 'info');
  refreshOrdersView();
}

function completeOrder(id) {
  const user = Auth.currentUser();
  const orders = DB.orders();
  const idx = orders.findIndex(o => o.id === id);
  if (!user || idx < 0) return;
  const o = orders[idx];
  if (o.buyerId !== user.id && o.sellerId !== user.id) return;
  if (o.status !== 'accepted') { toast('Pesanan harus disepakati penjual terlebih dahulu.', 'info'); return; }
  o.status = 'completed';
  o.completedAt = new Date().toISOString();
  o.updatedAt = o.completedAt;
  DB.saveOrders(orders);
  applySale(o.productId);
  const other = o.buyerId === user.id ? o.sellerId : o.buyerId;
  notify(other, 'Pesanan "' + productName(o.productId) + '" ditandai selesai.', '/orders', 'order');
  toast('Transaksi selesai. Terima kasih!', 'success');
  refreshOrdersView();
  if (o.buyerId === user.id && !o.reviewId) openRateOrder(id);
}

function cancelOrder(id) {
  const user = Auth.currentUser();
  const o = orderById(id);
  if (!user || !o || o.buyerId !== user.id) return;
  if (o.status !== 'pending' && o.status !== 'accepted') { toast('Pesanan ini tidak dapat dibatalkan.', 'info'); return; }
  confirmDialog({
    title: 'Batalkan pesanan?',
    message: 'Pesanan "' + productName(o.productId) + '" akan dibatalkan dan penjual akan diberi tahu.',
    confirmText: 'Batalkan Pesanan',
    cancelText: 'Kembali',
    danger: true
  }).then(ok => {
    if (!ok) return;
    const orders = DB.orders();
    const idx = orders.findIndex(x => x.id === id);
    orders[idx].status = 'cancelled';
    orders[idx].updatedAt = new Date().toISOString();
    DB.saveOrders(orders);
    notify(orders[idx].sellerId, 'Pesanan "' + productName(o.productId) + '" dibatalkan pembeli.', '/orders', 'order');
    toast('Pesanan dibatalkan.', 'info');
    refreshOrdersView();
  });
}

function orderDetail(id) {
  const user = Auth.currentUser();
  const o = orderById(id);
  if (!user || !o) return;
  const isBuyer = o.buyerId === user.id;
  const isSeller = o.sellerId === user.id;
  if (!isBuyer && !isSeller && user.role !== 'admin') return;
  const product = DB.productById(o.productId);
  const otherId = isSeller ? o.buyerId : o.sellerId;
  const other = DB.userById(otherId);
  const otherLabel = isSeller ? 'Pembeli' : 'Penjual';
  openModal(`
    <h2>Detail Pesanan</h2>
    <p class="modal-sub">${orderStatusBadge(o.status)} <span class="small">Dibuat ${fmtDateTime(o.createdAt)}</span></p>
    <div class="order-detail">
      <img src="${safe(product ? productImage(product) : PLACEHOLDER)}" alt="${safe(product ? product.name : 'Produk')}" onerror="this.src='${PLACEHOLDER}'">
      <div>
        <strong style="font-size:15px;color:var(--forest)">${safe(product ? product.name : 'Produk sudah dihapus')}</strong>
        <div class="small">${rupiah(o.price)} × ${o.quantity} · Total <b>${rupiah(o.price * o.quantity)}</b></div>
        <div class="small">${otherLabel}: ${safe(other ? other.name + ' (@' + other.username + ')' : 'Pengguna dihapus')}</div>
        ${other && other.phone ? `<div class="small">WhatsApp: ${safe(other.phone)}</div>` : ''}
      </div>
    </div>
    ${o.note ? `<div class="hint">Catatan pembeli: ${safe(o.note)}</div>` : ''}
    ${o.declineReason ? `<div class="hint warn">Alasan penolakan: ${safe(o.declineReason)}</div>` : ''}
    <div class="meta-list">
      <div><b>Status:</b> ${safe((ORDER_STATUS[o.status] || {}).label || o.status)}</div>
      <div><b>Terakhir diperbarui:</b> ${fmtDateTime(o.updatedAt)}</div>
      ${o.completedAt ? `<div><b>Selesai:</b> ${fmtDateTime(o.completedAt)}</div>` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Tutup</button>
      ${other && other.phone ? `<a class="btn btn-light" href="${waLink(other.phone, 'Halo ' + other.name + ', saya terkait pesanan ' + (product ? product.name : 'ReUse') + ' di ReUse.')}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}
      ${isSeller && o.status === 'pending' ? `<button class="btn btn-primary" onclick="closeModal();acceptOrder('${o.id}')">Terima Pesanan</button>` : ''}
      ${isBuyer && o.status === 'accepted' ? `<button class="btn btn-primary" onclick="closeModal();completeOrder('${o.id}')">Selesai &amp; Terima</button>` : ''}
      ${isBuyer && o.status === 'completed' && !o.reviewId ? `<button class="btn btn-primary" onclick="closeModal();openRateOrder('${o.id}')">Beri Ulasan</button>` : ''}
    </div>`, 'small');
}

/* ---------------- Ulasan & kepercayaan penjual ---------------- */
function reviewsFor(sellerId) {
  return DB.reviews().filter(r => r.sellerId === sellerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function sellerStats(sellerId) {
  const reviews = reviewsFor(sellerId);
  const rating = reviews.length ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length : 0;
  const orders = DB.orders().filter(o => o.sellerId === sellerId);
  const completed = orders.filter(o => o.status === 'completed').length;
  const threads = DB.threads().filter(t => t.sellerId === sellerId);
  const replied = threads.filter(t => (t.messages || []).some(m => m.senderId === sellerId)).length;
  return {
    rating,
    count: reviews.length,
    completed,
    sold: DB.products().filter(p => p.sellerId === sellerId && p.sold).length,
    responsive: threads.length ? (replied / threads.length) >= 0.5 : completed > 0
  };
}
function starsHtml(rating, small) {
  const full = Math.round(Number(rating) || 0);
  let out = '';
  for (let i = 1; i <= 5; i++) out += `<span class="${i <= full ? 'on' : ''}">★</span>`;
  return `<span class="stars${small ? ' sm' : ''}" aria-label="Rating ${(Number(rating) || 0).toFixed(1)} dari 5">${out}</span>`;
}
function sellerTrustHtml(sellerId) {
  const seller = DB.userById(sellerId);
  if (!seller) return '';
  const s = sellerStats(sellerId);
  const parts = [];
  if (seller.verified) parts.push('<span class="trust-badge verified">✓ Terverifikasi</span>');
  if (s.responsive) parts.push('<span class="trust-badge responsive">⚡ Responsif</span>');
  if (s.count) parts.push(`<span class="trust-badge rating">${starsHtml(s.rating, true)} ${s.rating.toFixed(1)} · ${s.count} ulasan</span>`);
  else parts.push('<span class="trust-badge">Belum ada ulasan</span>');
  return `<div class="trust-badges">${parts.join('')}</div>`;
}

let starRatingValue = 5;
function openRateOrder(orderId) {
  const user = Auth.currentUser();
  const o = orderById(orderId);
  if (!user || !o) return;
  if (o.buyerId !== user.id) { toast('Hanya pembeli yang dapat memberi ulasan.', 'error'); return; }
  if (o.status !== 'completed') { toast('Ulasan tersedia setelah pesanan selesai.', 'info'); return; }
  if (o.reviewId || DB.reviews().some(r => r.orderId === orderId)) { toast('Kamu sudah memberi ulasan untuk pesanan ini.', 'info'); return; }
  starRatingValue = 5;
  openModal(`
    <h2>Beri Ulasan Penjual</h2>
    <p class="modal-sub">${safe(productName(o.productId))} · penjual ${safe((DB.userById(o.sellerId) || {}).name || '-')}</p>
    <div class="alert" id="reviewAlert"></div>
    <form onsubmit="submitReview(event, '${orderId}')">
      <div class="field"><label>Rating</label>
        <div class="star-pick" id="starPick">
          ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="on" onclick="setStarRating(${n})" aria-label="${n} bintang">★</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Ulasan (opsional)</label><textarea name="comment" maxlength="500" placeholder="Bagaimana pengalaman transaksi kamu?"></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" onclick="closeModal()">Nanti</button>
        <button class="btn btn-primary" type="submit">Kirim Ulasan</button>
      </div>
    </form>`, 'small');
}
function setStarRating(n) {
  starRatingValue = n;
  document.querySelectorAll('#starPick button').forEach((b, i) => b.classList.toggle('on', i < n));
}
function submitReview(e, orderId) {
  e.preventDefault();
  const user = Auth.currentUser();
  const o = orderById(orderId);
  if (!user || !o || o.buyerId !== user.id) return;
  if (o.status !== 'completed') return;
  if (DB.reviews().some(r => r.orderId === orderId)) { setAlert('reviewAlert', 'error', 'Pesanan ini sudah diulas.'); return; }
  const comment = SEC.cleanMultiline(e.target.comment.value, 500);
  const reviews = DB.reviews();
  const review = {
    id: uid('rv'),
    orderId,
    productId: o.productId,
    sellerId: o.sellerId,
    buyerId: user.id,
    rating: Math.max(1, Math.min(5, Number(starRatingValue) || 5)),
    comment,
    createdAt: new Date().toISOString()
  };
  reviews.unshift(review);
  DB.saveReviews(reviews);
  const orders = DB.orders();
  const idx = orders.findIndex(x => x.id === orderId);
  orders[idx].reviewId = review.id;
  DB.saveOrders(orders);
  notify(o.sellerId, user.name + ' memberi ulasan ' + review.rating + ' bintang untuk "' + productName(o.productId) + '".', '/profile', 'account');
  closeModal();
  toast('Ulasan terkirim. Terima kasih!', 'success');
  refreshOrdersView();
}

/* ---------------- Halaman Pesanan Saya ---------------- */
let ordersTab = 'buy';
let ordersFilter = 'all';

function renderOrders() {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk membuka pesanan.', 'info'); navigate('/login'); return; }
  if (user.role === 'admin') { toast('Pesanan hanya tersedia untuk akun member.', 'info'); navigate('/admin'); return; }
  const buys = ordersFor(user.id, 'buyer').length;
  const sells = ordersFor(user.id, 'seller').length;
  document.getElementById('app').innerHTML = `
  <div class="page"><div class="container">
    <div class="page-head">
      <div><span class="kicker">TRANSACTION CENTER</span><h1>Pesanan Saya</h1><p class="sub">Ajukan pesanan, pantau status, dan selesaikan transaksi langsung dengan penjual.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a class="btn btn-light btn-sm" href="#/chat">Buka Chat</a>
        <a class="btn btn-outline btn-sm" href="#/notifications">Notifikasi</a>
      </div>
    </div>
    <div class="tabs">
      <button class="tab ${ordersTab === 'buy' ? 'active' : ''}" onclick="setOrdersTab('buy')">Pembelian Saya (${buys})</button>
      <button class="tab ${ordersTab === 'sell' ? 'active' : ''}" onclick="setOrdersTab('sell')">Penjualan Saya (${sells})</button>
    </div>
    <div class="chips" id="ordersChips"></div>
    <div id="ordersBody"></div>
  </div></div>`;
  pageTitle('Pesanan Saya');
  renderOrdersChips();
  renderOrdersBody();
  syncCounts();
}
function setOrdersTab(tab) {
  ordersTab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.textContent.indexOf(tab === 'buy' ? 'Pembelian' : 'Penjualan') === 0));
  renderOrdersChips();
  renderOrdersBody();
}
function renderOrdersChips() {
  const el = document.getElementById('ordersChips');
  if (!el) return;
  const opts = [['all', 'Semua'], ['pending', 'Menunggu'], ['accepted', 'Disepakati'], ['completed', 'Selesai'], ['declined', 'Ditolak'], ['cancelled', 'Dibatalkan']];
  el.innerHTML = opts.map(([k, label]) => `<button class="chip ${ordersFilter === k ? 'active' : ''}" onclick="setOrdersFilter('${k}')">${label}</button>`).join('');
}
function setOrdersFilter(key) {
  ordersFilter = key;
  renderOrdersChips();
  renderOrdersBody();
}
function renderOrdersBody() {
  const body = document.getElementById('ordersBody');
  const user = Auth.currentUser();
  if (!body || !user) return;
  const side = ordersTab === 'sell' ? 'seller' : 'buyer';
  let list = ordersFor(user.id, side);
  if (ordersFilter !== 'all') list = list.filter(o => o.status === ordersFilter);
  if (!list.length) {
    body.innerHTML = `<div class="card">${emptyState(
      ordersTab === 'sell' ? 'Belum ada pesanan masuk' : 'Belum ada pesanan',
      ordersTab === 'sell' ? 'Pesanan dari pembeli akan muncul di sini setelah mereka mengajukan pesanan.' : 'Buka katalog, lalu tekan "Ajukan Pesanan" pada produk yang kamu minati.'
    )}<div style="text-align:center;margin-top:14px"><a class="btn btn-primary" href="#/explore">Jelajahi Produk</a></div></div>`;
    return;
  }
  body.innerHTML = `<div class="order-list">${list.map(o => orderCardHtml(o, side)).join('')}</div>`;
}
function orderCardHtml(o, side) {
  const product = DB.productById(o.productId);
  const otherId = side === 'seller' ? o.buyerId : o.sellerId;
  const other = DB.userById(otherId);
  return `<div class="order-card">
    <img src="${safe(product ? productImage(product) : PLACEHOLDER)}" alt="${safe(product ? product.name : 'Produk')}" onerror="this.src='${PLACEHOLDER}'">
    <div class="order-main">
      <div class="order-head">
        <div>
          <strong>${safe(product ? product.name : 'Produk sudah dihapus')}</strong>
          <div class="small">${side === 'seller' ? 'Pembeli' : 'Penjual'}: ${safe(other ? other.name : 'Pengguna dihapus')} · ${fmtDateTime(o.createdAt)}</div>
        </div>
        ${orderStatusBadge(o.status)}
      </div>
      <div class="order-meta">
        <span>${rupiah(o.price)} × ${o.quantity}</span>
        <b>${rupiah(o.price * o.quantity)}</b>
      </div>
      ${o.note ? `<div class="small">Catatan: ${safe(o.note)}</div>` : ''}
      ${o.declineReason ? `<div class="small" style="color:var(--danger)">Alasan ditolak: ${safe(o.declineReason)}</div>` : ''}
      <div class="row-actions" style="margin-top:10px">${orderActionsHtml(o, side)}</div>
    </div>
  </div>`;
}
function orderActionsHtml(o, side) {
  const acts = [`<button class="btn btn-light btn-sm" onclick="orderDetail('${o.id}')">Detail</button>`];
  if (side === 'seller') {
    if (o.status === 'pending') {
      acts.push(`<button class="btn btn-primary btn-sm" onclick="acceptOrder('${o.id}')">Terima</button>`);
      acts.push(`<button class="btn btn-outline btn-sm" onclick="openDeclineOrder('${o.id}')">Tolak</button>`);
    }
    if (o.status === 'accepted') acts.push(`<button class="btn btn-primary btn-sm" onclick="completeOrder('${o.id}')">Tandai Selesai</button>`);
    acts.push(`<button class="btn btn-outline btn-sm" onclick="openChatForOrder('${o.id}')">Chat Pembeli</button>`);
  } else {
    if (o.status === 'pending' || o.status === 'accepted') acts.push(`<button class="btn btn-outline btn-sm" onclick="cancelOrder('${o.id}')">Batalkan</button>`);
    if (o.status === 'accepted') acts.push(`<button class="btn btn-primary btn-sm" onclick="completeOrder('${o.id}')">Selesai &amp; Terima</button>`);
    if (o.status === 'completed' && !o.reviewId) acts.push(`<button class="btn btn-primary btn-sm" onclick="openRateOrder('${o.id}')">Beri Ulasan</button>`);
    if (o.status === 'completed' && o.reviewId) acts.push('<span class="badge badge-approved">Sudah diulas</span>');
    acts.push(`<button class="btn btn-outline btn-sm" onclick="openChatForOrder('${o.id}')">Chat Penjual</button>`);
  }
  return acts.join('');
}

/* ---------------- Chat & negosiasi ---------------- */
function threadById(id) { return DB.threads().find(t => t.id === id) || null; }
function threadsFor(userId) {
  return DB.threads()
    .filter(t => t.buyerId === userId || t.sellerId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
function unreadChatCount(userId) {
  return DB.threads()
    .filter(t => t.buyerId === userId || t.sellerId === userId)
    .reduce((sum, t) => sum + Number((t.unread || {})[userId] || 0), 0);
}
function markThreadRead(threadId, userId) {
  const list = DB.threads();
  const t = list.find(x => x.id === threadId);
  if (!t) return;
  t.unread = t.unread || {};
  if (t.unread[userId]) {
    t.unread[userId] = 0;
    DB.saveThreads(list);
    syncCounts();
  }
}
function ensureThread(productId, buyerId) {
  const p = DB.productById(productId);
  if (!p) return null;
  const list = DB.threads();
  let t = list.find(x => x.productId === productId && x.buyerId === buyerId);
  if (!t) {
    t = {
      id: uid('t'),
      productId,
      buyerId,
      sellerId: p.sellerId,
      messages: [],
      unread: {},
      updatedAt: new Date().toISOString()
    };
    list.unshift(t);
    DB.saveThreads(list);
  }
  return t;
}
function openChatProduct(productId) {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk menghubungi penjual.', 'info'); navigate('/login'); return; }
  if (user.role === 'admin') { toast('Chat hanya tersedia untuk akun member.', 'info'); return; }
  const p = DB.productById(productId);
  if (!p) return;
  if (p.sellerId === user.id) { toast('Ini produk kamu sendiri.', 'info'); return; }
  const t = ensureThread(productId, user.id);
  if (!t) return;
  closeModal();
  navigate('/chat/' + t.id);
}
function openChatForOrder(orderId) {
  const user = Auth.currentUser();
  const o = orderById(orderId);
  if (!user || !o) return;
  const buyerId = o.buyerId === user.id ? user.id : o.buyerId;
  const t = ensureThread(o.productId, buyerId);
  if (t) navigate('/chat/' + t.id);
}
function renderChats(activeId) {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk membuka pesan.', 'info'); navigate('/login'); return; }
  if (user.role === 'admin') { toast('Chat hanya tersedia untuk akun member.', 'info'); navigate('/admin'); return; }
  const threads = threadsFor(user.id);
  const thread = activeId ? threads.find(t => t.id === activeId) : null;
  if (thread) {
    markThreadRead(thread.id, user.id);
    thread.unread = thread.unread || {};
    thread.unread[user.id] = 0;
  }
  document.getElementById('app').innerHTML = `
  <div class="page"><div class="container">
    <div class="page-head">
      <div><span class="kicker">MESSAGES</span><h1>Pesan</h1><p class="sub">Tanyakan kondisi barang atau ajukan tawaran harga langsung ke penjual.</p></div>
      <a class="btn btn-light btn-sm" href="#/orders">Pesanan Saya</a>
    </div>
    <div class="chat-layout">
      <aside class="chat-list ${thread ? 'has-active' : ''}">
        ${threads.length ? threads.map(t => {
          const p = DB.productById(t.productId);
          const otherId = t.buyerId === user.id ? t.sellerId : t.buyerId;
          const other = DB.userById(otherId);
          const unread = Number((t.unread || {})[user.id] || 0);
          const last = (t.messages || [])[t.messages.length - 1];
          return `<button class="chat-item ${thread && thread.id === t.id ? 'active' : ''}" onclick="navigate('/chat/${t.id}')">
            <img src="${safe(p ? productImage(p) : PLACEHOLDER)}" alt="" onerror="this.src='${PLACEHOLDER}'">
            <span class="chat-item-copy">
              <strong>${safe(p ? p.name : 'Produk dihapus')}</strong>
              <small>${safe(other ? other.name : 'Pengguna')} · ${safe(chatPreview(last))}</small>
            </span>
            ${unread ? `<span class="unread-dot">${unread}</span>` : ''}
          </button>`;
        }).join('') : '<div class="empty" style="padding:26px">Belum ada percakapan.<br><span class="small">Buka detail produk lalu tekan Chat Penjual.</span></div>'}
      </aside>
      <section class="chat-panel">
        ${thread ? chatPanelHtml(thread, user) : `<div class="chat-empty">
          <div class="chat-empty-icon">✉</div>
          <strong>Pilih percakapan</strong>
          <p class="small">Pesan dan tawaran harga kamu dengan penjual akan tampil di sini.</p>
        </div>`}
      </section>
    </div>
  </div></div>`;
  pageTitle('Pesan');
  const box = document.getElementById('chatMessages');
  if (box) box.scrollTop = box.scrollHeight;
  syncCounts();
}
function chatPreview(msg) {
  if (!msg) return 'Belum ada pesan';
  if (msg.type === 'offer') return 'Tawaran ' + rupiah(msg.amount);
  return msg.text || '';
}
function chatPanelHtml(thread, user) {
  const p = DB.productById(thread.productId);
  const otherId = thread.buyerId === user.id ? thread.sellerId : thread.buyerId;
  const other = DB.userById(otherId);
  const isBuyer = thread.buyerId === user.id;
  return `
    <div class="chat-head">
      <a class="chat-back" href="#/chat">←</a>
      <div>
        <strong>${safe(other ? other.name : 'Pengguna')}</strong>
        <div class="small">${p ? `<button class="link-btn" onclick="showDetail('${p.id}')">${safe(p.name)}</button> · ${rupiah(p.price)}` : 'Produk dihapus'}</div>
      </div>
      ${isBuyer ? `<button class="btn btn-outline btn-sm" onclick="proposeOffer('${thread.id}')">Ajukan Tawaran</button>` : ''}
    </div>
    <div class="chat-msgs" id="chatMessages">
      ${(thread.messages || []).length ? thread.messages.map(m => chatMessageHtml(m, user, thread)).join('') : '<div class="chat-empty"><p class="small">Belum ada pesan. Mulai percakapan dengan menyapa penjual.</p></div>'}
    </div>
    <form class="chat-form" onsubmit="sendMessage(event, '${thread.id}')">
      <input name="text" maxlength="500" placeholder="Tulis pesan..." autocomplete="off">
      <button class="btn btn-primary" type="submit">Kirim</button>
    </form>`;
}
function chatMessageHtml(m, user, thread) {
  const mine = m.senderId === user.id;
  const time = new Date(m.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (m.type === 'offer') {
    const st = m.offerStatus || 'pending';
    const badge = st === 'accepted' ? '<span class="badge badge-approved">Disepakati</span>' : st === 'declined' ? '<span class="badge badge-rejected">Ditolak</span>' : '<span class="badge badge-pending">Menunggu</span>';
    return `<div class="msg ${mine ? 'me' : ''}">
      <div class="msg-offer">
        <div class="small">${mine ? 'Tawaranmu' : 'Tawaran pembeli'}</div>
        <strong>${rupiah(m.amount)}</strong>
        <div style="margin-top:6px">${badge}</div>
        ${!mine && st === 'pending' && thread.sellerId === user.id ? `
          <div class="row-actions" style="margin-top:8px">
            <button class="btn btn-primary btn-sm" onclick="respondOffer('${thread.id}','${m.id}',true)">Terima</button>
            <button class="btn btn-outline btn-sm" onclick="respondOffer('${thread.id}','${m.id}',false)">Tolak</button>
          </div>` : ''}
      </div>
      <span class="msg-time">${time}</span>
    </div>`;
  }
  return `<div class="msg ${mine ? 'me' : ''}">
    <div class="msg-bubble">${safe(m.text)}</div>
    <span class="msg-time">${time}</span>
  </div>`;
}
function addThreadMessage(threadId, message) {
  const list = DB.threads();
  const t = list.find(x => x.id === threadId);
  if (!t) return null;
  t.messages = t.messages || [];
  t.messages.push(message);
  t.updatedAt = message.at;
  t.unread = t.unread || {};
  const other = message.senderId === t.buyerId ? t.sellerId : t.buyerId;
  t.unread[other] = Number(t.unread[other] || 0) + 1;
  DB.saveThreads(list);
  return t;
}
function sendMessage(e, threadId) {
  e.preventDefault();
  const user = Auth.currentUser();
  if (!user) return;
  const input = e.target.text;
  const text = SEC.cleanText(input.value, 500);
  if (text.length < 1) { input.focus(); return; }
  const t = addThreadMessage(threadId, {
    id: uid('m'),
    senderId: user.id,
    type: 'text',
    text,
    at: new Date().toISOString()
  });
  if (!t) return;
  const other = t.buyerId === user.id ? t.sellerId : t.buyerId;
  notify(other, 'Pesan baru dari ' + user.name + ' tentang "' + productName(t.productId) + '".', '/chat/' + t.id, 'chat');
  input.value = '';
  renderChats(threadId);
}
function proposeOffer(threadId) {
  const user = Auth.currentUser();
  const t = threadById(threadId);
  if (!user || !t) return;
  if (t.buyerId !== user.id) { toast('Tawaran hanya dapat diajukan pembeli.', 'info'); return; }
  const p = DB.productById(t.productId);
  const base = p ? p.price : 0;
  openModal(`
    <h2>Ajukan Tawaran Harga</h2>
    <p class="modal-sub">${safe(p ? p.name : 'Produk')} · harga penawaran saat ini ${rupiah(base)}.</p>
    <div class="alert" id="offerAlert"></div>
    <form onsubmit="submitOffer(event, '${threadId}')">
      <div class="field"><label>Harga tawaran (Rp)</label><input name="amount" type="number" min="1000" step="1000" value="${Math.max(1000, Math.round(base * 0.9))}" required></div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" onclick="closeModal()">Batal</button>
        <button class="btn btn-primary" type="submit">Kirim Tawaran</button>
      </div>
    </form>`, 'small');
}
function submitOffer(e, threadId) {
  e.preventDefault();
  const user = Auth.currentUser();
  const t = threadById(threadId);
  if (!user || !t) return;
  const amount = Number(e.target.amount.value);
  if (!Number.isFinite(amount) || amount < 1000 || amount > 1000000000) {
    setAlert('offerAlert', 'error', 'Tawaran harus antara Rp1.000 dan Rp1.000.000.000.');
    return;
  }
  addThreadMessage(threadId, {
    id: uid('m'),
    senderId: user.id,
    type: 'offer',
    amount: Math.round(amount),
    offerStatus: 'pending',
    at: new Date().toISOString()
  });
  notify(t.sellerId, user.name + ' mengajukan tawaran ' + rupiah(amount) + ' untuk "' + productName(t.productId) + '".', '/chat/' + t.id, 'chat');
  closeModal();
  toast('Tawaran terkirim ke penjual.', 'success');
  renderChats(threadId);
}
function respondOffer(threadId, messageId, accept) {
  const user = Auth.currentUser();
  const list = DB.threads();
  const t = list.find(x => x.id === threadId);
  if (!user || !t) return;
  if (t.sellerId !== user.id) { toast('Hanya penjual yang dapat menjawab tawaran.', 'error'); return; }
  const msg = (t.messages || []).find(m => m.id === messageId);
  if (!msg || msg.type !== 'offer' || msg.offerStatus !== 'pending') return;
  msg.offerStatus = accept ? 'accepted' : 'declined';
  DB.saveThreads(list);
  if (accept) {
    const product = DB.productById(t.productId);
    if (!product || product.sold || product.status !== 'approved') {
      msg.offerStatus = 'declined';
      DB.saveThreads(list);
      toast('Produk sudah tidak tersedia, tawaran tidak dapat diterima.', 'error');
      renderChats(threadId);
      return;
    }
    const res = insertOrder(t.productId, t.buyerId, t.sellerId, msg.amount, 1, 'Tawaran disepakati lewat chat.');
    if (!res.created) {
      const orders = DB.orders();
      const idx = orders.findIndex(o => o.id === res.order.id);
      if (idx >= 0) {
        orders[idx].price = msg.amount;
        orders[idx].updatedAt = new Date().toISOString();
        DB.saveOrders(orders);
      }
      notify(t.buyerId, 'Tawaran ' + rupiah(msg.amount) + ' disepakati penjual. Harga pesanan kamu diperbarui.', '/orders', 'order');
      toast('Tawaran diterima. Harga pesanan diperbarui.', 'success');
    } else {
      notify(t.buyerId, 'Tawaran ' + rupiah(msg.amount) + ' disepakati penjual. Pesanan sudah dibuat.', '/orders', 'order');
      toast('Tawaran diterima dan pesanan dibuat.', 'success');
    }
  } else {
    notify(t.buyerId, 'Tawaran ' + rupiah(msg.amount) + ' ditolak penjual.', '/chat/' + threadId, 'chat');
    toast('Tawaran ditolak.', 'info');
  }
  renderChats(threadId);
}

/* ---------------- Tab pesanan pada Seller Dashboard ---------------- */
function sellerOrdersHtml(user) {
  const list = ordersFor(user.id, 'seller');
  const done = list.filter(o => o.status === 'completed').length;
  return `
    <div class="filter-bar">
      <span class="small">${activeOrderCount(user.id, 'seller')} pesanan aktif · ${done} selesai · ${list.length} total</span>
      <div style="flex:1"></div>
      <a class="btn btn-light btn-sm" href="#/chat">Buka Chat</a>
      <button class="btn btn-outline btn-sm" onclick="setSellerTab('products')">Kelola Produk</button>
    </div>
    ${list.length ? `<div class="order-list">${list.map(o => orderCardHtml(o, 'seller')).join('')}</div>`
      : `<div class="card">${emptyState('Belum ada pesanan masuk', 'Pesanan dari pembeli akan muncul di sini. Pastikan produk kamu sudah disetujui admin dan tampil di katalog.')}</div>`}`;
}
