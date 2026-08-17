<?php
/**
 * POST /backend/api/attendance.php
 * Body JSON: type ("check_in" | "check_out"), photo (base64), match_score (float)
 *
 * Catatan keamanan: pencocokan descriptor wajah dilakukan di sisi
 * client (browser) memakai face-api.js karena model berjalan di
 * browser. match_score (euclidean distance) dikirim & disimpan di
 * sini sebagai bukti audit. Untuk kebutuhan produksi/keamanan tinggi,
 * pertimbangkan memindahkan proses pencocokan descriptor ke server.
 */

require_once __DIR__ . '/../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan.', [], 405);
}

$session = requireLogin();
$employeeId = (int)$session['employee_id'];

$body = getJsonBody();
$type       = $body['type'] ?? '';
$photo      = $body['photo'] ?? null;
$matchScore = isset($body['match_score']) ? (float)$body['match_score'] : null;

const FACE_MATCH_THRESHOLD = 0.5; // jarak euclidean maksimum agar dianggap wajah cocok

if (!in_array($type, ['check_in', 'check_out'], true)) {
    jsonResponse(false, 'Tipe absensi tidak valid.', [], 422);
}
if (!$photo) {
    jsonResponse(false, 'Foto verifikasi wajah wajib disertakan.', [], 422);
}
if ($matchScore === null || $matchScore > FACE_MATCH_THRESHOLD) {
    logActivity($employeeId, 'FACE_VERIFY_FAILED', "Verifikasi wajah gagal, skor: {$matchScore}");
    jsonResponse(false, 'Verifikasi wajah gagal. Wajah tidak cocok dengan data terdaftar.', [], 401);
}

$pdo = getDBConnection();
$today = date('Y-m-d');
$now   = date('Y-m-d H:i:s');

$existing = $pdo->prepare('SELECT * FROM attendance WHERE employee_id = :eid AND attendance_date = :d');
$existing->execute([':eid' => $employeeId, ':d' => $today]);
$row = $existing->fetch();

if ($type === 'check_in') {
    if ($row && $row['check_in_time']) {
        jsonResponse(false, 'Anda sudah melakukan check-in hari ini.', [], 409);
    }

    // Status: telat jika check-in setelah jam 09:00
    $status = (date('H:i:s') > '09:00:00') ? 'telat' : 'hadir';

    if ($row) {
        $upd = $pdo->prepare(
            'UPDATE attendance SET check_in_time = :now, check_in_photo = :photo,
             face_match_score = :score, status = :status WHERE id = :id'
        );
        $upd->execute([':now' => $now, ':photo' => $photo, ':score' => $matchScore, ':status' => $status, ':id' => $row['id']]);
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO attendance (employee_id, attendance_date, check_in_time, check_in_photo, face_match_score, status)
             VALUES (:eid, :d, :now, :photo, :score, :status)'
        );
        $ins->execute([':eid' => $employeeId, ':d' => $today, ':now' => $now, ':photo' => $photo, ':score' => $matchScore, ':status' => $status]);
    }

    logActivity($employeeId, 'CHECK_IN', "Check-in pada {$now}, skor kecocokan wajah: {$matchScore}");
    jsonResponse(true, 'Check-in berhasil dicatat.', ['time' => $now, 'status' => $status]);
}

if ($type === 'check_out') {
    if (!$row || !$row['check_in_time']) {
        jsonResponse(false, 'Anda belum check-in hari ini.', [], 409);
    }
    if ($row['check_out_time']) {
        jsonResponse(false, 'Anda sudah melakukan check-out hari ini.', [], 409);
    }

    $status = (date('H:i:s') < '17:00:00') ? 'pulang_cepat' : $row['status'];

    $upd = $pdo->prepare(
        'UPDATE attendance SET check_out_time = :now, check_out_photo = :photo,
         face_match_score = :score, status = :status WHERE id = :id'
    );
    $upd->execute([':now' => $now, ':photo' => $photo, ':score' => $matchScore, ':status' => $status, ':id' => $row['id']]);

    logActivity($employeeId, 'CHECK_OUT', "Check-out pada {$now}, skor kecocokan wajah: {$matchScore}");
    jsonResponse(true, 'Check-out berhasil dicatat.', ['time' => $now, 'status' => $status]);
}
