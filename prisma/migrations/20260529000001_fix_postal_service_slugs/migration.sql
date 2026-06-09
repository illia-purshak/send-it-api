-- Fix postal service slugs and names
-- Rename nova-poshta → nova-post (canonical slug), migrate any existing connections

DO $$
DECLARE
  v_nova_poshta_id INTEGER;
  v_nova_post_id   INTEGER;
BEGIN
  SELECT id INTO v_nova_poshta_id FROM "PostalService" WHERE slug = 'nova-poshta';
  SELECT id INTO v_nova_post_id   FROM "PostalService" WHERE slug = 'nova-post';

  IF v_nova_poshta_id IS NOT NULL AND v_nova_post_id IS NULL THEN
    -- Only old slug exists — rename it in-place
    UPDATE "PostalService"
      SET slug = 'nova-post', name = 'Нова пошта', "updatedAt" = NOW()
      WHERE id = v_nova_poshta_id;

  ELSIF v_nova_poshta_id IS NOT NULL AND v_nova_post_id IS NOT NULL THEN
    -- Both exist — migrate connections to nova-post, then delete nova-poshta
    UPDATE "UserPostalConnection"
      SET "postalServiceId" = v_nova_post_id
      WHERE "postalServiceId" = v_nova_poshta_id;
    DELETE FROM "PostalService" WHERE id = v_nova_poshta_id;
    UPDATE "PostalService"
      SET name = 'Нова пошта', "updatedAt" = NOW()
      WHERE id = v_nova_post_id;

  ELSIF v_nova_post_id IS NOT NULL THEN
    -- Only nova-post exists — just correct the name
    UPDATE "PostalService"
      SET name = 'Нова пошта', "updatedAt" = NOW()
      WHERE id = v_nova_post_id;
  END IF;
END $$;

-- Correct Meest display name to Ukrainian spelling
UPDATE "PostalService"
  SET name = 'Міст', "updatedAt" = NOW()
  WHERE slug = 'meest';

-- Remove any duplicate/wrong-name postal service records that aren't canonical slugs
DELETE FROM "PostalService"
  WHERE slug NOT IN ('nova-post', 'ukrposhta', 'meest')
    AND (
      name ILIKE '%новопошт%'
      OR name ILIKE '%новапост%'
      OR name ILIKE '%novapost%'
      OR name ILIKE '%мист%'
    );
