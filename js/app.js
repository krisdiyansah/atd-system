/**
 * iceKnodcorp ATD System — shared front-end utilities
 * Dipakai oleh seluruh halaman (login, register, dashboard, admin).
 */

const API_BASE = 'backend/api';

/** Inline SVG logo mark — dipakai di header, sidebar, dan panel auth. */
const LOGO_SVG = `
<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="iceKnodcorp">
  <defs>
    <linearGradient id="icknGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6FD6E8"/>
      <stop offset="100%" stop-color="#1C4E80"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="10" fill="#0B1F33"/>
  <g stroke="url(#icknGrad)" stroke-width="1.6" stroke-linecap="round">
    <line x1="20" y1="7" x2="20" y2="33"/>
    <line x1="7" y1="20" x2="33" y2="20"/>
    <line x1="11" y1="11" x2="29" y2="29"/>
    <line x1="29" y1="11" x2="11" y2="29"/>
  </g>
  <circle cx="20" cy="20" r="4.5" fill="#6FD6E8"/>
  <circle cx="20" cy="20" r="9" stroke="#6FD6E8" stroke-width="1" fill="none" opacity="0.5"/>
</svg>`;

function renderBrand(el, { light = false } = {}) {
    if (!el) return;
    el.innerHTML = `
        <div class="brand__mark">${LOGO_SVG}</div>
        <div>
            <div class="brand__name">ice<span>Knod</span>corp</div>
            <div class="brand__tagline">ATD System</div>
        </div>`;
}

/** Wrapper fetch API backend, otomatis kirim/terima JSON + cookie sesi. */
async function apiRequest(endpoint, { method = 'GET', body = null } = {}) {
    const opts = {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    let res, data;
    try {
        res = await fetch(`${API_BASE}/${endpoint}`, opts);
        data = await res.json();
    } catch (err) {
        return { success: false, message: 'Tidak dapat terhubung ke server backend.' };
    }
    return data;
}

function showAlert(el, message, type = 'error') {
    if (!el) return;
    el.textContent = message;
    el.className = `alert show alert-${type}`;
}
function hideAlert(el) {
    if (!el) return;
    el.className = 'alert';
}

function formatDateTime(str) {
    if (!str) return '—';
    const d = new Date(str.replace(' ', 'T'));
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatTime(str) {
    if (!str) return '—';
    const d = new Date(str.replace(' ', 'T'));
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_LABEL = {
    hadir: 'Hadir',
    telat: 'Telat',
    pulang_cepat: 'Pulang Cepat',
    alpha: 'Alpha',
};

function statusPill(status) {
    if (!status) return '—';
    return `<span class="status-pill ${status}">${STATUS_LABEL[status] || status}</span>`;
}

/** Sidebar toggle untuk tampilan mobile. */
function initSidebarToggle() {
    const btn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const scrim = document.getElementById('sidebarScrim');
    if (!btn || !sidebar) return;
    const close = () => { sidebar.classList.remove('open'); scrim?.classList.remove('show'); };
    btn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        scrim?.classList.toggle('show');
    });
    scrim?.addEventListener('click', close);
}

/** Live digital clock (dipakai di dashboard hero). */
function initLiveClock(timeEl, dateEl) {
    function tick() {
        const now = new Date();
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (dateEl) dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
    tick();
    setInterval(tick, 1000);
}

/** Redirect ke login jika sesi tidak aktif; kembalikan data employee jika aktif. */
async function guardSession({ adminOnly = false } = {}) {
    const res = await apiRequest('session_check.php');
    if (!res.success) {
        window.location.href = 'index.html';
        return null;
    }
    if (adminOnly && res.data.employee.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return null;
    }
    return res.data.employee;
}

async function handleLogout(e) {
    e?.preventDefault();
    await apiRequest('logout.php', { method: 'POST' });
    window.location.href = 'index.html';
}
