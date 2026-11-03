-- Community discussion + admin role (Fase 3).

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'learner';
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('learner', 'admin'));

CREATE TABLE IF NOT EXISTS lesson_comments (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    lesson_id  BIGINT UNSIGNED NOT NULL,
    user_id    BIGINT UNSIGNED NOT NULL,
    content    TEXT            NOT NULL,
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comments_lesson (lesson_id, created_at),
    KEY idx_comments_user (user_id),
    CONSTRAINT fk_comments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
