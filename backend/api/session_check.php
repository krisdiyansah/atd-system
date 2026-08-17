<?php
/**
 * GET /backend/api/session_check.php
 * Dipakai frontend saat load halaman untuk memastikan sesi masih aktif
 * dan mengambil ulang face_descriptor untuk verifikasi wajah.
 */

require_once __DIR__ . '/../config/helpers.php';

if (empty($_SESSION['employee_id'])) {
    jsonResponse(false, 'Belum login.', [], 401);
}

$pdo = getDBConnection();
$stmt = $pdo->prepare(
    'SELECT id, employee_code, full_name, email, department, position, role, profile_photo, face_descriptor
     FROM employees WHERE id = :id'
);
$stmt->execute([':id' => (int)$_SESSION['employee_id']]);
$employee = $stmt->fetch();

if (!$employee) {
    jsonResponse(false, 'Akun tidak ditemukan.', [], 404);
}

$employee['face_descriptor'] = json_decode($employee['face_descriptor'], true);
jsonResponse(true, 'Sesi aktif.', ['employee' => $employee]);
