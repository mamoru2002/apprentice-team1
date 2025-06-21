CREATE TABLE IF NOT EXISTS study_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255)         NOT NULL,
  duration   INT                  NOT NULL,
  date       DATE                 NOT NULL,
  created_at DATETIME             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_study_created_at (created_at),
  INDEX idx_study_date (date)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  amount     INT                  NOT NULL,
  title      VARCHAR(255),
  date       DATE                 NOT NULL,
  created_at DATETIME             DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expense_created_at (created_at),
  INDEX idx_expense_date (date)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;