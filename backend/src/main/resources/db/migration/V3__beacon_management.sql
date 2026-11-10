-- Wave 4: persistent iBeacon identity and artifact mapping.
--
-- A beacon is identified by the full iBeacon tuple
-- (proximity_uuid, major, minor). MAC addresses are intentionally not used:
-- they are randomized on some Android devices and unavailable on iOS.

CREATE TABLE public.beacon (
    beacon_id integer NOT NULL,
    name character varying(255) NOT NULL,
    proximity_uuid uuid NOT NULL,
    major integer NOT NULL,
    minor integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    artifact_id integer
);

CREATE SEQUENCE public.beacon_beacon_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.beacon_beacon_id_seq OWNED BY public.beacon.beacon_id;
ALTER TABLE ONLY public.beacon
    ALTER COLUMN beacon_id SET DEFAULT nextval('public.beacon_beacon_id_seq'::regclass);

ALTER TABLE ONLY public.beacon
    ADD CONSTRAINT beacon_pkey PRIMARY KEY (beacon_id);
ALTER TABLE ONLY public.beacon
    ADD CONSTRAINT uk_beacon_identity UNIQUE (proximity_uuid, major, minor);
ALTER TABLE ONLY public.beacon
    ADD CONSTRAINT ck_beacon_major_range CHECK (major BETWEEN 0 AND 65535);
ALTER TABLE ONLY public.beacon
    ADD CONSTRAINT ck_beacon_minor_range CHECK (minor BETWEEN 0 AND 65535);
ALTER TABLE ONLY public.beacon
    ADD CONSTRAINT fk_beacon_artifact FOREIGN KEY (artifact_id)
    REFERENCES public.artifact(artifact_id);

CREATE INDEX idx_beacon_artifact_id
    ON public.beacon (artifact_id);

ALTER TABLE public.visitor_interaction
    ADD COLUMN beacon_id integer;

ALTER TABLE ONLY public.visitor_interaction
    ADD CONSTRAINT fk_visitor_interaction_beacon FOREIGN KEY (beacon_id)
    REFERENCES public.beacon(beacon_id)
    ON DELETE SET NULL;

CREATE INDEX idx_visitor_interaction_beacon_id
    ON public.visitor_interaction (beacon_id);
