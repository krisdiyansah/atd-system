-- =========================================================
-- iceKnodcorp ATD (Absensi / Time & Attendance) System
-- Database Schema
-- Import file ini via phpMyAdmin / mysql CLI sebelum
-- menjalankan backend PHP.
-- =========================================================

CREATE DATABASE IF NOT EXISTS iceknodcorp_atd
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE iceknodcorp_atd;

-- ---------------------------------------------------------
-- Tabel: employees
-- Menyimpan data akun & profil karyawan, termasuk
-- descriptor wajah (hasil face-api.js) untuk verifikasi.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    employee_code     VARCHAR(20)  NOT NULL UNIQUE,   -- NIP / kode karyawan
    full_name         VARCHAR(100) NOT NULL,
    email             VARCHAR(100) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    department        VARCHAR(80)  DEFAULT NULL,
    position          VARCHAR(80)  DEFAULT NULL,
    role              ENUM('admin','employee') NOT NULL DEFAULT 'employee',
    face_descriptor   LONGTEXT DEFAULT NULL,           -- JSON array float32 (128-d) dari face-api.js
    profile_photo     VARCHAR(255) DEFAULT NULL,        -- path/base64 foto profil saat registrasi
    status            ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabel: attendance
-- Menyimpan riwayat ATD (Absen Tanda Datang / clock-in
-- & clock-out) tiap karyawan, terpisah dari data akun.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    employee_id       INT NOT NULL,
    attendance_date   DATE NOT NULL,
    check_in_time     DATETIME DEFAULT NULL,
    check_out_time    DATETIME DEFAULT NULL,
    check_in_photo    LONGTEXT DEFAULT NULL,   -- snapshot base64 saat clock-in (bukti kehadiran)
    check_out_photo   LONGTEXT DEFAULT NULL,   -- snapshot base64 saat clock-out
    face_match_score  DECIMAL(5,4) DEFAULT NULL, -- euclidean distance hasil verifikasi wajah
    status            ENUM('hadir','telat','pulang_cepat','alpha') NOT NULL DEFAULT 'hadir',
    notes             VARCHAR(255) DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE,
    UNIQUE KEY uniq_employee_date (employee_id, attendance_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Tabel: activity_log
-- Log aktivitas sistem (login, register, clock-in/out,
-- perubahan data) sebagai jejak audit & bukti kehadiran.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    employee_id       INT DEFAULT NULL,
    action            VARCHAR(50)  NOT NULL,   -- LOGIN, LOGOUT, REGISTER, CHECK_IN, CHECK_OUT, CRUD_*
    description       VARCHAR(255) DEFAULT NULL,
    ip_address        VARCHAR(45)  DEFAULT NULL,
    user_agent        VARCHAR(255) DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Akun admin default
-- Email    : admin@iceknodcorp.com
-- Password : Admin123!  (WAJIB diganti setelah login pertama)
-- Hash di bawah dibuat dengan password_hash('Admin123!', PASSWORD_BCRYPT)
-- ---------------------------------------------------------
INSERT INTO employees (employee_code, full_name, email, password_hash, department, position, role)
VALUES (
  'ADM-0001',
  'Administrator',
  'admin@iceknodcorp.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Human Resources',
  'System Administrator',
  'admin'
) ON DUPLICATE KEY UPDATE email = email;
