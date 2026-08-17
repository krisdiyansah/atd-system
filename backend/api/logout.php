<?php
/**
 * POST /backend/api/logout.php
 */

require_once __DIR__ . '/../config/helpers.php';

$session = requireLogin();
logActivity($session['employee_id'], 'LOGOUT', "Logout: {$session['full_name']}");

$_SESSION = [];
session_destroy();

jsonResponse(true, 'Logout berhasil.');
