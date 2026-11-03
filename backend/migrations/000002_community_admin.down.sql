DROP TABLE IF EXISTS lesson_comments;
ALTER TABLE users DROP CONSTRAINT chk_users_role;
ALTER TABLE users DROP COLUMN role;
