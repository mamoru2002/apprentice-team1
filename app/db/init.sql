SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS study_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255)         NOT NULL,
  duration   INT                  NOT NULL,
  created_at DATETIME             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_study_created_at (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  amount     INT                  NOT NULL,
  memo       VARCHAR(255),
  created_at DATETIME             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expense_created_at (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;