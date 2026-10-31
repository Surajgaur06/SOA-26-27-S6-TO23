-- TempTrace Database Schema DDL for MySQL 8.0 / MariaDB

CREATE DATABASE IF NOT EXISTS temptrace_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE temptrace_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'technician', 'auditor') DEFAULT 'technician' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_user_role (role)
) ENGINE=InnoDB;

-- 2. Temperature Loggers
CREATE TABLE IF NOT EXISTS temperature_loggers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    logger_id VARCHAR(50) NOT NULL UNIQUE,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    logger_type VARCHAR(50) NOT NULL,
    measurement_range VARCHAR(50) NOT NULL,
    resolution DOUBLE DEFAULT 0.01 NOT NULL,
    accuracy_spec VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    owner VARCHAR(100) NOT NULL,
    commissioning_date DATETIME NOT NULL,
    calibration_interval_months INT DEFAULT 12 NOT NULL,
    last_calibration_date DATETIME NULL,
    next_due_date DATETIME NULL,
    status ENUM('active', 'inactive', 'retired') DEFAULT 'active' NOT NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_logger_next_due (next_due_date),
    INDEX idx_logger_status (status)
) ENGINE=InnoDB;

-- 3. Reference Instruments
CREATE TABLE IF NOT EXISTS reference_instruments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instrument_id VARCHAR(50) NOT NULL UNIQUE,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    measurement_range VARCHAR(50) NOT NULL,
    certificate_number VARCHAR(100) NOT NULL,
    calibration_provider VARCHAR(150) NOT NULL,
    calibration_date DATETIME NOT NULL,
    expiry_date DATETIME NOT NULL,
    stated_uncertainty VARCHAR(100) NOT NULL,
    traceability_details TEXT NOT NULL,
    certificate_file_ref VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_ref_expiry (expiry_date)
) ENGINE=InnoDB;

-- 4. Calibration Procedures
CREATE TABLE IF NOT EXISTS calibration_procedures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT NULL,
    standard_tolerance DOUBLE DEFAULT 0.50 NOT NULL,
    tolerance_source VARCHAR(150) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB;

-- 5. Calibration Records
CREATE TABLE IF NOT EXISTS calibration_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_number VARCHAR(50) NOT NULL UNIQUE,
    logger_id INT NOT NULL,
    reference_instrument_id INT NOT NULL,
    technician_id INT NOT NULL,
    calibration_date DATETIME NOT NULL,
    location VARCHAR(150) NOT NULL,
    ambient_temperature DOUBLE NOT NULL,
    ambient_humidity DOUBLE NOT NULL,
    procedure_code VARCHAR(50) NOT NULL,
    equipment_used VARCHAR(255) NOT NULL,
    configured_tolerance DOUBLE NOT NULL,
    tolerance_source VARCHAR(150) NOT NULL,
    calibration_interval_months INT NOT NULL,
    overall_outcome ENUM('pass', 'fail', 'conditional') NOT NULL,
    max_error DOUBLE NOT NULL,
    state ENUM('draft', 'finalized', 'amended') NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    notes TEXT NULL,
    provenance_hash VARCHAR(64) NULL,
    is_demo BOOLEAN DEFAULT TRUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finalized_at DATETIME NULL,
    finalized_by_id INT NULL,
    FOREIGN KEY (logger_id) REFERENCES temperature_loggers(id) ON DELETE CASCADE,
    FOREIGN KEY (reference_instrument_id) REFERENCES reference_instruments(id),
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (finalized_by_id) REFERENCES users(id),
    INDEX idx_cal_date (calibration_date),
    INDEX idx_cal_state (state)
) ENGINE=InnoDB;

-- 6. Calibration Measurement Points
CREATE TABLE IF NOT EXISTS calibration_measurement_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    sequence INT NOT NULL,
    nominal_temperature DOUBLE NOT NULL,
    reference_reading DOUBLE NOT NULL,
    logger_reading DOUBLE NOT NULL,
    unit VARCHAR(10) DEFAULT '°C' NOT NULL,
    ref_uncertainty DOUBLE NULL,
    allowed_tolerance DOUBLE NOT NULL,
    error DOUBLE NOT NULL,
    abs_error DOUBLE NOT NULL,
    outcome ENUM('pass', 'fail') NOT NULL,
    repeated_readings TEXT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (record_id) REFERENCES calibration_records(id) ON DELETE CASCADE,
    INDEX idx_pt_record (record_id)
) ENGINE=InnoDB;

-- 7. Calibration Amendments
CREATE TABLE IF NOT EXISTS calibration_amendments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    user_id INT NOT NULL,
    version INT NOT NULL,
    reason TEXT NOT NULL,
    previous_data TEXT NOT NULL,
    new_data TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (record_id) REFERENCES calibration_records(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 8. Audit Events (Hash-Chained Append-Only Log)
CREATE TABLE IF NOT EXISTS audit_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    previous_hash VARCHAR(64) NULL,
    current_hash VARCHAR(64) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB;

-- 9. System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    logger_id INT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('due_30_days', 'due_7_days', 'overdue', 'expired_reference', 'failed_calibration', 'missing_provenance', 'system') NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (logger_id) REFERENCES temperature_loggers(id) ON DELETE CASCADE,
    INDEX idx_notif_unread (is_read, created_at)
) ENGINE=InnoDB;
