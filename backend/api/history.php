<?php
/**
 * GET /backend/api/history.php
 * Mengembalikan riwayat ATD milik karyawan yang sedang login.
 */

require_once __DIR__ . '/../config/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(false, 'Method tidak diizinkan.', [], 405);
}

$session = requireLogin();
$employeeId = (int)$session['employee_id'];

$pdo = getDBConnection();
$stmt = $pdo->prepare(
    'SELECT id, attendance_date, check_in_time, check_out_time, status, face_match_score
     FROM attendance
     WHERE employee_id = :eid
     ORDER BY attendance_date DESC
     LIMIT 90'
);
$stmt->execute([':eid' => $employeeId]);

jsonResponse(true, 'Riwayat absensi berhasil diambil.', ['history' => $stmt->fetchAll()]);
