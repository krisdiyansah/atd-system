<?php
/**
 * GET /backend/api/activity_log.php
 * Admin  -> melihat seluruh log aktivitas sistem
 * Employee -> melihat log aktivitas miliknya sendiri
 */

require_once __DIR__ . '/../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, 'Method tidak diizinkan.', [], 405);
}

$session = requireLogin();
$pdo = getDBConnection();

if ($session['role'] === 'admin') {
    $stmt = $pdo->query(
        'SELECT al.id, al.action, al.description, al.ip_address, al.created_at,
                e.full_name, e.employee_code
         FROM activity_log al
         LEFT JOIN employees e ON e.id = al.employee_id
         ORDER BY al.created_at DESC
         LIMIT 200'
    );
} else {
    $stmt = $pdo->prepare(
        'SELECT id, action, description, ip_address, created_at
         FROM activity_log
         WHERE employee_id = :eid
         ORDER BY created_at DESC
         LIMIT 100'
    );
    $stmt->execute([':eid' => (int)$session['employee_id']]);
}

jsonResponse(true, 'Log aktivitas berhasil diambil.', ['logs' => $stmt->fetchAll()]);
