<?php
/**
 * iceKnodcorp ATD System
 * Konfigurasi koneksi database (terpisah dari logic aplikasi).
 * Sesuaikan DB_HOST, DB_NAME, DB_USER, DB_PASS dengan environment Anda.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'iceknodcorp_atd');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

function getDBConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode([
                'success' => false,
                'message' => 'Koneksi database gagal. Periksa konfigurasi backend/config/database.php'
            ]));
        }
    }

    return $pdo;
}
