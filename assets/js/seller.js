/* ============================================================
   ReUse v2.0 — Seller dashboard & product management
   ============================================================ */
let sellerTab = 'overview';
let sellerFilters = { q: '', status: '', sort: 'newest' };
let pendingProductImage = null;
let pendingNewProduct = false;

function myProducts(user) {
  return DB.products().filter(p => p.sellerId === user.id);
}

function renderSeller() {
  const user = Auth.currentUser();
  if (!user) { navigate('/login'); return; }
  const mine = myProducts(user);
  const pending = mine.filter(p => p.status === 'pending').length;
  document.getElementById('app').innerHTML = `
  <div class="dash-head"><div class="container">
    <div class="inner">
      <div>
        <span class="kicker">SELLER WORKSPACE</span>
        <h1>Seller Dashboard</h1>
        <p class="sub">Halo ${safe(user.name.split(' ')[0])}, kelola produk dan pantau status moderasi kamu di sini.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        ${pending ? `<span class="badge badge-pending">${pending} produk menunggu review</span>` : ''}
        <button class="btn btn-primary" onclick="openProductForm()">＋ Add New Product</button>
        <button class="btn btn-outline" onclick="setSellerTab('orders')">Pesanan Masuk${activeOrderCount(user.id, 'seller') ? ' (' + activeOrderCount(user.id, 'seller') + ')' : ''}</button>
        <a class="btn btn-outline" href="#/explore">Lihat Katalog</a>
      </div>
    </div>
    <div style="margin:10px 0 0">${sellerTrustHtml(user.id)}</div>
    <div class="dash-tabs">
      <button class="dash-tab ${sellerTab === 'overview' ? 'active' : ''}" data-stab="overview" onclick="setSellerTab('overview')">Overview</button>
      <button class="dash-tab ${sellerTab === 'products' ? 'active' : ''}" data-stab="products" onclick="setSellerTab('products')">My Products (${mine.length})</button>
      <button class="dash-tab ${sellerTab === 'orders' ? 'active' : ''}" data-stab="orders" onclick="setSellerTab('orders')">Pesanan Masuk (${activeOrderCount(user.id, 'seller')})</button>
    </div>
  </div></div>
  <div class="page" style="padding-top:26px"><div class="container" id="sellerBody"></div></div>`;
  renderSellerBody();
  if (pendingNewProduct) {
    pendingNewProduct = false;
    setTimeout(() => openProductForm(), 80);
  }
}

function setSellerTab(tab) {
  sellerTab = tab;
  document.querySelectorAll('.dash-tab').forEach(b => b.classList.toggle('active', b.dataset.stab === tab));
  renderSellerBody();
}

function renderSellerBody() {
  const body = document.getElementById('sellerBody');
  if (!body) return;
  const user = Auth.currentUser();
  if (!user) return;
  if (sellerTab === 'overview') body.innerHTML = sellerOverviewHtml(user);
  else if (sellerTab === 'orders') body.innerHTML = sellerOrdersHtml(user);
  else body.innerHTML = sellerProductsHtml(user);
}

function sellerOverviewHtml(user) {
  const mine = myProducts(user);
  const stat = (icon, label, value, cls) => `<div class="stat ${cls || ''}"><div class="stat-icon">${icon}</div><div><b>${value}</b><span>${label}</span></div></div>`;
  const total = mine.length;
  const active = mine.filter(p => p.status === 'approved').length;
  const incoming = activeOrderCount(user.id, 'seller');
  const pending = mine.filter(p => p.status === 'pending').length;
  const rejected = mine.filter(p => p.status === 'rejected').length;
  const sold = mine.filter(p => p.sold).length;
  const recent = [...mine].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);
  return `
    <div class="stat-grid stats-3">
      ${stat('▦', 'Total Produk', total)}
      ${stat('✓', 'Produk Aktif', active, 'ok')}
      ${stat('◷', 'Menunggu Persetujuan', pending, 'warn')}
      ${stat('✕', 'Produk Ditolak', rejected, 'danger')}
      ${stat('⌂', 'Produk Terjual', sold)}
      ${stat('◉', 'Pesanan Masuk', incoming, 'ok')}
    </div>
    <div class="seller-cols">
      <div class="card">
        <div class="admin-section-title" style="margin-bottom:10px"><div><h2 style="font-size:16px">Produk Terbaru</h2><p>4 produk terakhir yang kamu unggah.</p></div>
          <button class="btn btn-light btn-sm" onclick="setSellerTab('products')">Lihat semua</button></div>
        ${recent.length ? recent.map(p => `
          <div class="cart-row" style="cursor:pointer" onclick="showDetail('${p.id}')">
            <img src="${safe(productImage(p))}" alt="${safe(p.name)}">
            <div class="cart-row-info"><strong>${safe(p.name)}</strong><small>${rupiah(p.price)} · ${safe(p.category)}</small></div>
            ${statusBadge(p.status, p.sold)}
          </div>`).join('') : '<div class="empty" style="padding:30px">Belum ada produk.<br><span class="small">Mulai dengan menekan Add New Product.</span></div>'}
      </div>
      <div class="card">
        <h3 style="font-size:16px;color:var(--forest);margin-bottom:6px">Tips Seller</h3>
        <p class="small">Produk baru berstatus <b>Pending</b> sampai disetujui admin. Pastikan foto jelas dan deskripsi jujur agar cepat disetujui.</p>
        <div class="hint" style="margin-top:14px">Nomor WhatsApp pada produk mengikuti profil akun kamu (${safe(user.phone)}), sehingga checkout pembeli selalu terarah ke nomor yang benar.</div>
        <div style="display:grid;gap:8px;margin-top:14px">
          <button class="btn btn-primary btn-block" onclick="openProductForm()">＋ Tambah Produk Baru</button>
          <button class="btn btn-outline btn-block" onclick="setSellerTab('products')">Kelola My Products</button>
          <button class="btn btn-outline btn-block" onclick="setSellerTab('orders')">Lihat Pesanan Masuk</button>
          <a class="btn btn-light btn-block" href="#/profile">Edit Profil Seller</a>
        </div>
      </div>
    </div>`;
}

function sellerProductsHtml(user) {
  const list = filteredSellerProducts(user);
  return `
    <div class="filter-bar">
      <div class="search"><span>⌕</span><input id="sellerSearch" type="search" value="${safe(sellerFilters.q)}" placeholder="Cari produk berdasarkan nama..." oninput="sellerFilters.q=this.value;renderSellerTable()"></div>
      <select id="sellerStatus" onchange="sellerFilters.status=this.value;renderSellerTable()">
        <option value="">Semua status</option>
        <option value="approved" ${sellerFilters.status === 'approved' ? 'selected' : ''}>Approved</option>
        <option value="pending" ${sellerFilters.status === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="rejected" ${sellerFilters.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        <option value="removed" ${sellerFilters.status === 'removed' ? 'selected' : ''}>Removed</option>
        <option value="sold" ${sellerFilters.status === 'sold' ? 'selected' : ''}>Terjual</option>
      </select>
      <select id="sellerSort" onchange="sellerFilters.sort=this.value;renderSellerTable()">
        <option value="newest" ${sellerFilters.sort === 'newest' ? 'selected' : ''}>Terbaru</option>
        <option value="oldest" ${sellerFilters.sort === 'oldest' ? 'selected' : ''}>Terlama</option>
        <option value="low" ${sellerFilters.sort === 'low' ? 'selected' : ''}>Harga terendah</option>
        <option value="high" ${sellerFilters.sort === 'high' ? 'selected' : ''}>Harga tertinggi</option>
        <option value="name" ${sellerFilters.sort === 'name' ? 'selected' : ''}>Nama A–Z</option>
      </select>
      <button class="btn btn-primary" onclick="openProductForm()">＋ Add New Product</button>
    </div>
    <div id="sellerTable">${sellerTableHtml(list)}</div>`;
}

function filteredSellerProducts(user) {
  let list = myProducts(user);
  const q = sellerFilters.q.toLowerCase().trim();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q));
  if (sellerFilters.status === 'sold') list = list.filter(p => p.sold);
  else if (sellerFilters.status) list = list.filter(p => p.status === sellerFilters.status);
  const sort = sellerFilters.sort;
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  else if (sort === 'high') list.sort((a, b) => b.price - a.price);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

function renderSellerTable() {
  const user = Auth.currentUser();
  const el = document.getElementById('sellerTable');
  if (!el || !user) return;
  el.innerHTML = sellerTableHtml(filteredSellerProducts(user));
}

function sellerTableHtml(list) {
  if (!list.length) {
    return `<div class="card">${emptyState('Belum ada produk pada filter ini', 'Tambahkan produk baru atau ubah filter pencarian.')}
      <div style="text-align:center;margin-top:14px"><button class="btn btn-primary" onclick="openProductForm()">＋ Add New Product</button></div></div>`;
  }
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Produk</th><th>Harga</th><th>Kategori</th><th>Kondisi</th><th>Diunggah</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${list.map(p => `
      <tr>
        <td><div class="cell-product">
          <img src="${safe(productImage(p))}" alt="${safe(p.name)}" onerror="this.src='${PLACEHOLDER}'">
          <div><strong>${safe(p.name)}</strong><small>${safe(p.location)}</small></div>
        </div></td>
        <td style="font-weight:800;color:var(--forest);white-space:nowrap">${rupiah(p.price)}</td>
        <td>${safe(p.category)}</td>
        <td>${safe(p.condition)}</td>
        <td style="white-space:nowrap">${fmtDate(p.createdAt)}</td>
        <td>${statusBadge(p.status, p.sold)}${p.status === 'rejected' && p.rejectionReason ? `<div class="small" style="color:var(--danger);max-width:180px;margin-top:4px">${safe(p.rejectionReason)}</div>` : ''}</td>
        <td><div class="row-actions">
          <button class="btn btn-light btn-sm" onclick="showDetail('${p.id}')" title="Lihat detail">Detail</button>
          <button class="btn btn-outline btn-sm" onclick="openProductForm('${p.id}')">Edit</button>
          ${!p.sold && p.status === 'approved' ? `<button class="btn btn-outline btn-sm" onclick="markSold('${p.id}')">Terjual</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
        </div></td>
      </tr>`).join('')}</tbody></table></div>
    <p class="small" style="margin-top:10px">Total ${list.length} produk ditampilkan. Seller hanya dapat mengubah atau menghapus produk miliknya sendiri.</p>`;
}

/* ---------------- Add / edit product ---------------- */
function openProductForm(id) {
  const user = Auth.currentUser();
  if (!user || user.role === 'admin') { toast('Login sebagai member untuk menambahkan produk.', 'error'); return; }
  const existing = id ? DB.productById(id) : null;
  if (existing && existing.sellerId !== user.id) {
    toast('Kamu hanya dapat mengedit produk milik sendiri.', 'error');
    return;
  }
  pendingProductImage = existing ? existing.image : null;
  const cats = DB.categories();
  openModal(`
    <h2>${existing ? 'Edit Produk' : 'Add New Product'}</h2>
    <p class="modal-sub">${existing ? 'Perbarui informasi produk kamu.' : 'Produk baru akan berstatus Pending sampai disetujui admin.'}</p>
    <div class="alert" id="productAlert"></div>
    <form onsubmit="saveProduct(event${existing ? ", '" + existing.id + "'" : ''})" novalidate>
      <div class="field"><label>Nama produk</label><input name="name" maxlength="80" value="${existing ? safe(existing.name) : ''}" placeholder="Contoh: Tas kanvas preloved"></div>
      <div class="form-row">
        <div class="field"><label>Harga (Rp)</label><input name="price" type="number" min="1" step="1000" value="${existing ? existing.price : ''}" placeholder="150000"></div>
        <div class="field"><label>Kondisi barang</label><select name="condition">${CONDITIONS.map(c => `<option ${existing && existing.condition === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Kategori</label><select name="category">${cats.map(c => `<option value="${safe(c.name)}" ${existing && existing.category === c.name ? 'selected' : ''}>${safe(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Deskripsi</label><textarea name="description" maxlength="2000" placeholder="Jelaskan kondisi, ukuran, dan detail barang...">${existing ? safe(existing.description) : ''}</textarea></div>
      <div class="field">
        <label>Foto produk</label>
        <div class="upload-row">
          <img id="productPreview" class="upload-preview" src="${existing ? safe(existing.image) : PLACEHOLDER}" alt="Pratinjau foto produk">
          <label class="btn btn-light btn-sm" style="cursor:pointer">Unggah Foto<input type="file" accept="image/*" style="display:none" onchange="onProductImage(event)"></label>
          <span class="small">atau tempel URL di bawah. Foto otomatis dikompres agar hemat penyimpanan.</span>
        </div>
        <input name="image" maxlength="600" value="${existing ? safe(existing.image) : ''}" placeholder="https://..." style="margin-top:9px" oninput="document.getElementById('productPreview').src=this.value||'${PLACEHOLDER}'">
      </div>
      <div class="form-row">
        <div class="field"><label>Lokasi</label><input name="location" maxlength="80" value="${existing ? safe(existing.location) : safe(user.location)}"></div>
        <div class="field"><label>Nomor WhatsApp</label><input name="phone" maxlength="20" value="${existing ? safe(existing.phone) : safe(user.phone)}"></div>
      </div>
      <div class="hint">${existing ? 'Mengedit produk yang ditolak akan mengirimkannya kembali untuk ditinjau admin.' : 'Seller ID mengikuti akun yang sedang login. Status awal: Pending.'}</div>
      <div class="modal-actions">
        <button class="btn btn-outline" type="button" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" type="submit">${existing ? 'Simpan Perubahan' : 'Tambahkan Produk'}</button>
      </div>
    </form>`, 'wide');
}

/* Kompres gambar ke JPEG maks. 1000 px agar muat di localStorage */
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) { reject(err); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function onProductImage(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('File harus berupa gambar.', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('Ukuran foto maksimal 5 MB.', 'error'); return; }
  const preview = document.getElementById('productPreview');
  if (preview) preview.style.opacity = '.5';
  compressImage(file, 1000, 0.72).then(dataUrl => {
    pendingProductImage = dataUrl;
    const pv = document.getElementById('productPreview');
    if (pv) { pv.src = dataUrl; pv.style.opacity = '1'; }
    const urlInput = document.querySelector('#modalBody input[name="image"]');
    if (urlInput) urlInput.value = '';
    toast('Foto siap digunakan (' + Math.round(dataUrl.length / 1024) + ' KB setelah dikompres).', 'info');
  }).catch(err => {
    console.error(err);
    if (preview) preview.style.opacity = '1';
    toast('Foto gagal diproses. Coba file lain.', 'error');
  });
}

function saveProduct(e, id) {
  e.preventDefault();
  const user = Auth.currentUser();
  if (!user || user.role === 'admin') return;
  const f = e.target;
  clearAlert('productAlert');
  const name = SEC.cleanText(f.name.value, 80);
  const price = Number(f.price.value);
  const category = SEC.cleanText(f.category.value, 60);
  const condition = SEC.cleanText(f.condition.value, 30);
  const description = SEC.cleanMultiline(f.description.value, 2000);
  const rawImage = f.image.value.trim();
  const safeImage = rawImage ? SEC.cleanUrl(rawImage) : '';
  const image = pendingProductImage || safeImage || PLACEHOLDER;
  const location = SEC.cleanText(f.location.value, 80);
  const phone = SEC.cleanText(f.phone.value, 20);

  if (name.length < 3) return setAlert('productAlert', 'error', 'Nama produk minimal 3 karakter.');
  if (!Number.isFinite(price) || price < 1 || price > 1000000000) return setAlert('productAlert', 'error', 'Harga harus antara Rp1 dan Rp1.000.000.000.');
  if (!DB.categories().some(c => c.name === category)) return setAlert('productAlert', 'error', 'Kategori tidak valid. Pilih dari daftar kategori.');
  if (rawImage && !safeImage) return setAlert('productAlert', 'error', 'URL foto harus diawali http:// atau https://.');
  if (!CONDITIONS.includes(condition)) return setAlert('productAlert', 'error', 'Kondisi barang tidak valid.');
  if (description.length < 20) return setAlert('productAlert', 'error', 'Deskripsi minimal 20 karakter agar pembeli yakin.');
  if (location.length < 3) return setAlert('productAlert', 'error', 'Lokasi minimal 3 karakter.');
  if (!/^\+?\d{9,15}$/.test(phone.replace(/[\s-]/g, ''))) return setAlert('productAlert', 'error', 'Nomor WhatsApp harus 9–15 digit.');

  const products = DB.products();
  const now = new Date().toISOString();
  if (id) {
    const idx = products.findIndex(p => p.id === id);
    if (idx < 0) return setAlert('productAlert', 'error', 'Produk tidak ditemukan.');
    if (products[idx].sellerId !== user.id) { toast('Kamu bukan pemilik produk ini.', 'error'); return; }
    const wasRejected = products[idx].status === 'rejected';
    products[idx] = Object.assign({}, products[idx], {
      name, price, category, condition, description, image, location, phone,
      status: wasRejected ? 'pending' : products[idx].status,
      rejectionReason: wasRejected ? '' : products[idx].rejectionReason,
      updatedAt: now
    });
    DB.saveProducts(products);
    if (!DB.productById(id) || DB.productById(id).updatedAt !== now) {
      setAlert('productAlert', 'error', 'Penyimpanan browser penuh. Gunakan foto yang lebih kecil atau tempel URL gambar.');
      return;
    }
    closeModal();
    toast(wasRejected ? 'Produk diperbarui dan dikirim ulang untuk ditinjau admin.' : 'Produk berhasil diperbarui.', 'success');
  } else {
    const product = {
      id: uid('p'), sellerId: user.id, name, price, category, condition, description,
      image, location, phone, status: 'pending', sold: false, rejectionReason: '',
      createdAt: now, updatedAt: now
    };
    products.unshift(product);
    DB.saveProducts(products);
    if (!DB.productById(product.id)) {
      setAlert('productAlert', 'error', 'Penyimpanan browser penuh. Gunakan foto yang lebih kecil atau tempel URL gambar.');
      return;
    }
    notify(user.id, 'Produk "' + name + '" berhasil diunggah dan menunggu persetujuan admin.', '/seller', 'product');
    closeModal();
    toast('Produk berhasil ditambahkan dan menunggu persetujuan admin.', 'success');
  }
  pendingProductImage = null;
  sellerTab = 'products';
  renderSeller();
  refreshGrids();
}

/* ---------------- Delete / sold ---------------- */
function deleteProduct(id) {
  const user = Auth.currentUser();
  if (!user || user.role === 'admin') return;
  const p = DB.productById(id);
  if (!p) { toast('Produk tidak ditemukan.', 'error'); return; }
  if (p.sellerId !== user.id) {
    toast('Kamu hanya boleh menghapus produk milik sendiri.', 'error');
    return;
  }
  confirmDialog({
    title: 'Hapus produk ini?',
    message: 'Produk "' + p.name + '" akan dihapus permanen dari My Products, katalog, wishlist, dan keranjang pembeli. Tindakan ini tidak dapat dibatalkan.',
    confirmText: 'Delete Product',
    cancelText: 'Cancel',
    danger: true
  }).then(ok => {
    if (!ok) return;
    removeProductEverywhere(id);
    toast('Produk berhasil dihapus.', 'success');
    renderSeller();
    refreshGrids();
    syncCounts();
  });
}

function markSold(id) {
  const user = Auth.currentUser();
  const p = DB.productById(id);
  if (!p || !user || p.sellerId !== user.id) { toast('Kamu bukan pemilik produk ini.', 'error'); return; }
  confirmDialog({
    title: 'Tandai produk terjual?',
    message: '"' + p.name + '" akan ditandai terjual dan tidak lagi tampil sebagai produk tersedia di katalog.',
    confirmText: 'Ya, Tandai Terjual',
    danger: false
  }).then(ok => {
    if (!ok) return;
    const products = DB.products();
    const idx = products.findIndex(x => x.id === id);
    products[idx].sold = true;
    products[idx].updatedAt = new Date().toISOString();
    DB.saveProducts(products);
    DB.saveCart(DB.cart().filter(c => c.productId !== id));
    DB.saveWishlist(DB.wishlist().filter(w => w.productId !== id));
    toast('Produk ditandai terjual.', 'success');
    renderSeller();
    refreshGrids();
    syncCounts();
  });
}
