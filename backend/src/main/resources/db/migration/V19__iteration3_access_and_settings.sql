-- Checked against origin/main inventory on 2026-11-01 (latest V18).
-- RBAC permission codes are existing application capabilities, not arbitrary SpEL.
ALTER TABLE users ADD COLUMN access_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE roles ADD COLUMN edit_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE system_settings ADD COLUMN edit_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL,
    permission_code VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id, permission_code),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT ck_role_permission_code CHECK (permission_code IN ('READER','SUBSCRIBER','BUSINESS','AD_MANAGER','ADMINISTRATOR'))
) ENGINE=InnoDB;
INSERT INTO role_permissions(role_id,permission_code)
SELECT role_id,role_name FROM roles WHERE role_name IN ('READER','SUBSCRIBER','BUSINESS','AD_MANAGER','ADMINISTRATOR');
