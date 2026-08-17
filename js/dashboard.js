/**
 * iceKnodcorp ATD System — logic Dashboard Karyawan
 */

let currentEmployee = null;
let todayRow = null;

document.addEventListener('DOMContentLoaded', async () => {
    renderBrand(document.querySelector('[data-brand]'));
    initSidebarToggle();

    currentEmployee = await guardSession();
    if (!currentEmployee) return;

    document.getElementById('userName').textContent = currentEmployee.full_name;
    document.getElementById('userRole').textContent = `${currentEmployee.position || 'Karyawan'} • ${currentEmployee.employee_code}`;
    document.getElementById('userInitial').textContent = currentEmployee.full_name.charAt(0).toUpperCase();

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    initLiveClock(document.getElementById('clockTime'), document.getElementById('clockDate'));

    await loadHistory();
    await loadActivityLog();
    initFaceCheckWidget();
});

async function loadHistory() {
    const res = await apiRequest('history.php');
    const tbody = document.getElementById('historyBody');
    const emptyEl = document.getElementById('historyEmpty');

    if (!res.success || !res.data.history.length) {
        tbody.innerHTML = '';
        emptyEl.style.display = 'block';
        updateTodayState(null);
        return;
    }
    emptyEl.style.display = 'none';

    const today = new Date().toISOString().slice(0, 10);
    todayRow = res.data.history.find((r) => r.attendance_date === today) || null;
    updateTodayState(todayRow);

    tbody.innerHTML = res.data.history.map((row) => `
        <tr>
            <td data-label="Tanggal">${formatDate(row.attendance_date)}</td>
            <td data-label="Check-in">${formatTime(row.check_in_time)}</td>
            <td data-label="Check-out">${formatTime(row.check_out_time)}</td>
            <td data-label="Skor Wajah">${row.face_match_score ?? '—'}</td>
            <td data-label="Status">${statusPill(row.status)}</td>
        </tr>
    `).join('');

    // KPI ringkas
    const hadir = res.data.history.filter((r) => r.status === 'hadir').length;
    const telat = res.data.history.filter((r) => r.status === 'telat').length;
    document.getElementById('kpiHadir').textContent = hadir;
    document.getElementById('kpiTelat').textContent = telat;
    document.getElementById('kpiTotal').textContent = res.data.history.length;
}

function updateTodayState(row) {
    const inBtn = document.getElementById('checkInBtn');
    const outBtn = document.getElementById('checkOutBtn');
    const label = document.getElementById('todayStatusLabel');

    if (!row || !row.check_in_time) {
        inBtn.disabled = false;
        outBtn.disabled = true;
        label.innerHTML = 'Anda belum <strong>check-in</strong> hari ini.';
    } else if (!row.check_out_time) {
        inBtn.disabled = true;
        outBtn.disabled = false;
        label.innerHTML = `Check-in pukul <strong>${formatTime(row.check_in_time)}</strong>. Jangan lupa check-out.`;
    } else {
        inBtn.disabled = true;
        outBtn.disabled = true;
        label.innerHTML = `Absensi hari ini lengkap ✓ (${formatTime(row.check_in_time)} — ${formatTime(row.check_out_time)})`;
    }
    document.getElementById('kpiDescriptor').textContent = currentEmployee.face_descriptor ? 'Terdaftar' : 'Belum ada';
}

async function loadActivityLog() {
    const res = await apiRequest('activity_log.php');
    const list = document.getElementById('activityList');
    if (!res.success || !res.data.logs.length) {
        list.innerHTML = '<li class="empty-state">Belum ada aktivitas tercatat.</li>';
        return;
    }
    list.innerHTML = res.data.logs.slice(0, 8).map((log) => `
        <li>
            <strong>${log.action.replace(/_/g, ' ')}</strong>
            <span>${log.description || ''}</span>
            <time>${formatDateTime(log.created_at)}</time>
        </li>
    `).join('');
}

/* ---------------------------------------------------------
   Widget verifikasi wajah untuk check-in / check-out
--------------------------------------------------------- */
function initFaceCheckWidget() {
    const modal = document.getElementById('faceModal');
    const scanRoot = document.getElementById('checkFaceScan');
    const video = document.getElementById('checkFaceVideo');
    const statusEl = document.getElementById('checkFaceStatus');
    const modalTitle = document.getElementById('faceModalTitle');
    const confirmBtn = document.getElementById('faceConfirmBtn');
    const cancelBtn = document.getElementById('faceCancelBtn');

    const scanUI = { root: scanRoot, video, statusEl };
    let activeType = null;
    let verifiedDescriptor = null;
    let verifiedPhoto = null;
    let matchScore = null;

    async function openModal(type) {
        if (!currentEmployee.face_descriptor) {
            alert('Data wajah Anda belum terdaftar. Silakan hubungi admin HR.');
            return;
        }
        activeType = type;
        modalTitle.textContent = type === 'check_in' ? 'Verifikasi Wajah — Check-in' : 'Verifikasi Wajah — Check-out';
        modal.classList.add('show');
        confirmBtn.disabled = true;
        setFaceScanState(scanUI, 'idle', 'Menyiapkan kamera...');

        try {
            await FaceVerification.loadModels();
            await FaceVerification.startCamera(video);
            setFaceScanState(scanUI, 'scanning', 'Memindai wajah, tetap diam sebentar...');
            runAutoDetect();
        } catch (err) {
            setFaceScanState(scanUI, 'fail', 'Kamera tidak dapat diakses');
        }
    }

    async function runAutoDetect() {
        if (!modal.classList.contains('show')) return;

        const descriptor = await FaceVerification.detectDescriptor(video);
        if (descriptor) {
            const distance = FaceVerification.euclideanDistance(descriptor, currentEmployee.face_descriptor);
            matchScore = Number(distance.toFixed(4));

            if (distance <= FaceVerification.MATCH_THRESHOLD) {
                verifiedDescriptor = descriptor;
                verifiedPhoto = FaceVerification.captureSnapshot(video);
                setFaceScanState(scanUI, 'match', `Wajah cocok ✓ (skor ${matchScore})`);
                confirmBtn.disabled = false;
                return; // stop auto-loop, tunggu konfirmasi
            } else {
                setFaceScanState(scanUI, 'fail', `Wajah belum cocok (skor ${matchScore})`);
            }
        } else {
            setFaceScanState(scanUI, 'scanning', 'Posisikan wajah di dalam bingkai');
        }
        setTimeout(runAutoDetect, 700);
    }

    function closeModal() {
        modal.classList.remove('show');
        FaceVerification.stopCamera();
        verifiedDescriptor = null;
        verifiedPhoto = null;
        matchScore = null;
        activeType = null;
    }

    confirmBtn.addEventListener('click', async () => {
        if (!verifiedPhoto) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Menyimpan...';

        const res = await apiRequest('attendance.php', {
            method: 'POST',
            body: { type: activeType, photo: verifiedPhoto, match_score: matchScore },
        });

        confirmBtn.textContent = 'Konfirmasi Absen';
        if (!res.success) {
            alert(res.message || 'Gagal mencatat absensi.');
            confirmBtn.disabled = false;
            return;
        }

        closeModal();
        await loadHistory();
        await loadActivityLog();
    });

    cancelBtn.addEventListener('click', closeModal);
    document.getElementById('faceModalCloseX').addEventListener('click', closeModal);

    document.getElementById('checkInBtn').addEventListener('click', () => openModal('check_in'));
    document.getElementById('checkOutBtn').addEventListener('click', () => openModal('check_out'));
}
