#!/usr/bin/env node
/**
 * sync-directory.js — Đồng bộ danh bạ nhân sự từ Google Sheet -> Supabase.
 *
 * Chạy trên GitHub Actions mỗi 30 phút (và khi chạy tay).
 * Nguồn: Sheet "Danh bạ nhân sự FASTCARE — Web E-learning" (tab "Data E-Learning"),
 *        đọc qua CSV export công khai (Sheet đã mở "ai có link cũng xem được").
 * Đích: bảng staff_directory (upsert theo email) + bảng profiles (cập nhật thông
 *        tin cho tài khoản có email khớp danh bạ) + bảng app_meta (ghi tổng số
 *        dòng danh bạ = tổng nhân sự công ty, để web hiển thị hạng dạng 4/210).
 *
 * AN TOÀN:
 * - KHÔNG xóa dòng nào, KHÔNG động vào XP / tiến trình học / Auth / role.
 * - KHÔNG sửa hồ sơ của tài khoản Quản trị viên (role = 'admin').
 * - Email trùng trong Sheet thì chỉ lấy dòng đầu, ghi cảnh báo, không làm hỏng đợt chạy.
 * - Ngày vào (start_date): nếu Sheet không có cột này hoặc ô trống thì GIỮ NGUYÊN
 *   giá trị cũ trong DB, không ghi đè thành null.
 *
 * Biến môi trường (GitHub Secrets / workflow env):
 *   SHEET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const SHEET_ID = process.env.SHEET_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHEET_TAB = process.env.SHEET_TAB || 'Data E-Learning';

if (!SHEET_ID || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Thiếu biến môi trường: cần SHEET_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// ---------- Đọc CSV ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

function normHeader(h) {
  return String(h || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findCol(headers, candidates) {
  for (const cand of candidates) {
    const idx = headers.findIndex((h) => normHeader(h) === cand);
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseStartDate(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]); const mo = Number(m[2]); const y = Number(m[3]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

// ---------- Gọi Supabase REST (PostgREST) ----------
async function sb(path, { method = 'GET', body = null } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  // 1. Tải CSV từ Sheet
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`;
  const csvRes = await fetch(csvUrl);
  if (!csvRes.ok) {
    throw new Error(`Không tải được Sheet (HTTP ${csvRes.status}). Kiểm tra quyền chia sẻ link của Sheet.`);
  }
  const csvText = await csvRes.text();
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error('Sheet trống hoặc không đọc được dòng tiêu đề.');

  // 2. Map cột theo tên tiêu đề (chịu được việc Kem đổi thứ tự cột)
  const headers = rows[0];
  const col = {
    email: findCol(headers, ['email']),
    code: findCol(headers, ['ma nhan su', 'ma ns', 'ma nhan vien']),
    name: findCol(headers, ['ho ten', 'ten']),
    position: findCol(headers, ['vi tri']),
    dept: findCol(headers, ['phong ban chi nhanh', 'phong ban', 'chi nhanh', 'don vi']),
    start: findCol(headers, ['ngay vao', 'ngay vao lam']),
  };
  if (col.email < 0 || col.name < 0) {
    throw new Error(`Không tìm thấy cột Email / Họ tên trong Sheet. Tiêu đề hiện tại: ${headers.join(' | ')}`);
  }

  // 3. Gom dòng danh bạ (chỉ dòng có email hợp lệ; trùng email thì lấy dòng đầu)
  const dirRows = [];
  const seen = new Set();
  const warnings = [];
  for (const r of rows.slice(1)) {
    const get = (i) => (i >= 0 && i < r.length ? String(r[i]).trim() : '');
    const email = get(col.email).toLowerCase();
    const name = get(col.name);
    if (!email && !name) continue; // dòng trống
    if (!validEmail(email)) { warnings.push(`Bỏ qua dòng không có email hợp lệ: "${name}" (mã ${get(col.code) || '?'})`); continue; }
    if (seen.has(email)) { warnings.push(`Email trùng trong Sheet, chỉ lấy dòng đầu: ${email}`); continue; }
    seen.add(email);
    const rec = {
      email,
      employee_code: get(col.code) || null,
      full_name: name || null,
      position: get(col.position) || null,
      department: get(col.dept) || null,
      updated_at: new Date().toISOString(),
    };
    const sd = parseStartDate(get(col.start));
    if (sd) rec.start_date = sd; // không có ngày thì bỏ qua, giữ giá trị cũ trong DB
    dirRows.push(rec);
  }
  console.log(`Sheet: ${rows.length - 1} dòng dữ liệu, ${dirRows.length} email hợp lệ, ${warnings.length} cảnh báo.`);
  warnings.forEach((w) => console.log('  CẢNH BÁO: ' + w));
  if (dirRows.length === 0) throw new Error('Không có email hợp lệ nào trong Sheet, dừng để tránh ghi đè sai.');

  // 4. Upsert staff_directory theo email (email là primary key)
  let dirUpserted = 0;
  const BATCH = 100;
  for (let i = 0; i < dirRows.length; i += BATCH) {
    await sb('/staff_directory?on_conflict=email', { method: 'POST', body: dirRows.slice(i, i + BATCH) });
    dirUpserted += Math.min(BATCH, dirRows.length - i);
  }
  console.log(`staff_directory: đã upsert ${dirUpserted} dòng.`);

  // 5. Đồng bộ profiles: tài khoản nào có email khớp danh bạ thì điền vị trí/phòng ban/...
  const profiles = await sb('/profiles?select=id,email,role,full_name,employee_code,position,department,start_date,is_approved&limit=1000');
  const byEmail = new Map();
  for (const p of profiles) {
    if (p.email) byEmail.set(String(p.email).toLowerCase(), p);
  }
  let profilesUpdated = 0;
  let profilesMatched = 0;
  for (const rec of dirRows) {
    const p = byEmail.get(rec.email);
    if (!p) continue;
    profilesMatched++;
    if (p.role === 'admin') continue; // không động vào tài khoản Quản trị viên
    const patch = {};
    if (rec.full_name && p.full_name !== rec.full_name) patch.full_name = rec.full_name;
    if (rec.employee_code && p.employee_code !== rec.employee_code) patch.employee_code = rec.employee_code;
    if (rec.position && p.position !== rec.position) patch.position = rec.position;
    if (rec.department && p.department !== rec.department) patch.department = rec.department;
    if (rec.start_date && p.start_date !== rec.start_date) patch.start_date = rec.start_date;
    if (p.is_approved !== true) patch.is_approved = true;
    if (Object.keys(patch).length === 0) continue;
    await sb(`/profiles?id=eq.${p.id}`, { method: 'PATCH', body: patch });
    profilesUpdated++;
  }
  console.log(`profiles: ${profilesMatched} tài khoản khớp email danh bạ, đã cập nhật ${profilesUpdated} hồ sơ (bỏ qua admin).`);

  // 6. Ghi tổng số dòng danh bạ (= tổng nhân sự công ty) vào app_meta để web hiển thị hạng dạng 4/210.
  const totalStaff = rows.length - 1;
  await sb('/app_meta?on_conflict=key', { method: 'POST', body: [{ key: 'directory_total_rows', value: String(totalStaff), updated_at: new Date().toISOString() }] });
  console.log(`app_meta: tổng nhân sự = ${totalStaff}.`);

  console.log('ĐỒNG BỘ XONG.');
}

main().catch((err) => {
  console.error('ĐỒNG BỘ LỖI:', err.message);
  process.exit(1);
});
