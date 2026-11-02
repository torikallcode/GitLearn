-- GitLearn initial schema (MySQL 8+ / 9.x)
-- Charset: utf8mb4 throughout.

CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(120)    NOT NULL,
    email         VARCHAR(190)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    career_goal   VARCHAR(20)     NOT NULL DEFAULT '',
    level         VARCHAR(20)     NOT NULL DEFAULT 'beginner',
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    CONSTRAINT chk_users_career_goal CHECK (career_goal IN ('', 'frontend', 'backend')),
    CONSTRAINT chk_users_level CHECK (level IN ('beginner', 'intermediate', 'advanced'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_paths (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug        VARCHAR(160)    NOT NULL,
    title       VARCHAR(200)    NOT NULL,
    description TEXT            NOT NULL,
    order_no    INT             NOT NULL DEFAULT 0,
    track       VARCHAR(20)     NOT NULL DEFAULT 'core',
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_learning_paths_slug (slug),
    KEY idx_learning_paths_order (order_no),
    KEY idx_learning_paths_track (track)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    path_id     BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(200)    NOT NULL,
    description TEXT            NOT NULL,
    order_no    INT             NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_modules_path_order (path_id, order_no),
    KEY idx_modules_path (path_id),
    CONSTRAINT fk_modules_path FOREIGN KEY (path_id) REFERENCES learning_paths (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    module_id         BIGINT UNSIGNED NOT NULL,
    slug              VARCHAR(160)    NOT NULL,
    title             VARCHAR(200)    NOT NULL,
    content_md        MEDIUMTEXT      NOT NULL,
    estimated_minutes INT             NOT NULL DEFAULT 5,
    order_no          INT             NOT NULL DEFAULT 0,
    practice_config   JSON            NULL,
    is_published      TINYINT(1)      NOT NULL DEFAULT 1,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lessons_slug (slug),
    UNIQUE KEY uq_lessons_module_order (module_id, order_no),
    KEY idx_lessons_module (module_id),
    KEY idx_lessons_published (is_published),
    CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES modules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id   BIGINT UNSIGNED NOT NULL,
    question    TEXT            NOT NULL,
    explanation TEXT            NOT NULL,
    order_no    INT             NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_quizzes_lesson (lesson_id, order_no),
    CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_options (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    quiz_id     BIGINT UNSIGNED NOT NULL,
    option_text TEXT            NOT NULL,
    is_correct  TINYINT(1)      NOT NULL DEFAULT 0,
    order_no    INT             NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_quiz_options_quiz (quiz_id, order_no),
    CONSTRAINT fk_quiz_options_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_lesson_progress (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       BIGINT UNSIGNED NOT NULL,
    lesson_id     BIGINT UNSIGNED NOT NULL,
    status        ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
    practice_done TINYINT(1)      NOT NULL DEFAULT 0,
    quiz_score    INT             NOT NULL DEFAULT 0,
    completed_at  DATETIME        NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_progress_user_lesson (user_id, lesson_id),
    KEY idx_progress_user_status (user_id, status),
    KEY idx_progress_lesson (lesson_id),
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id            BIGINT UNSIGNED NOT NULL,
    quiz_id            BIGINT UNSIGNED NOT NULL,
    selected_option_id BIGINT UNSIGNED NOT NULL,
    is_correct         TINYINT(1)      NOT NULL DEFAULT 0,
    attempted_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_attempts_user_quiz (user_id, quiz_id),
    KEY idx_attempts_user_time (user_id, attempted_at),
    KEY idx_attempts_quiz (quiz_id),
    CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_queue (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        BIGINT UNSIGNED NOT NULL,
    quiz_id        BIGINT UNSIGNED NOT NULL,
    next_review_at DATETIME        NOT NULL,
    interval_days  INT             NOT NULL DEFAULT 1,
    ease           DECIMAL(4,2)    NOT NULL DEFAULT 2.50,
    created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_review_user_quiz (user_id, quiz_id),
    KEY idx_review_due (user_id, next_review_at),
    KEY idx_review_quiz (quiz_id),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_stats (
    user_id          BIGINT UNSIGNED NOT NULL,
    xp               INT             NOT NULL DEFAULT 0,
    current_streak   INT             NOT NULL DEFAULT 0,
    longest_streak   INT             NOT NULL DEFAULT 0,
    last_active_date DATE            NULL,
    updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS badges (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code        VARCHAR(80)     NOT NULL,
    name        VARCHAR(120)    NOT NULL,
    description VARCHAR(255)    NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_badges_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
    user_id   BIGINT UNSIGNED NOT NULL,
    badge_id  BIGINT UNSIGNED NOT NULL,
    earned_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id),
    KEY idx_user_badges_badge (badge_id),
    CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_badges_badge FOREIGN KEY (badge_id) REFERENCES badges (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cheatsheet_items (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category    VARCHAR(100)    NOT NULL,
    command     VARCHAR(255)    NOT NULL,
    description TEXT            NOT NULL,
    example     TEXT            NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cheatsheet_category_command (category, command),
    KEY idx_cheatsheet_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
