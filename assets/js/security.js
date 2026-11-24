/* ============================================================
   ReUse v2.0 — Lapisan keamanan (client-side, demo)
   Catatan penting: semua kontrol di file ini berjalan di browser,
   jadi hanya meniru praktik produksi (rate limit, MFA, validasi).
   Pada produksi, autentikasi, MFA, rate limit, dan validasi wajib
   ditegakkan di server. Lihat halaman Kebijakan Privasi & Keamanan.
   ============================================================ */
const SEC = {
  POLICY: {
    maxAttempts: 5,              // percobaan login gagal sebelum dikunci
    windowMs: 15 * 60 * 1000,    // jendela hitung percobaan
    lockMs: 5 * 60 * 1000,       // durasi kunci sementara
    idleMs: 30 * 60 * 1000,      // sesi berakhir setelah 30 menit idle
    logDays: 90,                 // retensi log (90 hari)
    maxTextLength: 2000
  },
  _idleExpired: false,

  /* ---------------- Sanitasi & validasi input ---------------- */
  cleanText(value, max) {
    const limit = max || this.POLICY.maxTextLength;
    return String(value === undefined || value === null ? '' : value)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit);
  },
  cleanMultiline(value, max) {
    const limit = max || this.POLICY.maxTextLength;
    return String(value === undefined || value === null ? '' : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, limit);
  },
  /* Hanya http(s) dan data:image yang diterima. Menolak javascript:, data:text/html, dll. */
  cleanUrl(value) {
    const raw = String(value === undefined || value === null ? '' : value).trim();
    if (!raw) return '';
    if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(raw)) {
      return raw.length <= 600000 ? raw : '';
    }
    try {
      const u = new URL(raw);
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    } catch (e) { /* bukan URL absolut */ }
    return '';
  },
  isNumericId(value) {
    return /^[A-Za-z0-9._-]{1,64}$/.test(String(value || ''));
  },
  passwordIssues(password) {
    const pw = String(password || '');
    const issues = [];
    if (pw.length < 8) issues.push('minimal 8 karakter');
    if (!/[a-zA-Z]/.test(pw)) issues.push('mengandung huruf');
    if (!/\d/.test(pw)) issues.push('mengandung angka');
    return issues;
  },

  /* ---------------- Rate limiting percobaan login ---------------- */
  _attemptKey(identifier) {
    return String(identifier || '').trim().toLowerCase().slice(0, 80) || 'unknown';
  },
  _attempts() { return DB._get(KEYS.attempts, {}); },
  _saveAttempts(list) { DB._set(KEYS.attempts, list); },
  lockState(identifier) {
    const key = this._attemptKey(identifier);
    const all = this._attempts();
    const rec = all[key];
    const now = Date.now();
    if (!rec) return { locked: false, attemptsLeft: this.POLICY.maxAttempts };
    if (rec.lockUntil && rec.lockUntil > now) {
      return { locked: true, msLeft: rec.lockUntil - now, attemptsLeft: 0 };
    }
    if (rec.lockUntil && rec.lockUntil <= now) {
      delete all[key];
      this._saveAttempts(all);
      return { locked: false, attemptsLeft: this.POLICY.maxAttempts };
    }
    const hits = (rec.hits || []).filter(t => now - t < this.POLICY.windowMs);
    return { locked: false, attemptsLeft: Math.max(0, this.POLICY.maxAttempts - hits.length) };
  },
  recordFailure(identifier) {
    const key = this._attemptKey(identifier);
    const now = Date.now();
    const all = this._attempts();
    const rec = all[key] || { hits: [], lockUntil: 0 };
    rec.hits = (rec.hits || []).filter(t => now - t < this.POLICY.windowMs);
    rec.hits.push(now);
    let locked = false;
    if (rec.hits.length >= this.POLICY.maxAttempts) {
      rec.lockUntil = now + this.POLICY.lockMs;
      rec.hits = [];
      locked = true;
    }
    all[key] = rec;
    // Buang catatan kedaluwarsa agar penyimpanan tidak menumpuk
    Object.keys(all).forEach(k => {
      const r = all[k];
      const expiry = Math.max(r.lockUntil || 0, ...(r.hits || [now]));
      if (expiry && now - expiry > this.POLICY.windowMs) delete all[k];
    });
    this._saveAttempts(all);
    return { locked, attemptsLeft: Math.max(0, this.POLICY.maxAttempts - rec.hits.length) };
  },
  resetAttempts(identifier) {
    const key = this._attemptKey(identifier);
    const all = this._attempts();
    if (all[key]) { delete all[key]; this._saveAttempts(all); }
  },

  /* ---------------- MFA administrator (TOTP-like, demo) ---------------- */
  mfaSecret(user) {
    if (!user) return '';
    if (user.mfaSecret) return user.mfaSecret;
    // Rahasia per akun, deterministik agar kode tetap sama setelah reload.
    return 'reuse-mfa|' + user.id + '|' + (user.username || '') + '|' + String(user.passwordHash || '').slice(0, 10);
  },
  mfaCode(secret, atMs) {
    const step = Math.floor((atMs || Date.now()) / 30000);
    const digest = hashPassword(secret + '|' + step).replace(/[^0-9a-f]/g, '');
    const num = parseInt(digest.slice(0, 8), 16) % 1000000;
    return String(num).padStart(6, '0');
  },
  verifyMfa(user, code) {
    const clean = String(code || '').replace(/\D/g, '');
    if (clean.length !== 6 || !user) return false;
    const secret = this.mfaSecret(user);
    const now = Date.now();
    return [-1, 0, 1].some(offset => this.mfaCode(secret, now + offset * 30000) === clean);
  },
  mfaSecondsLeft() {
    return 30 - Math.floor((Date.now() % 30000) / 1000);
  },

  /* ---------------- Sesi ---------------- */
  openSession(user) {
    DB.saveSession({
      userId: user.id,
      at: new Date().toISOString(),
      lastSeen: Date.now(),
      agent: String(navigator.userAgent || '').slice(0, 120)
    });
  },
  touchSession() {
    const s = DB.session();
    if (!s || !s.userId) return;
    s.lastSeen = Date.now();
    DB.saveSession(s);
  },
  sessionExpired(session) {
    if (!session || !session.lastSeen) return false;
    return Date.now() - session.lastSeen > this.POLICY.idleMs;
  },
  consumeIdleFlag() {
    const v = this._idleExpired;
    this._idleExpired = false;
    return v;
  },

  /* ---------------- Log keamanan ---------------- */
  log(event, detail) {
    const list = DB._get(KEYS.securityLogs, []);
    list.unshift({
      id: uid('sec'),
      event: String(event || 'event').slice(0, 40),
      detail: this.cleanText(detail, 300),
      at: new Date().toISOString()
    });
    DB._set(KEYS.securityLogs, list.slice(0, 300));
  },
  logs() { return DB._get(KEYS.securityLogs, []); },
  clearLogs() { DB._set(KEYS.securityLogs, []); },
  prune() {
    const cut = Date.now() - this.POLICY.logDays * 24 * 60 * 60 * 1000;
    const logs = DB.logs().filter(l => new Date(l.timestamp).getTime() >= cut).slice(0, 500);
    DB.saveLogs(logs);
    const sec = this.logs().filter(l => new Date(l.at).getTime() >= cut).slice(0, 300);
    DB._set(KEYS.securityLogs, sec);
    if (DB.session() && !DB.session().lastSeen) {
      const s = DB.session();
      s.lastSeen = Date.now();
      DB.saveSession(s);
    }
  },

  /* ---------------- Backup & pemulihan ---------------- */
  exportData() {
    const users = DB.users().map(u => ({
      id: u.id, name: u.name, username: u.username, email: u.email, phone: u.phone,
      location: u.location, role: u.role, status: u.status, passwordHash: u.passwordHash,
      avatar: '', createdAt: u.createdAt
    }));
    return JSON.stringify({
      app: 'ReUse',
      version: 2,
      exportedAt: new Date().toISOString(),
      note: 'Snapshot demo. Berisi hash password demo; simpan file ini secara privat.',
      users,
      products: DB.products(),
      categories: DB.categories(),
      reports: DB.reports(),
      logs: DB.logs(),
      securityLogs: this.logs(),
      meta: DB.meta()
    }, null, 2);
  },
  importData(text) {
    let data;
    try { data = JSON.parse(String(text || '')); }
    catch (e) { return { ok: false, error: 'File backup tidak valid (bukan JSON).' }; }
    if (!data || data.app !== 'ReUse' || !Array.isArray(data.users) || !Array.isArray(data.products)) {
      return { ok: false, error: 'Struktur backup tidak dikenali.' };
    }
    const users = data.users.filter(u => u && u.id && u.username && u.passwordHash && u.role);
    if (!users.length) return { ok: false, error: 'Backup tidak berisi akun yang valid.' };
    const products = data.products.filter(p => p && p.id && p.name && p.sellerId);
    const categories = Array.isArray(data.categories) && data.categories.length ? data.categories : SEED_CATEGORIES;
    DB.saveUsers(users);
    DB.saveProducts(products);
    DB.saveCategories(categories);
    DB.saveReports(Array.isArray(data.reports) ? data.reports : []);
    DB.saveLogs(Array.isArray(data.logs) ? data.logs : []);
    DB._set(KEYS.securityLogs, Array.isArray(data.securityLogs) ? data.securityLogs : []);
    DB.saveMeta(Object.assign({ version: 2, introDone: true }, data.meta || {}));
    return { ok: true, counts: { users: users.length, products: products.length, categories: categories.length } };
  }
};
