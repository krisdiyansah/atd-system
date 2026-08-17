/**
 * iceKnodcorp ATD System — logic halaman Login & Register
 */

document.addEventListener('DOMContentLoaded', () => {
    renderBrand(document.querySelector('[data-brand]'));
    renderBrand(document.querySelector('[data-brand-visual]'));

    if (document.getElementById('loginForm')) initLoginPage();
    if (document.getElementById('registerForm')) initRegisterPage();
});

/* ---------------------------------------------------------
   LOGIN
--------------------------------------------------------- */
function initLoginPage() {
    const form = document.getElementById('loginForm');
    const alertEl = document.getElementById('loginAlert');
    const submitBtn = document.getElementById('loginSubmit');

    // Kalau sudah login, langsung ke dashboard
    apiRequest('session_check.php').then((res) => {
        if (res.success) {
            window.location.href = res.data.employee.role === 'admin' ? 'admin.html' : 'dashboard.html';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert(alertEl);
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses...';

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        const res = await apiRequest('login.php', { method: 'POST', body: { email, password } });

        if (!res.success) {
            showAlert(alertEl, res.message || 'Login gagal.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Masuk';
            return;
        }

        window.location.href = res.data.employee.role === 'admin' ? 'admin.html' : 'dashboard.html';
    });
}

/* ---------------------------------------------------------
   REGISTER (+ pendaftaran wajah)
--------------------------------------------------------- */
function initRegisterPage() {
    const form = document.getElementById('registerForm');
    const alertEl = document.getElementById('registerAlert');
    const submitBtn = document.getElementById('registerSubmit');

    const scanRoot = document.getElementById('faceScan');
    const video = document.getElementById('faceVideo');
    const statusEl = document.getElementById('faceStatus');
    const startBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureFaceBtn');
    const retakeBtn = document.getElementById('retakeFaceBtn');

    const scanUI = { root: scanRoot, video, statusEl };
    let capturedDescriptor = null;
    let capturedPhoto = null;

    setFaceScanState(scanUI, 'idle', 'Kamera belum aktif');

    startBtn.addEventListener('click', async () => {
        startBtn.disabled = true;
        startBtn.textContent = 'Memuat model wajah...';
        try {
            await FaceVerification.loadModels();
            await FaceVerification.startCamera(video);
            setFaceScanState(scanUI, 'scanning', 'Posisikan wajah di dalam bingkai');
            startBtn.classList.add('hidden-btn');
            captureBtn.classList.remove('hidden-btn');
        } catch (err) {
            setFaceScanState(scanUI, 'fail', 'Kamera tidak dapat diakses');
            showAlert(alertEl, 'Tidak bisa mengakses kamera. Pastikan izin kamera sudah diberikan.');
        }
        startBtn.disabled = false;
        startBtn.textContent = 'Aktifkan Kamera';
    });

    captureBtn.addEventListener('click', async () => {
        captureBtn.disabled = true;
        captureBtn.textContent = 'Mendeteksi wajah...';

        const descriptor = await FaceVerification.detectDescriptor(video);
        if (!descriptor) {
            setFaceScanState(scanUI, 'fail', 'Wajah tidak terdeteksi, coba lagi');
            captureBtn.disabled = false;
            captureBtn.textContent = 'Ambil & Kunci Wajah';
            return;
        }

        capturedDescriptor = descriptor;
        capturedPhoto = FaceVerification.captureSnapshot(video);
        setFaceScanState(scanUI, 'match', 'Wajah berhasil direkam ✓');
        FaceVerification.stopCamera();

        captureBtn.classList.add('hidden-btn');
        retakeBtn.classList.remove('hidden-btn');
    });

    retakeBtn.addEventListener('click', async () => {
        capturedDescriptor = null;
        capturedPhoto = null;
        retakeBtn.classList.add('hidden-btn');
        startBtn.classList.remove('hidden-btn');
        setFaceScanState(scanUI, 'idle', 'Kamera belum aktif');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert(alertEl);

        if (!capturedDescriptor) {
            showAlert(alertEl, 'Silakan rekam wajah Anda terlebih dahulu sebelum mendaftar.');
            return;
        }

        const payload = {
            employee_code: document.getElementById('regCode').value.trim(),
            full_name: document.getElementById('regName').value.trim(),
            email: document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            department: document.getElementById('regDept').value.trim(),
            position: document.getElementById('regPosition').value.trim(),
            face_descriptor: capturedDescriptor,
            profile_photo: capturedPhoto,
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Mendaftarkan...';

        const res = await apiRequest('register.php', { method: 'POST', body: payload });

        if (!res.success) {
            showAlert(alertEl, res.message || 'Registrasi gagal.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Daftar Sekarang';
            return;
        }

        showAlert(alertEl, 'Registrasi berhasil! Mengalihkan ke halaman login...', 'success');
        setTimeout(() => (window.location.href = 'index.html'), 1500);
    });
}
