-- Wave 3: support anonymous visitors and stable visitor analytics.
--
-- Existing rows are authenticated events, so backfill a deterministic
-- pseudonymous visitor UUID per legacy user before making visitor_id required.
-- Rows without a user (possible only in inconsistent data) receive a random UUID.

ALTER TABLE public.visitor_interaction
    ADD COLUMN visitor_id uuid;

UPDATE public.visitor_interaction
SET visitor_id = CASE
    WHEN user_id IS NOT NULL THEN
        ('00000000-0000-4000-8000-' || lpad(user_id::text, 12, '0'))::uuid
    ELSE gen_random_uuid()
END
WHERE visitor_id IS NULL;

ALTER TABLE public.visitor_interaction
    ALTER COLUMN visitor_id SET NOT NULL;

ALTER TABLE public.visitor_interaction
    ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX idx_visitor_interaction_interacted_at
    ON public.visitor_interaction (interacted_at);

CREATE INDEX idx_visitor_interaction_visitor_id
    ON public.visitor_interaction (visitor_id);
