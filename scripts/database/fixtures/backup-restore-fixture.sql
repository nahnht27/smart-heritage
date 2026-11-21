INSERT INTO public.role (name) VALUES ('VISITOR')
RETURNING role_id AS visitor_role_id
\gset

INSERT INTO public.role (name) VALUES ('ADMIN')
RETURNING role_id AS admin_role_id
\gset

INSERT INTO public."user" (role_id, username, email, password_hash)
VALUES (:visitor_role_id, 'backup_visitor', 'backup.visitor@example.com',
        'backup-restore-fixture-not-a-real-hash')
RETURNING user_id AS visitor_user_id
\gset

INSERT INTO public."user" (role_id, username, email, password_hash)
VALUES (:admin_role_id, 'backup_admin', 'backup.admin@example.com',
        'backup-restore-fixture-not-a-real-hash')
RETURNING user_id AS admin_user_id
\gset

INSERT INTO public.heritage_site (name, description, address, latitude, longitude)
VALUES ('S6 Backup Heritage Site', 'Deterministic backup fixture',
        '1 Backup Test Street', 16.463700, 107.590900)
RETURNING site_id AS site_id
\gset

INSERT INTO public.artifact (site_id, name, description)
VALUES (:site_id, 'S6 Backup Artifact', 'Artifact linked to the backup fixture')
RETURNING artifact_id AS artifact_id
\gset

INSERT INTO public.multimedia (artifact_id, type, title, url)
VALUES (:artifact_id, 'IMAGE', 'S6 Backup Image', 'https://example.com/s6-backup.jpg')
RETURNING multimedia_id AS multimedia_id
\gset

INSERT INTO public.beacon
    (name, proximity_uuid, major, minor, enabled, artifact_id)
VALUES ('S6 Backup Beacon', '66666666-6666-4666-8666-666666666666',
        321, 654, true, :artifact_id)
RETURNING beacon_id AS beacon_id
\gset

INSERT INTO public.visitor_interaction
    (event_id, visitor_id, user_id, artifact_id, beacon_id,
     interaction_type, language_code, started_at, ended_at,
     duration_seconds, interacted_at)
VALUES
    ('77777777-7777-4777-8777-777777777777',
     '88888888-8888-4888-8888-888888888888',
     :visitor_user_id, :artifact_id, :beacon_id,
     'BEACON_TRIGGER', 'vi', '2026-11-20T08:00:00Z', '2026-11-20T08:00:30Z',
     30, '2026-11-20T08:00:00Z');

INSERT INTO public.visitor_interaction
    (event_id, visitor_id, user_id, artifact_id, beacon_id,
     interaction_type, language_code, started_at, ended_at,
     duration_seconds, interacted_at)
VALUES
    ('99999999-9999-4999-8999-999999999999',
     'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
     NULL, :artifact_id, NULL,
     'VIEW', 'en', '2026-11-20T09:00:00Z', NULL,
     NULL, '2026-11-20T09:00:00Z');
