/**
 * iceKnodcorp ATD System — Modul Verifikasi Wajah
 *
 * Memakai face-api.js (berjalan penuh di browser) untuk:
 *  1. Mendeteksi wajah & landmark dari feed kamera
 *  2. Mengekstrak face descriptor (vektor 128 dimensi)
 *  3. Mencocokkan descriptor saat ini dengan descriptor
 *     yang tersimpan pada saat registrasi (euclidean distance)
 *
 * CATATAN KEAMANAN:
 * Karena face-api.js berjalan di sisi client, hasil pencocokan
 * bisa dimanipulasi oleh pengguna yang memodifikasi JS di browser.
 * Untuk sistem produksi/skala perusahaan, pertimbangkan:
 *  - Mengirim descriptor + foto ke server dan verifikasi ulang di server
 *  - Menambahkan liveness detection (kedipan mata, gerakan kepala)
 *  - Rate limiting & alert untuk percobaan verifikasi yang gagal berulang
 */

const FACE_MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const MATCH_THRESHOLD = 0.5; // jarak euclidean maksimum dianggap wajah cocok

const FaceVerification = (() => {
    let modelsLoaded = false;
    let stream = null;

    async function loadModels() {
        if (modelsLoaded) return;
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL),
        ]);
        modelsLoaded = true;
    }

    async function startCamera(videoEl) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false });
        videoEl.srcObject = stream;
        await videoEl.play();
    }

    function stopCamera() {
        stream?.getTracks().forEach((t) => t.stop());
        stream = null;
    }

    /** Deteksi 1 wajah dari elemen video, kembalikan descriptor (Array biasa) atau null. */
    async function detectDescriptor(videoEl) {
        const result = await faceapi
            .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        if (!result) return null;
        return Array.from(result.descriptor);
    }

    /** Ambil snapshot frame video saat ini sebagai base64 JPEG (bukti kehadiran). */
    function captureSnapshot(videoEl) {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || 480;
        canvas.height = videoEl.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // simpan sesuai orientasi natural (un-mirror)
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.82);
    }

    function euclideanDistance(a, b) {
        return faceapi.euclideanDistance(a, b);
    }

    return { loadModels, startCamera, stopCamera, detectDescriptor, captureSnapshot, euclideanDistance, MATCH_THRESHOLD };
})();

/**
 * Helper UI: mengelola status text + animasi pada komponen .face-scan
 * el: { root, video, statusEl }
 */
function setFaceScanState(el, state, text) {
    el.root.classList.toggle('is-active', state === 'scanning');
    el.statusEl.className = `face-scan__status state-${state}`;
    el.statusEl.innerHTML = `<span class="dot"></span>${text}`;
}
