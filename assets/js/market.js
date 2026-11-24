/* ============================================================
   ReUse v2.0 — Welcome page + public marketplace
   ============================================================ */
const HOME_IMG = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85';
const WELCOME_IMG = 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1000&q=85';

function approvedProducts() {
  return DB.products().filter(p => p.status === 'approved' && !p.sold);
}
function sellerOf(p) { return DB.userById(p.sellerId); }
function productImage(p) { return p && p.image ? p.image : PLACEHOLDER; }
function statusBadge(status, sold) {
  if (sold) return '<span class="badge badge-sold">Terjual</span>';
  const map = { pending: ['badge-pending', 'Pending'], approved: ['badge-approved', 'Approved'], rejected: ['badge-rejected', 'Rejected'], removed: ['badge-removed', 'Removed'] };
  const m = map[status] || ['badge-removed', status];
  return `<span class="badge ${m[0]}">${m[1]}</span>`;
}

/* ---------------- Welcome / introduction ---------------- */
function renderWelcome() {
  document.getElementById('siteHeader').innerHTML = '';
  document.getElementById('siteFooter').innerHTML = '';
  document.getElementById('app').innerHTML = `
  <div class="welcome"><div class="container">
    <div class="welcome-top">
      <a class="brand" href="#/welcome"><span class="brand-mark">↻</span> ReUse</a>
      <div style="display:flex;gap:8px;align-items:center">
        <a class="btn btn-outline btn-sm" href="#/login">Login</a>
        <button class="welcome-skip" onclick="finishIntro('/')">Lewati perkenalan →</button>
      </div>
    </div>
    <div class="welcome-grid">
      <div>
        <span class="eyebrow">♻ SECONDHAND MARKETPLACE</span>
        <h1>Give Things<span>a Second Life.</span></h1>
        <p class="welcome-lead">Selamat datang di ReUse, tempat di mana barang yang tidak lagi kamu gunakan dapat menemukan pemilik baru yang membutuhkannya.</p>
        <p class="welcome-desc">ReUse adalah marketplace barang bekas yang membantu kamu menemukan barang berkualitas dengan harga lebih hemat sekaligus memberikan kesempatan kedua bagi barang yang masih layak digunakan.</p>
        <div class="welcome-actions">
          <button class="btn btn-primary" onclick="finishIntro('/')">Mulai Sekarang →</button>
          <button class="btn btn-outline" onclick="finishIntro('/explore')">Jelajahi Produk</button>
          <a class="btn btn-light" href="#/login">Login</a>
        </div>
        <p class="small" style="margin-top:14px">Banda Aceh dan sekitarnya · Buy Smarter · Sell Easier · Live Sustainably</p>
      </div>
      <div class="welcome-art">
        <img src="${WELCOME_IMG}" alt="Rak pakaian preloved di toko barang bekas">
        <div class="welcome-badge">♻ Setiap barang layak mendapat kesempatan kedua.</div>
      </div>
    </div>
    <div class="feature-grid">
      <div class="feature"><div class="fi">⌕</div><h3>Buy Smarter</h3><p>Temukan barang berkualitas dengan harga yang lebih terjangkau.</p></div>
      <div class="feature"><div class="fi">↗</div><h3>Sell Easier</h3><p>Jual barang yang tidak lagi digunakan dengan mudah.</p></div>
      <div class="feature"><div class="fi">♻</div><h3>Live Sustainably</h3><p>Berkontribusi dalam mengurangi limbah melalui penggunaan kembali barang.</p></div>
    </div>
  </div></div>`;
}

function finishIntro(path) {
  const meta = DB.meta();
  meta.introDone = true;
  DB.saveMeta(meta);
  navigate(path);
}

/* ---------------- Home ---------------- */
function renderHome() {
  const root = document.getElementById('app');
  const cats = DB.categories();
  const total = approvedProducts().length;
  root.innerHTML = `
  <section class="hero" id="home"><div class="container hero-grid">
    <div>
      <span class="eyebrow">♻ SECONDHAND MARKETPLACE</span>
      <h1>Give Things<br>a <span>Second Life.</span></h1>
      <p>Temukan barang berkualitas dengan harga lebih hemat. Berikan kesempatan kedua untuk barang yang masih punya banyak cerita.</p>
      <div class="hero-buttons">
        <button class="btn btn-primary" onclick="scrollToId('explore')">Jelajahi Produk&nbsp; →</button>
        <button class="btn btn-outline" onclick="startSelling()">Mulai Menjual</button>
      </div>
      <div class="hero-note"><span>✓ <strong>Lebih hemat</strong></span><span>✓ <strong>Lebih berkelanjutan</strong></span><span>✓ <strong>Lebih bermakna</strong></span></div>
    </div>
    <div class="hero-art">
      <img src="${HOME_IMG}" alt="Pilihan barang fashion preloved">
      <div class="floating one">♻ Belanja lebih bijak</div>
      <div class="floating two">One product, another opportunity.</div>
    </div>
  </div></section>

  <section class="section" id="categories"><div class="container">
    <div class="section-head"><div><span class="kicker">FIND YOUR NEXT FAVORITE</span><h2>Jelajahi Kategori</h2><p class="sub">Barang pilihan untuk kebutuhan sehari-hari.</p></div>
      <span class="small">${total} produk tersedia</span></div>
    <div class="categories" id="categoryList"></div>
  </div></section>

  <section class="section" id="explore" style="padding-top:15px"><div class="container">
    <div class="section-head"><div><span class="kicker">PRELOVED, RELOVED</span><h2>Temukan Barang Favoritmu</h2><p class="sub">Setiap barang memiliki cerita. Mungkin cerita berikutnya dimulai darimu.</p></div>
      <span class="sub" id="homeCount"></span></div>
    <div class="toolbar">
      <div class="search"><span>⌕</span><input id="homeSearch" type="search" placeholder="Cari nama produk atau merek..." oninput="renderHomeGrid()"></div>
      <select id="homeCondition" onchange="renderHomeGrid()"><option value="">Semua kondisi</option>${CONDITIONS.map(c => `<option>${c}</option>`).join('')}</select>
      <select id="homeSort" onchange="renderHomeGrid()"><option value="newest">Terbaru</option><option value="low">Harga terendah</option><option value="high">Harga tertinggi</option><option value="name">Nama A–Z</option></select>
    </div>
    <div class="products" id="homeGrid"></div>
    <div style="text-align:center;margin-top:22px"><a class="btn btn-outline" href="#/explore">Lihat semua produk →</a></div>
  </div></section>

  <section class="section" id="about"><div class="container">
    <div class="banner">
      <div><span class="kicker" style="color:#b9d3bb">YOUR UNUSED ITEMS MATTER</span><h2>Punya barang yang sudah tidak terpakai?</h2><p>Jangan biarkan barang baik berakhir tersimpan. Jual di ReUse dan temukan pemilik baru yang membutuhkannya.</p></div>
      <button class="btn" onclick="startSelling()">Jual Barang Sekarang&nbsp; ↗</button>
    </div>
  </div></section>`;

  renderHomeCategories();
  renderHomeGrid();
}

let homeCategory = '';
function renderHomeCategories() {
  const el = document.getElementById('categoryList');
  if (!el) return;
  const all = `<button class="category ${homeCategory === '' ? 'active' : ''}" onclick="setHomeCategory('')"><span class="emoji">✳</span>Semua<br><small>Semua produk</small></button>`;
  el.innerHTML = all + DB.categories().map(c => {
    const count = approvedProducts().filter(p => p.category === c.name).length;
    return `<button class="category ${homeCategory === c.name ? 'active' : ''}" onclick="setHomeCategory('${safe(c.name).replace(/'/g, "\\'")}')"><span class="emoji">${safe(c.icon)}</span>${safe(c.name.split(' ')[0])}<br><small>${count} produk</small></button>`;
  }).join('');
}
function setHomeCategory(name) {
  homeCategory = name;
  renderHomeCategories();
  renderHomeGrid();
  scrollToId('explore');
}
function renderHomeGrid() {
  const grid = document.getElementById('homeGrid');
  const count = document.getElementById('homeCount');
  if (!grid) return;
  const q = (document.getElementById('homeSearch').value || '').toLowerCase().trim();
  const cond = document.getElementById('homeCondition').value;
  const sort = document.getElementById('homeSort').value;
  let list = approvedProducts().filter(p => {
    const seller = sellerOf(p);
    const hay = (p.name + ' ' + p.category + ' ' + (seller ? seller.name : '')).toLowerCase();
    return (!homeCategory || p.category === homeCategory) && (!cond || p.condition === cond) && (!q || hay.includes(q));
  });
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  else if (sort === 'high') list.sort((a, b) => b.price - a.price);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (count) count.textContent = list.length + ' produk ditemukan';
  grid.innerHTML = list.length ? list.map(productCard).join('') : emptyState('Belum ada produk yang cocok', 'Coba ubah kata kunci, kategori, atau filter kondisi.');
}

/* ---------------- Explore ---------------- */
let exploreCategory = '';
const exploreState = { q: '', condition: '', sort: 'newest' };

function renderExplore() {
  const root = document.getElementById('app');
  root.innerHTML = `
  <div class="page"><div class="container">
    <div class="page-head">
      <div><span class="kicker">PRELOVED, RELOVED</span><h1>Explore Produk</h1><p class="sub">Semua produk yang telah disetujui admin dan masih tersedia.</p></div>
      <span class="sub" id="exploreCount"></span>
    </div>
    <div class="chips" id="exploreChips"></div>
    <div class="toolbar">
      <div class="search"><span>⌕</span><input id="exploreSearch" type="search" value="${safe(exploreState.q)}" placeholder="Cari nama produk, kategori, atau penjual..." oninput="exploreState.q=this.value;renderExploreGrid()"></div>
      <select id="exploreCondition" onchange="exploreState.condition=this.value;renderExploreGrid()">
        <option value="">Semua kondisi</option>${CONDITIONS.map(c => `<option ${exploreState.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="exploreSort" onchange="exploreState.sort=this.value;renderExploreGrid()">
        <option value="newest" ${exploreState.sort === 'newest' ? 'selected' : ''}>Terbaru</option>
        <option value="low" ${exploreState.sort === 'low' ? 'selected' : ''}>Harga terendah</option>
        <option value="high" ${exploreState.sort === 'high' ? 'selected' : ''}>Harga tertinggi</option>
        <option value="name" ${exploreState.sort === 'name' ? 'selected' : ''}>Nama A–Z</option>
      </select>
    </div>
    <div class="products" id="exploreGrid"></div>
  </div></div>`;
  renderExploreChips();
  renderExploreGrid();
}
function renderExploreChips() {
  const el = document.getElementById('exploreChips');
  if (!el) return;
  el.innerHTML = `<button class="chip ${exploreCategory === '' ? 'active' : ''}" onclick="setExploreCategory('')">Semua kategori</button>` +
    DB.categories().map(c => `<button class="chip ${exploreCategory === c.name ? 'active' : ''}" onclick="setExploreCategory('${safe(c.name).replace(/'/g, "\\'")}')">${safe(c.icon)} ${safe(c.name)}</button>`).join('');
}
function setExploreCategory(name) { exploreCategory = name; renderExploreChips(); renderExploreGrid(); }
function renderExploreGrid() {
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;
  const q = (document.getElementById('exploreSearch').value || '').toLowerCase().trim();
  const cond = document.getElementById('exploreCondition').value;
  const sort = document.getElementById('exploreSort').value;
  let list = approvedProducts().filter(p => {
    const seller = sellerOf(p);
    const hay = (p.name + ' ' + p.category + ' ' + (seller ? seller.name : '') + ' ' + p.location).toLowerCase();
    return (!exploreCategory || p.category === exploreCategory) && (!cond || p.condition === cond) && (!q || hay.includes(q));
  });
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  else if (sort === 'high') list.sort((a, b) => b.price - a.price);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  document.getElementById('exploreCount').textContent = list.length + ' produk ditemukan';
  grid.innerHTML = list.length ? list.map(productCard).join('') : emptyState('Tidak ada produk ditemukan', 'Coba kata kunci atau filter kategori lain.');
}

/* ---------------- Shared product card ---------------- */
function emptyState(title, text) {
  return `<div class="empty"><strong>${safe(title)}</strong>${safe(text)}</div>`;
}
function productCard(p) {
  const seller = sellerOf(p);
  const wished = Auth.currentUser() ? DB.wishlist().some(w => w.userId === Auth.currentUser().id && w.productId === p.id) : false;
  const unavailable = p.sold || p.status !== 'approved';
  return `<article class="product">
    <div class="product-image" onclick="showDetail('${p.id}')">
      <img src="${safe(productImage(p))}" alt="${safe(p.name)}" loading="lazy" onerror="this.src='${PLACEHOLDER}'">
      <span class="condition">${safe(p.condition)}</span>
      ${unavailable ? '<span class="badge badge-sold" style="position:absolute;bottom:10px;left:12px">Terjual</span>' : ''}
      <button class="heart ${wished ? 'active' : ''}" title="Wishlist" onclick="event.stopPropagation();toggleWish('${p.id}')">${wished ? '♥' : '♡'}</button>
    </div>
    <div class="product-info">
      <div class="product-cat">${safe(p.category)}</div>
      <h3>${safe(p.name)}</h3>
      <div class="price">${rupiah(p.price)}</div>
      <div class="seller"><span>♙ ${safe(seller ? seller.name : 'Seller ReUse')}</span><span>⌖ ${safe(p.location)}</span></div>
      <div class="product-actions">
        <button class="btn btn-light" onclick="showDetail('${p.id}')">Detail</button>
        <button class="btn btn-primary" ${unavailable ? 'disabled' : ''} onclick="addCart('${p.id}')">＋ Keranjang</button>
      </div>
    </div>
  </article>`;
}

/* ---------------- Product detail ---------------- */
function showDetail(id) {
  const p = DB.productById(id);
  if (!p) { toast('Produk tidak ditemukan.', 'error'); return; }
  const user = Auth.currentUser();
  const isOwner = user && user.id === p.sellerId;
  const seller = sellerOf(p);
  const wished = user ? DB.wishlist().some(w => w.userId === user.id && w.productId === p.id) : false;
  if (p.status !== 'approved' || p.sold) {
    if (!isOwner && !(user && user.role === 'admin')) {
      openModal(`<h2>Produk tidak tersedia</h2><p class="modal-sub">Produk ini belum disetujui admin atau sudah tidak dijual lagi.</p>
        <div class="modal-actions"><a class="btn btn-primary" href="#/explore" onclick="closeModal()">Lihat produk lain</a></div>`, 'small');
      return;
    }
  }
  openModal(`
    <div class="detail-grid">
      <img src="${safe(productImage(p))}" alt="${safe(p.name)}" onerror="this.src='${PLACEHOLDER}'">
      <div class="detail-copy">
        <span class="product-cat">${safe(p.category)} · ${safe(p.condition)}</span>
        <h2 style="margin:8px 0 4px">${safe(p.name)}</h2>
        <div class="detail-price">${rupiah(p.price)}</div>
        ${isOwner || (user && user.role === 'admin') ? `<div style="margin-top:8px">${statusBadge(p.status, p.sold)}</div>` : ''}
        <p>${safe(p.description)}</p>
        <div class="meta-list">
          <div><b>Penjual:</b> ${safe(seller ? seller.name : 'Seller ReUse')} ${seller ? `· <button style="border:0;background:none;color:var(--forest);font-weight:750;padding:0;text-decoration:underline;font-size:12.5px" onclick="openSellerProfile('${seller.id}')">Lihat profil</button>` : ''}</div>
          <div><b>Lokasi:</b> ${safe(p.location)}</div>
          <div><b>Kondisi:</b> ${safe(p.condition)}</div>
          <div><b>Diunggah:</b> ${fmtDate(p.createdAt)}</div>
        </div>
        ${p.sold ? '<div class="hint warn" style="margin-top:12px">Produk ini sudah ditandai terjual.</div>' : ''}
        <button class="btn btn-primary btn-block" style="margin-top:14px" ${(p.status !== 'approved' || p.sold) ? 'disabled' : ''} onclick="addCart('${p.id}');closeModal()">＋ Tambah ke Keranjang</button>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <button class="btn btn-outline" style="flex:1;min-width:120px" onclick="toggleWish('${p.id}');showDetail('${p.id}')">${wished ? '♥ Wishlist' : '♡ Simpan ke Wishlist'}</button>
          <button class="btn btn-outline" style="flex:1;min-width:120px" onclick="openReport('${p.id}')">⚑ Laporkan</button>
        </div>
      </div>
    </div>`);
}

function openSellerProfile(sellerId) {
  const seller = DB.userById(sellerId);
  if (!seller) return;
  const items = DB.products().filter(p => p.sellerId === sellerId && p.status === 'approved' && !p.sold);
  openModal(`
    <div style="display:flex;gap:14px;align-items:center">
      ${avatarHtml(seller, 'lg')}
      <div><h2 style="margin:0">${safe(seller.name)}</h2>
        <div class="small">@${safe(seller.username)} · ${seller.role === 'seller' ? 'Seller' : seller.role === 'admin' ? 'Administrator' : 'Customer'}</div>
        <div class="small">Bergabung ${fmtDate(seller.createdAt)}</div>
      </div>
    </div>
    <div class="meta-list" style="margin-top:14px">
      <div><b>Lokasi:</b> ${safe(seller.location)}</div>
      <div><b>WhatsApp:</b> ${safe(seller.phone)}</div>
      <div><b>Produk aktif:</b> ${items.length}</div>
    </div>
    <h3 style="margin:18px 0 10px;color:var(--forest);font-size:15px">Produk dari penjual ini</h3>
    ${items.length ? items.map(p => `
      <div class="cart-row" style="cursor:pointer" onclick="showDetail('${p.id}')">
        <img src="${safe(productImage(p))}" alt="${safe(p.name)}">
        <div class="cart-row-info"><strong>${safe(p.name)}</strong><small>${rupiah(p.price)} · ${safe(p.condition)}</small></div>
        <span class="small">${safe(p.location)}</span>
      </div>`).join('') : '<div class="empty" style="padding:26px">Belum ada produk aktif.</div>'}
  `);
}

/* ---------------- Wishlist ---------------- */
function toggleWish(id) {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk menggunakan wishlist.', 'info'); navigate('/login'); return; }
  const p = DB.productById(id);
  if (!p) return;
  let list = DB.wishlist();
  const exists = list.some(w => w.userId === user.id && w.productId === id);
  if (exists) {
    list = list.filter(w => !(w.userId === user.id && w.productId === id));
    toast('Produk dihapus dari wishlist.', 'info');
  } else {
    list.push({ userId: user.id, productId: id });
    toast('Produk disimpan ke wishlist.', 'success');
  }
  DB.saveWishlist(list);
  syncCounts();
  refreshGrids();
  if (document.getElementById('wishBody')) renderWishlist();
}
function openWishlist() {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk melihat wishlist.', 'info'); navigate('/login'); return; }
  openModal(`<h2>Wishlist Kamu</h2><p class="modal-sub">Barang yang kamu simpan untuk dipertimbangkan.</p><div id="wishBody"></div>`, 'small');
  renderWishlist();
}
function renderWishlist() {
  const body = document.getElementById('wishBody');
  if (!body) return;
  const user = Auth.currentUser();
  const list = DB.wishlist().filter(w => w.userId === user.id).map(w => DB.productById(w.productId)).filter(Boolean);
  body.innerHTML = list.length ? list.map(p => `
    <div class="cart-row">
      <img src="${safe(productImage(p))}" alt="${safe(p.name)}">
      <div class="cart-row-info"><strong>${safe(p.name)}</strong><small>${rupiah(p.price)} · ${statusBadge(p.status, p.sold)}</small></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn btn-light btn-sm" onclick="closeModal();showDetail('${p.id}')">Detail</button>
        <button class="btn btn-outline btn-sm" onclick="removeWish('${p.id}')">Hapus</button>
      </div>
    </div>`).join('') : '<div class="empty" style="padding:30px">Wishlist masih kosong.<br><span class="small">Tekan ikon hati pada produk untuk menyimpannya.</span></div>';
}
function removeWish(id) {
  const user = Auth.currentUser();
  if (!user) return;
  DB.saveWishlist(DB.wishlist().filter(w => !(w.userId === user.id && w.productId === id)));
  syncCounts(); refreshGrids(); renderWishlist();
  toast('Produk dihapus dari wishlist.', 'info');
}

/* ---------------- Cart ---------------- */
function addCart(id) {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk menambahkan produk ke keranjang.', 'info'); navigate('/login'); return; }
  if (user.role === 'admin') { toast('Akun administrator tidak menggunakan keranjang.', 'info'); return; }
  const p = DB.productById(id);
  if (!p || p.status !== 'approved' || p.sold) { toast('Produk sudah tidak tersedia.', 'error'); return; }
  const cart = DB.cart();
  const row = cart.find(c => c.userId === user.id && c.productId === id);
  if (row) row.quantity += 1;
  else cart.push({ userId: user.id, productId: id, quantity: 1 });
  DB.saveCart(cart);
  syncCounts();
  toast(p.name + ' ditambahkan ke keranjang.', 'success');
}
function openCart() {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk membuka keranjang.', 'info'); navigate('/login'); return; }
  openModal(`<h2>Keranjang Belanja</h2><p class="modal-sub">Periksa produk lalu lanjutkan checkout ke penjual.</p><div id="cartBody"></div>`, 'small');
  renderCart();
}
function renderCart() {
  const body = document.getElementById('cartBody');
  if (!body) return;
  const user = Auth.currentUser();
  const rows = DB.cart().filter(c => c.userId === user.id).map(c => ({ ...c, product: DB.productById(c.productId) })).filter(r => r.product);
  if (!rows.length) {
    body.innerHTML = '<div class="empty" style="padding:30px">Keranjang kamu masih kosong.<br><span class="small">Tambahkan produk dari katalog ReUse.</span></div>';
    return;
  }
  const available = rows.filter(r => r.product.status === 'approved' && !r.product.sold);
  const total = available.reduce((s, r) => s + r.product.price * r.quantity, 0);
  body.innerHTML = rows.map(r => {
    const ok = r.product.status === 'approved' && !r.product.sold;
    return `<div class="cart-row">
      <img src="${safe(productImage(r.product))}" alt="${safe(r.product.name)}">
      <div class="cart-row-info">
        <strong>${safe(r.product.name)}</strong>
        <small>${rupiah(r.product.price)} · ${safe(r.product.condition)}</small>
        ${ok ? '' : '<small style="color:var(--danger);display:block">Tidak tersedia lagi</small>'}
      </div>
      <div class="qty">
        <button onclick="changeQty('${r.productId}',-1)" ${ok ? '' : 'disabled'}>−</button>${r.quantity}<button onclick="changeQty('${r.productId}',1)" ${ok ? '' : 'disabled'}>+</button>
      </div>
      <button style="border:0;background:none;color:#b65d52;font-size:18px" title="Hapus" onclick="removeCart('${r.productId}')">×</button>
    </div>`;
  }).join('') + `
    <div class="cart-total"><span>Total</span><span>${rupiah(total)}</span></div>
    <div class="hint">Produk dari penjual berbeda akan dibuat menjadi pesan WhatsApp terpisah. Pembayaran dan konfirmasi dilakukan langsung dengan penjual.</div>
    <button class="btn btn-primary btn-block" onclick="checkout()" ${available.length ? '' : 'disabled'}>Checkout via WhatsApp ↗</button>`;
}
function changeQty(id, delta) {
  const user = Auth.currentUser();
  const cart = DB.cart();
  const row = cart.find(c => c.userId === user.id && c.productId === id);
  if (!row) return;
  row.quantity += delta;
  const next = row.quantity < 1 ? cart.filter(c => !(c.userId === user.id && c.productId === id)) : cart;
  DB.saveCart(next);
  syncCounts(); renderCart();
}
function removeCart(id) {
  const user = Auth.currentUser();
  DB.saveCart(DB.cart().filter(c => !(c.userId === user.id && c.productId === id)));
  syncCounts(); renderCart();
  toast('Produk dihapus dari keranjang.', 'info');
}
function checkout() {
  const user = Auth.currentUser();
  if (!user) { navigate('/login'); return; }
  const cart = DB.cart().filter(c => c.userId === user.id);
  const valid = [];
  cart.forEach(c => {
    const p = DB.productById(c.productId);
    if (p && p.status === 'approved' && !p.sold) valid.push({ item: c, product: p });
  });
  if (!valid.length) { toast('Tidak ada produk tersedia di keranjang.', 'error'); return; }
  const groups = {};
  valid.forEach(v => {
    const key = v.product.sellerId;
    (groups[key] = groups[key] || []).push(v);
  });
  const sellers = Object.keys(groups);
  const missing = sellers.filter(id => {
    const s = DB.userById(id);
    return !(s && s.phone) && !groups[id][0].product.phone;
  });
  if (missing.length) {
    toast('Nomor WhatsApp penjual belum tersedia untuk: ' + missing.map(id => (DB.userById(id) || {}).name || id).join(', '), 'error');
    return;
  }
  sellers.forEach(id => {
    const entries = groups[id];
    const seller = DB.userById(id);
    const phone = (seller && seller.phone) || entries[0].product.phone;
    const lines = [
      'Halo ' + (seller ? seller.name : 'Penjual') + ', saya ' + user.name + ' menemukan produk kamu di ReUse.',
      '',
      ...entries.map(x => `Produk: ${x.product.name}\nHarga: ${rupiah(x.product.price)}\nJumlah: ${x.item.quantity}\nSubtotal: ${rupiah(x.product.price * x.item.quantity)}`),
      '',
      'Total: ' + rupiah(entries.reduce((s, x) => s + x.product.price * x.item.quantity, 0)),
      '',
      'Apakah produk masih tersedia? Terima kasih.'
    ];
    window.open(waLink(phone, lines.join('\n')), '_blank');
  });
  DB.saveCart(DB.cart().filter(c => c.userId !== user.id));
  syncCounts();
  closeModal();
  toast('Checkout dibuka di WhatsApp. Lanjutkan konfirmasi dengan penjual.', 'success');
}

/* ---------------- Report product ---------------- */
function openReport(productId) {
  const user = Auth.currentUser();
  if (!user) { toast('Silakan login untuk melaporkan produk.', 'info'); navigate('/login'); return; }
  if (user.role === 'admin') { toast('Admin menangani laporan dari panel Reports.', 'info'); return; }
  const p = DB.productById(productId);
  openModal(`
    <h2>Laporkan Produk</h2>
    <p class="modal-sub">${safe(p ? p.name : 'Produk')} — laporan akan ditinjau administrator ReUse.</p>
    <div class="alert" id="reportAlert"></div>
    <form onsubmit="submitReport(event, '${productId}')">
      <div class="field"><label>Alasan laporan</label>
        <select name="reason">
          <option>Produk mencurigakan</option>
          <option>Informasi produk tidak sesuai</option>
          <option>Dugaan penipuan</option>
          <option>Konten melanggar ketentuan</option>
        </select>
      </div>
      <div class="field"><label>Deskripsi laporan</label><textarea name="description" placeholder="Jelaskan detail masalah yang kamu temukan..." required></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">Kirim Laporan</button>
    </form>
    <div class="hint">Laporan palsu atau tidak valid dapat ditolak administrator.</div>
  `, 'small');
}
function submitReport(e, productId) {
  e.preventDefault();
  const user = Auth.currentUser();
  const f = e.target;
  const description = f.description.value.trim();
  if (description.length < 10) { setAlert('reportAlert', 'error', 'Deskripsi laporan minimal 10 karakter.'); return; }
  const reports = DB.reports();
  reports.unshift({
    id: uid('r'),
    reporterId: user.id,
    productId: productId,
    reason: f.reason.value,
    description,
    status: 'open',
    createdAt: new Date().toISOString()
  });
  DB.saveReports(reports);
  closeModal();
  toast('Laporan terkirim. Admin akan meninjau dalam waktu dekat.', 'success');
}

/* ---------------- Seller entry point ---------------- */
function startSelling() {
  const user = Auth.currentUser();
  if (!user) { toast('Daftar atau login sebagai seller untuk mulai menjual.', 'info'); navigate('/register'); return; }
  if (user.role === 'seller') { pendingNewProduct = true; sellerTab = 'products'; navigate('/seller'); return; }
  if (user.role === 'admin') { toast('Login sebagai seller untuk menambahkan produk.', 'info'); return; }
  toast('Akun customer belum dapat menjual. Daftar akun seller untuk membuka Seller Dashboard.', 'info');
}

function refreshGrids() {
  if (document.getElementById('homeGrid')) renderHomeGrid();
  if (document.getElementById('exploreGrid')) renderExploreGrid();
}
function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
