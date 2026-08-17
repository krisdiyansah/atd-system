<?php
/**
 * /backend/api/employees.php
 * CRUD data karyawan — khusus role admin.
 *
 *  GET    ?id=..        -> detail 1 karyawan (opsional, tanpa id = list semua)
 *  POST                 -> tambah karyawan baru
 *  PUT    ?id=..         -> update data karyawan
 *  DELETE ?id=..         -> hapus karyawan
 */

require_once __DIR__ . '/../config/helpers.php';

$session = requireAdmin();
$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET': {
        if (!empty($_GET['id'])) {
            $stmt = $pdo->prepare(
                'SELECT id, employee_code, full_name, email, department, position, role, status, created_at
                 FROM employees WHERE id = :id'
            );
            $stmt->execute([':id' => (int)$_GET['id']]);
            $row = $stmt->fetch();
            if (!$row) {
                jsonResponse(false, 'Karyawan tidak ditemukan.', [], 404);
            }
            jsonResponse(true, 'Detail karyawan.', ['employee' => $row]);
        }

        $rows = $pdo->query(
            'SELECT id, employee_code, full_name, email, department, position, role, status, created_at
             FROM employees ORDER BY created_at DESC'
        )->fetchAll();
        jsonResponse(true, 'Daftar karyawan.', ['employees' => $rows]);
    }

    case 'POST': {
        $body = getJsonBody();
        $code  = trim($body['employee_code'] ?? '');
        $name  = trim($body['full_name'] ?? '');
        $email = trim(strtolower($body['email'] ?? ''));
        $pass  = (string)($body['password'] ?? '');
        $dept  = trim($body['department'] ?? '');
        $pos   = trim($body['position'] ?? '');
        $role  = in_array($body['role'] ?? '', ['admin', 'employee'], true) ? $body['role'] : 'employee';

        if ($code === '' || $name === '' || $email === '' || strlen($pass) < 8) {
            jsonResponse(false, 'Kode, nama, email wajib diisi dan password minimal 8 karakter.', [], 422);
        }

        $check = $pdo->prepare('SELECT id FROM employees WHERE email = :e OR employee_code = :c');
        $check->execute([':e' => $email, ':c' => $code]);
        if ($check->fetch()) {
            jsonResponse(false, 'Email atau kode karyawan sudah dipakai.', [], 409);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO employees (employee_code, full_name, email, password_hash, department, position, role)
             VALUES (:code, :name, :email, :hash, :dept, :pos, :role)'
        );
        $stmt->execute([
            ':code' => $code, ':name' => $name, ':email' => $email,
            ':hash' => password_hash($pass, PASSWORD_BCRYPT),
            ':dept' => $dept ?: null, ':pos' => $pos ?: null, ':role' => $role,
        ]);

        $newId = (int)$pdo->lastInsertId();
        logActivity($session['employee_id'], 'CRUD_CREATE', "Admin menambahkan karyawan #{$newId} ({$name})");
        jsonResponse(true, 'Karyawan berhasil ditambahkan.', ['id' => $newId], 201);
    }

    case 'PUT': {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            jsonResponse(false, 'ID karyawan wajib disertakan.', [], 422);
        }

        $body = getJsonBody();
        $fields = [];
        $params = [':id' => $id];

        foreach (['full_name' => 'full_name', 'department' => 'department', 'position' => 'position',
                  'role' => 'role', 'status' => 'status'] as $key => $col) {
            if (isset($body[$key])) {
                $fields[] = "{$col} = :{$key}";
                $params[":{$key}"] = $body[$key];
            }
        }
        if (!empty($body['password'])) {
            if (strlen($body['password']) < 8) {
                jsonResponse(false, 'Password minimal 8 karakter.', [], 422);
            }
            $fields[] = 'password_hash = :hash';
            $params[':hash'] = password_hash($body['password'], PASSWORD_BCRYPT);
        }

        if (!$fields) {
            jsonResponse(false, 'Tidak ada data yang diubah.', [], 422);
        }

        $sql = 'UPDATE employees SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);

        logActivity($session['employee_id'], 'CRUD_UPDATE', "Admin memperbarui karyawan #{$id}");
        jsonResponse(true, 'Data karyawan berhasil diperbarui.');
    }

    case 'DELETE': {
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            jsonResponse(false, 'ID karyawan wajib disertakan.', [], 422);
        }
        if ($id === (int)$session['employee_id']) {
            jsonResponse(false, 'Tidak dapat menghapus akun sendiri.', [], 403);
        }

        $pdo->prepare('DELETE FROM employees WHERE id = :id')->execute([':id' => $id]);
        logActivity($session['employee_id'], 'CRUD_DELETE', "Admin menghapus karyawan #{$id}");
        jsonResponse(true, 'Karyawan berhasil dihapus.');
    }

    default:
        jsonResponse(false, 'Method tidak diizinkan.', [], 405);
}
