<?php
/**
 * POST /backend/api/register.php
 * Body JSON: employee_code, full_name, email, password,
 *            department, position, face_descriptor (array 128-d), profile_photo (base64)
 */

require_once __DIR__ . '/../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan.', [], 405);
}

$body = getJsonBody();

$employeeCode = trim($body['employee_code'] ?? '');
$fullName     = trim($body['full_name'] ?? '');
$email        = trim(strtolower($body['email'] ?? ''));
$password     = (string)($body['password'] ?? '');
$department   = trim($body['department'] ?? '');
$position     = trim($body['position'] ?? '');
$faceDescriptor = $body['face_descriptor'] ?? null;
$profilePhoto = $body['profile_photo'] ?? null;

// --- Validasi dasar ---
if ($employeeCode === '' || $fullName === '' || $email === '' || $password === '') {
    jsonResponse(false, 'Kode karyawan, nama, email, dan password wajib diisi.', [], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Format email tidak valid.', [], 422);
}
if (strlen($password) < 8) {
    jsonResponse(false, 'Password minimal 8 karakter.', [], 422);
}
if (!is_array($faceDescriptor) || count($faceDescriptor) < 64) {
    jsonResponse(false, 'Wajah belum terdeteksi dengan baik. Silakan ulangi pemindaian wajah.', [], 422);
}

$pdo = getDBConnection();

// --- Cek duplikasi email / kode karyawan ---
$check = $pdo->prepare('SELECT id FROM employees WHERE email = :email OR employee_code = :code');
$check->execute([':email' => $email, ':code' => $employeeCode]);
if ($check->fetch()) {
    jsonResponse(false, 'Email atau kode karyawan sudah terdaftar.', [], 409);
}

$passwordHash = password_hash($password, PASSWORD_BCRYPT);

$stmt = $pdo->prepare(
    'INSERT INTO employees
        (employee_code, full_name, email, password_hash, department, position, face_descriptor, profile_photo, role)
     VALUES
        (:code, :name, :email, :hash, :dept, :pos, :descriptor, :photo, "employee")'
);

$stmt->execute([
    ':code'       => $employeeCode,
    ':name'       => $fullName,
    ':email'      => $email,
    ':hash'       => $passwordHash,
    ':dept'       => $department ?: null,
    ':pos'        => $position ?: null,
    ':descriptor' => json_encode($faceDescriptor),
    ':photo'      => $profilePhoto,
]);

$newId = (int)$pdo->lastInsertId();
logActivity($newId, 'REGISTER', "Karyawan baru mendaftar: {$fullName} ({$employeeCode})");

jsonResponse(true, 'Registrasi berhasil. Silakan login.', ['employee_id' => $newId]);
