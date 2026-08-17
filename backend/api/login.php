<?php
/**
 * POST /backend/api/login.php
 * Body JSON: email, password
 * Mengembalikan face_descriptor tersimpan agar frontend bisa
 * melakukan verifikasi wajah lokal sebelum clock-in/out.
 */

require_once __DIR__ . '/../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method tidak diizinkan.', [], 405);
}

$body = getJsonBody();
$email    = trim(strtolower($body['email'] ?? ''));
$password = (string)($body['password'] ?? '');

if ($email === '' || $password === '') {
    jsonResponse(false, 'Email dan password wajib diisi.', [], 422);
}

$pdo = getDBConnection();
$stmt = $pdo->prepare('SELECT * FROM employees WHERE email = :email LIMIT 1');
$stmt->execute([':email' => $email]);
$employee = $stmt->fetch();

if (!$employee || !password_verify($password, $employee['password_hash'])) {
    logActivity($employee['id'] ?? null, 'LOGIN_FAILED', "Percobaan login gagal untuk email: {$email}");
    jsonResponse(false, 'Email atau password salah.', [], 401);
}

if ($employee['status'] !== 'active') {
    jsonResponse(false, 'Akun tidak aktif. Hubungi admin HR.', [], 403);
}

// --- Set session ---
$_SESSION['employee_id']   = (int)$employee['id'];
$_SESSION['employee_code'] = $employee['employee_code'];
$_SESSION['full_name']     = $employee['full_name'];
$_SESSION['role']          = $employee['role'];

logActivity((int)$employee['id'], 'LOGIN', "Login berhasil: {$employee['full_name']}");

jsonResponse(true, 'Login berhasil.', [
    'employee' => [
        'id'              => (int)$employee['id'],
        'employee_code'   => $employee['employee_code'],
        'full_name'       => $employee['full_name'],
        'email'           => $employee['email'],
        'department'      => $employee['department'],
        'position'        => $employee['position'],
        'role'            => $employee['role'],
        'profile_photo'   => $employee['profile_photo'],
        'face_descriptor' => json_decode($employee['face_descriptor'], true),
    ],
]);
