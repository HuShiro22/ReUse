/* ============================================================
   ReUse v2.0 — Data layer (localStorage demo store)
   NOTE: This is a front-end prototype. localStorage and the
   client-side hash below are for demonstration only and are NOT
   a production authentication mechanism.
   ============================================================ */
const KEYS = {
  users: 'reuse_v2_users',
  products: 'reuse_v2_products',
  cart: 'reuse_v2_cart',
  wishlist: 'reuse_v2_wishlist',
  reports: 'reuse_v2_reports',
  logs: 'reuse_v2_logs',
  categories: 'reuse_v2_categories',
  session: 'reuse_v2_session',
  meta: 'reuse_v2_meta'
};

const PLACEHOLDER = 'https://placehold.co/600x450/e9efe8/244c3a?text=ReUse';
const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'Needs Repair'];
const PRODUCT_STATUSES = ['pending', 'approved', 'rejected', 'removed'];
const REPORT_STATUSES = ['open', 'under_review', 'resolved', 'rejected'];

/* Demo-only deterministic password hash (NOT production safe) */
function hashPassword(pw) {
  const str = 'reuse.demo.v2|' + String(pw);
  let h1 = 0x811c9dc5, h2 = 0xc9dc5118;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
    h2 = (h2 + c * 31) >>> 0; h2 = Math.imul(h2, 2246822519) >>> 0;
  }
  return 'd1$' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

const SEED_USERS = [
  { id: 'u-admin', name: 'Administrator ReUse', username: 'admin', email: 'admin@reuse.id', phone: '6281100000001', location: 'Banda Aceh', role: 'admin', status: 'active', passwordHash: hashPassword('admin123'), avatar: '', createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 'u-seller1', name: 'Nadia Putri', username: 'nadia', email: 'nadia@reuse.id', phone: '6281234567890', location: 'Banda Aceh', role: 'seller', status: 'active', passwordHash: hashPassword('nadia123'), avatar: '', createdAt: '2026-02-11T09:15:00.000Z' },
  { id: 'u-seller2', name: 'Fajar Ramadhan', username: 'rumahkedua', email: 'fajar@reuse.id', phone: '6281376543210', location: 'Aceh Besar', role: 'seller', status: 'active', passwordHash: hashPassword('fajar123'), avatar: '', createdAt: '2026-03-02T10:40:00.000Z' },
  { id: 'u-seller3', name: 'Second Time Store', username: 'secondtime', email: 'secondtime@reuse.id', phone: '6285299887711', location: 'Banda Aceh', role: 'seller', status: 'active', passwordHash: hashPassword('second123'), avatar: '', createdAt: '2026-09-14T06:20:00.000Z' },
  { id: 'u-customer1', name: 'Aisyah Humaira', username: 'aisyah', email: 'aisyah@reuse.id', phone: '6281166778899', location: 'Banda Aceh', role: 'customer', status: 'active', passwordHash: hashPassword('aisyah123'), avatar: '', createdAt: '2026-04-18T11:30:00.000Z' },
  { id: 'u-customer2', name: 'Budi Santoso', username: 'budi', email: 'budi@reuse.id', phone: '6281366770011', location: 'Aceh Besar', role: 'customer', status: 'active', passwordHash: hashPassword('budi123'), avatar: '', createdAt: '2026-06-22T07:05:00.000Z' },
  { id: 'u-customer3', name: 'Sari Dewi', username: 'sari', email: 'sari@reuse.id', phone: '6281155001122', location: 'Banda Aceh', role: 'customer', status: 'inactive', passwordHash: hashPassword('sari123'), avatar: '', createdAt: '2026-08-09T13:45:00.000Z' }
];

const SEED_PRODUCTS = [
  { id: 'p-1', sellerId: 'u-seller1', name: 'Lenovo ThinkPad T480', price: 2500000, category: 'Electronics', condition: 'Good', description: 'Laptop bekas yang masih layak digunakan untuk kuliah, pekerjaan, dan produktivitas sehari-hari. Intel Core i5, RAM 16 GB, SSD 256 GB, layar 14 inci.', image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6281234567890', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-09-02T08:20:00.000Z', updatedAt: '2026-09-02T08:20:00.000Z' },
  { id: 'p-2', sellerId: 'u-seller1', name: 'Jaket Denim Classic', price: 125000, category: 'Fashion', condition: 'Excellent', description: 'Jaket denim dengan kondisi sangat baik. Tidak ada sobekan dan kancing lengkap.', image: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6281234567890', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-20T10:00:00.000Z' },
  { id: 'p-3', sellerId: 'u-seller2', name: 'Kursi Kayu Minimalis', price: 180000, category: 'Furniture', condition: 'Good', description: 'Kursi kayu minimalis, kokoh dan masih nyaman digunakan. Terdapat sedikit bekas pemakaian.', image: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80', location: 'Aceh Besar', phone: '6281376543210', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-10-02T09:10:00.000Z', updatedAt: '2026-10-02T09:10:00.000Z' },
  { id: 'p-4', sellerId: 'u-seller2', name: 'Buku Atomic Habits', price: 65000, category: 'Books & Education', condition: 'Like New', description: 'Buku bacaan kondisi seperti baru, halaman bersih dan lengkap.', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6281376543210', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-10-14T14:25:00.000Z', updatedAt: '2026-10-14T14:25:00.000Z' },
  { id: 'p-5', sellerId: 'u-seller1', name: 'Lampu Meja Belajar', price: 85000, category: 'Home Living', condition: 'Good', description: 'Lampu meja belajar berfungsi normal. Cocok untuk meja kerja atau belajar.', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6281234567890', status: 'approved', sold: true, rejectionReason: '', createdAt: '2026-10-25T16:00:00.000Z', updatedAt: '2026-11-19T09:00:00.000Z' },
  { id: 'p-6', sellerId: 'u-seller3', name: 'Jam Tangan Vintage', price: 210000, category: 'Accessories & Collectibles', condition: 'Fair', description: 'Jam tangan bergaya vintage. Ada bekas pemakaian pada strap, fungsi berjalan normal.', image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6285299887711', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-11-02T11:40:00.000Z', updatedAt: '2026-11-02T11:40:00.000Z' },
  { id: 'p-7', sellerId: 'u-seller3', name: 'Headphone Wireless', price: 175000, category: 'Electronics', condition: 'Excellent', description: 'Headphone wireless, suara jernih dan koneksi Bluetooth normal. Termasuk kabel pengisi daya.', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80', location: 'Aceh Besar', phone: '6285299887711', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-11-10T07:30:00.000Z', updatedAt: '2026-11-10T07:30:00.000Z' },
  { id: 'p-8', sellerId: 'u-seller2', name: 'Sneakers Putih', price: 140000, category: 'Fashion', condition: 'Good', description: 'Sneakers kasual warna putih. Sol masih bagus dan nyaman digunakan.', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6281376543210', status: 'approved', sold: false, rejectionReason: '', createdAt: '2026-11-15T10:05:00.000Z', updatedAt: '2026-11-15T10:05:00.000Z' },
  { id: 'p-9', sellerId: 'u-seller2', name: 'Meja Kayu Jati', price: 650000, category: 'Furniture', condition: 'Excellent', description: 'Meja kayu jati solid ukuran 120x60 cm. Permukaan masih halus, siap dipakai.', image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80', location: 'Aceh Besar', phone: '6281376543210', status: 'pending', sold: false, rejectionReason: '', createdAt: '2026-11-20T08:15:00.000Z', updatedAt: '2026-11-20T08:15:00.000Z' },
  { id: 'p-10', sellerId: 'u-seller3', name: 'Kemeja Flanel Preloved', price: 95000, category: 'Fashion', condition: 'Good', description: 'Kemeja flanel ukuran L. Nyaman dipakai sehari-hari.', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', location: 'Banda Aceh', phone: '6285299887711', status: 'rejected', sold: false, rejectionReason: 'Foto produk tidak jelas dan deskripsi belum mencantumkan kondisi barang secara lengkap.', createdAt: '2026-11-18T12:00:00.000Z', updatedAt: '2026-11-19T04:30:00.000Z' }
];

const SEED_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electronics', icon: '⌁' },
  { id: 'cat-fashion', name: 'Fashion', icon: '♧' },
  { id: 'cat-furniture', name: 'Furniture', icon: '⌂' },
  { id: 'cat-books', name: 'Books & Education', icon: '▤' },
  { id: 'cat-home', name: 'Home Living', icon: '⌑' },
  { id: 'cat-accessories', name: 'Accessories & Collectibles', icon: '◇' }
];

const DB = {
  _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  _set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('Penyimpanan lokal penuh atau diblokir.', e); }
  },
  init() {
    if (!localStorage.getItem(KEYS.users)) {
      this._set(KEYS.users, SEED_USERS);
      this._set(KEYS.products, SEED_PRODUCTS);
      this._set(KEYS.categories, SEED_CATEGORIES);
      this._set(KEYS.cart, []);
      this._set(KEYS.wishlist, []);
      this._set(KEYS.reports, [{
        id: 'r-1', reporterId: 'u-customer1', productId: 'p-7', reason: 'Informasi tidak sesuai',
        description: 'Foto headphone pada iklan berbeda dengan barang yang dikirim menurut teman saya. Mohon dicek kembali.',
        status: 'open', createdAt: '2026-11-21T09:30:00.000Z'
      }]);
      this._set(KEYS.logs, []);
      this._set(KEYS.meta, { version: 2, introDone: false });
    }
    // Defensive: make sure every collection exists
    this._set(KEYS.cart, this._get(KEYS.cart, []));
    this._set(KEYS.wishlist, this._get(KEYS.wishlist, []));
    this._set(KEYS.reports, this._get(KEYS.reports, []));
    this._set(KEYS.logs, this._get(KEYS.logs, []));
    this._set(KEYS.categories, this._get(KEYS.categories, SEED_CATEGORIES));
    this._set(KEYS.meta, Object.assign({ version: 2, introDone: false }, this._get(KEYS.meta, {})));
  },
  users() { return this._get(KEYS.users, []); },
  saveUsers(v) { this._set(KEYS.users, v); },
  products() { return this._get(KEYS.products, []); },
  saveProducts(v) { this._set(KEYS.products, v); },
  cart() { return this._get(KEYS.cart, []); },
  saveCart(v) { this._set(KEYS.cart, v); },
  wishlist() { return this._get(KEYS.wishlist, []); },
  saveWishlist(v) { this._set(KEYS.wishlist, v); },
  reports() { return this._get(KEYS.reports, []); },
  saveReports(v) { this._set(KEYS.reports, v); },
  logs() { return this._get(KEYS.logs, []); },
  saveLogs(v) { this._set(KEYS.logs, v); },
  categories() { return this._get(KEYS.categories, []); },
  saveCategories(v) { this._set(KEYS.categories, v); },
  session() { return this._get(KEYS.session, null); },
  saveSession(v) { this._set(KEYS.session, v); },
  meta() { return this._get(KEYS.meta, { version: 2, introDone: false }); },
  saveMeta(v) { this._set(KEYS.meta, v); },
  userById(id) { return this.users().find(u => u.id === id) || null; },
  productById(id) { return this.products().find(p => p.id === id) || null; }
};

/* ---------- Shared formatting & escaping helpers ---------- */
function safe(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function rupiah(n) { return 'Rp' + Number(n || 0).toLocaleString('id-ID'); }
function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0] ? p[0].toUpperCase() : '').join('') || '?';
}
function avatarHtml(user, cls) {
  if (!user) return `<span class="avatar ${cls || ''}">?</span>`;
  const c = cls || '';
  if (user.avatar) return `<span class="avatar ${c}"><img src="${safe(user.avatar)}" alt="Foto profil ${safe(user.name)}"></span>`;
  return `<span class="avatar ${c}">${safe(initials(user.name))}</span>`;
}
function uid(prefix) {
  return (prefix || 'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function categoryIcon(name) {
  const c = DB.categories().find(x => x.name === name);
  return c ? c.icon : '◆';
}
function waLink(phone, text) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
}
function logAdmin(action, description, adminId) {
  const logs = DB.logs();
  logs.unshift({
    id: uid('log'),
    adminId: adminId || (Auth.currentUser() ? Auth.currentUser().id : 'u-admin'),
    action,
    description,
    timestamp: new Date().toISOString()
  });
  DB.saveLogs(logs.slice(0, 200));
}
function removeProductEverywhere(productId) {
  DB.saveProducts(DB.products().filter(p => p.id !== productId));
  DB.saveCart(DB.cart().filter(c => c.productId !== productId));
  DB.saveWishlist(DB.wishlist().filter(w => w.productId !== productId));
  const reports = DB.reports();
  let changed = false;
  reports.forEach(r => { if (r.productId === productId) { r.productId = null; changed = true; } });
  if (changed) DB.saveReports(reports);
}
