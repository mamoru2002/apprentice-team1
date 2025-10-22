SET NAMES utf8mb4;

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

CREATE TABLE IF NOT EXISTS expense_categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS study_categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO expense_categories (name) VALUES
('食費'), ('衣服'), ('日用品'), ('美容'), ('雑貨');

INSERT IGNORE INTO study_categories (name) VALUES
('Ruby'), ('CSS'), ('JavaScript'), ('HTML'), ('Paiza');

CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY index_users_on_email (email)
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  energy_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  reframe VARCHAR(200),
  before_sketch_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX index_work_items_on_user_id (user_id),
  CONSTRAINT fk_work_items_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS motivation_masters (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(60) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY index_motivation_masters_on_user_id_and_name (user_id, name),
  INDEX index_motivation_masters_on_user_id (user_id),
  CONSTRAINT fk_motivation_masters_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS preference_masters (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(60) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY index_preference_masters_on_user_id_and_name (user_id, name),
  INDEX index_preference_masters_on_user_id (user_id),
  CONSTRAINT fk_preference_masters_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_item_motivations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  work_item_id BIGINT NOT NULL,
  motivation_master_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX index_work_item_motivations_on_user_id (user_id),
  INDEX index_work_item_motivations_on_work_item_id (work_item_id),
  INDEX index_work_item_motivations_on_motivation_master_id (motivation_master_id),
  UNIQUE KEY index_work_motivations_unique (user_id, work_item_id, motivation_master_id),
  CONSTRAINT fk_work_item_motivations_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_work_item_motivations_work_items FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_work_item_motivations_motivation_masters FOREIGN KEY (motivation_master_id) REFERENCES motivation_masters(id) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_item_preferences (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  work_item_id BIGINT NOT NULL,
  preference_master_id BIGINT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX index_work_item_preferences_on_user_id (user_id),
  INDEX index_work_item_preferences_on_work_item_id (work_item_id),
  INDEX index_work_item_preferences_on_preference_master_id (preference_master_id),
  UNIQUE KEY index_work_preferences_unique (user_id, work_item_id, preference_master_id),
  CONSTRAINT fk_work_item_preferences_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_work_item_preferences_work_items FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_work_item_preferences_preference_masters FOREIGN KEY (preference_master_id) REFERENCES preference_masters(id) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS placements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  work_item_id BIGINT NOT NULL,
  kind ENUM('motivation', 'preference') NOT NULL,
  master_id BIGINT NOT NULL,
  x DECIMAL(5, 4) NOT NULL,
  y DECIMAL(5, 4) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY index_placements_on_user_work_item_kind_master (user_id, work_item_id, kind, master_id),
  INDEX index_placements_on_user_id (user_id),
  INDEX index_placements_on_work_item_id (work_item_id),
  CONSTRAINT fk_placements_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_placements_work_items FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
