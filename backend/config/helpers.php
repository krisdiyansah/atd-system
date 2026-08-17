<?php
/**
 * iceKnodcorp ATD System - Helper bersama untuk seluruh endpoint API.
 */

require_once __DIR__ . '/database.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/** Kirim response JSON lalu hentikan eksekusi. */
function jsonResponse(bool $success, string $message, array $data = [], int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $data ? ['data' => $data] : []));
    exit;
}

/** Pastikan request punya sesi login aktif. */
function requireLogin(): array
{
    if (empty($_SESSION['employee_id'])) {
        jsonResponse(false, 'Sesi tidak ditemukan. Silakan login kembali.', [], 401);
    }
    return $_SESSION;
}

/** Pastikan sesi login adalah admin. */
function requireAdmin(): array
{
    $session = requireLogin();
    if (($session['role'] ?? '') !== 'admin') {
        jsonResponse(false, 'Akses ditolak. Hanya admin yang dapat mengakses fitur ini.', [], 403);
    }
    return $session;
}

/** Ambil body JSON dari request sebagai array asosiatif. */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Catat aktivitas ke tabel activity_log — dipakai sebagai
 * jejak audit sekaligus bukti kehadiran/aksi karyawan.
 */
function logActivity(?int $employeeId, string $action, string $description = ''): void
{
    $pdo = getDBConnection();
    $stmt = $pdo->prepare(
        'INSERT INTO activity_log (employee_id, action, description, ip_address, user_agent)
         VALUES (:employee_id, :action, :description, :ip, :ua)'
    );
    $stmt->execute([
        ':employee_id' => $employeeId,
        ':action'      => $action,
        ':description' => $description,
        ':ip'          => $_SERVER['REMOTE_ADDR'] ?? null,
        ':ua'          => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
    ]);
}
