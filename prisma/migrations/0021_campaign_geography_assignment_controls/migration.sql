-- Additive Campaign Geography assignment controls. Increment 2 data is not rewritten.
INSERT INTO public.permissions ("key", "description", "updated_at")
VALUES
  ('campaign-geography:view', 'View campaign-scoped master geography assignments', CURRENT_TIMESTAMP),
  ('campaign-geography:manage', 'Manage campaign-scoped master geography assignments', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO public.role_permissions ("role", "permission_id", "updated_at")
SELECT mapping.role::"MembershipRole", permission.id, CURRENT_TIMESTAMP
FROM (VALUES
  ('CAMPAIGN_ADMINISTRATOR', 'campaign-geography:view'),
  ('CAMPAIGN_ADMINISTRATOR', 'campaign-geography:manage'),
  ('SUPER_ADMINISTRATOR', 'campaign-geography:view'),
  ('SUPER_ADMINISTRATOR', 'campaign-geography:manage')
) AS mapping(role, permission_key)
JOIN public.permissions AS permission ON permission."key" = mapping.permission_key
ON CONFLICT ("role", "permission_id") DO NOTHING;

CREATE OR REPLACE FUNCTION public.campaign_geography_assign(
  p_tenant_id uuid,
  p_campaign_id uuid,
  p_actor_id uuid,
  p_master_area_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_requested uuid[];
  v_target_ids uuid[];
  v_requested_count integer;
  v_campaign_country text;
  v_added integer;
  v_reactivated integer;
  v_unchanged integer;
  v_requested_changed integer;
  v_ancestor_changed integer;
  v_active_total integer;
BEGIN
  SELECT array_agg(id ORDER BY id), count(*)
    INTO v_requested, v_requested_count
    FROM (SELECT DISTINCT unnest(p_master_area_ids) AS id) requested;
  IF v_requested_count IS NULL OR v_requested_count < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Campaign geography selection is required.';
  END IF;
  IF v_requested_count > 500 OR array_position(v_requested, NULL) IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Campaign geography selection is invalid.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_tenant_id::text || ':' || p_campaign_id::text, 739204022)
  );

  SELECT CASE pg_catalog.upper(pg_catalog.btrim(c.country))
           WHEN 'NIGERIA' THEN 'NG' WHEN 'NG' THEN 'NG' ELSE NULL
         END
    INTO v_campaign_country
    FROM public.campaigns c
   WHERE c.id = p_campaign_id AND c.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Campaign not found.';
  END IF;
  IF v_campaign_country IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Campaign country is unsupported.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.role_permissions rp ON rp.role = m.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE m.tenant_id = p_tenant_id
      AND m.user_id = p_actor_id
      AND m.status = 'ACTIVE'
      AND p."key" = 'campaign-geography:manage'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Campaign geography authorization failed.';
  END IF;

  IF (SELECT count(*) FROM public.master_geographic_areas a
      JOIN public.master_geographic_levels l ON l.id = a.level_id AND l.country_code = a.country_code
      WHERE a.id = ANY(v_requested) AND a.country_code = v_campaign_country
        AND a.is_active AND l.is_active) <> v_requested_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A master geographic area is inactive or unavailable.';
  END IF;

  WITH RECURSIVE ancestry(origin_id, id, parent_id, level_id, country_code, path, depth) AS (
    SELECT a.id, a.id, a.parent_id, a.level_id, a.country_code, ARRAY[a.id], 0
    FROM public.master_geographic_areas a
    JOIN public.master_geographic_levels l ON l.id = a.level_id AND l.country_code = a.country_code
    WHERE a.id = ANY(v_requested) AND a.country_code = v_campaign_country
      AND a.is_active AND l.is_active
    UNION ALL
    SELECT tree.origin_id, parent.id, parent.parent_id, parent.level_id, parent.country_code,
           tree.path || parent.id, tree.depth + 1
    FROM ancestry tree
    JOIN public.master_geographic_areas parent ON parent.id = tree.parent_id
    JOIN public.master_geographic_levels parent_level
      ON parent_level.id = parent.level_id AND parent_level.country_code = parent.country_code
    WHERE parent.is_active AND parent_level.is_active
      AND tree.depth < 16 AND NOT parent.id = ANY(tree.path)
  ), invalid AS (
    SELECT tree.id
    FROM ancestry tree
    JOIN public.master_geographic_levels child_level ON child_level.id = tree.level_id
    LEFT JOIN public.master_geographic_areas parent ON parent.id = tree.parent_id
    LEFT JOIN public.master_geographic_levels parent_level ON parent_level.id = parent.level_id
    WHERE tree.country_code <> v_campaign_country
       OR (tree.parent_id IS NULL AND (child_level.order_index <> 0 OR child_level.name <> 'Country'))
       OR (tree.parent_id IS NOT NULL AND (
            parent.id IS NULL OR parent.country_code <> tree.country_code OR
            parent_level.order_index <> CASE child_level.order_index
              WHEN 1 THEN 0 WHEN 2 THEN 1 WHEN 5 THEN 2 WHEN 6 THEN 5 ELSE -1 END
          ))
  ), roots AS (
    SELECT origin_id, count(*) FILTER (WHERE parent_id IS NULL) AS root_count
    FROM ancestry GROUP BY origin_id
  )
  SELECT array_agg(DISTINCT id ORDER BY id)
    INTO v_target_ids
    FROM ancestry
   WHERE NOT EXISTS (SELECT 1 FROM invalid)
     AND NOT EXISTS (SELECT 1 FROM roots WHERE root_count <> 1);
  IF v_target_ids IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Master geographic ancestry is invalid.';
  END IF;

  SELECT count(*) FILTER (WHERE assignment.id IS NULL),
         count(*) FILTER (WHERE assignment.id IS NOT NULL AND NOT assignment.is_active),
         count(*) FILTER (WHERE assignment.is_active)
    INTO v_added, v_reactivated, v_unchanged
  FROM unnest(v_target_ids) target(id)
  LEFT JOIN public.campaign_geographic_assignments assignment
    ON assignment.tenant_id = p_tenant_id
   AND assignment.campaign_id = p_campaign_id
   AND assignment.master_geographic_area_id = target.id;

  SELECT count(*) INTO v_requested_changed
  FROM unnest(v_requested) requested(id)
  LEFT JOIN public.campaign_geographic_assignments assignment
    ON assignment.tenant_id = p_tenant_id
   AND assignment.campaign_id = p_campaign_id
   AND assignment.master_geographic_area_id = requested.id
  WHERE assignment.id IS NULL OR NOT assignment.is_active;

  INSERT INTO public.campaign_geographic_assignments
    (id, tenant_id, campaign_id, master_geographic_area_id, is_active,
     created_by_id, updated_by_id, created_at, updated_at, removed_at)
  SELECT pg_catalog.gen_random_uuid(), p_tenant_id, p_campaign_id, target.id, true,
         p_actor_id, p_actor_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL
  FROM unnest(v_target_ids) target(id)
  ON CONFLICT (tenant_id, campaign_id, master_geographic_area_id) DO UPDATE
    SET is_active = true, removed_at = NULL, updated_by_id = p_actor_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE NOT public.campaign_geographic_assignments.is_active;

  v_ancestor_changed := v_added + v_reactivated - v_requested_changed;
  v_ancestor_changed := GREATEST(v_ancestor_changed, 0);
  SELECT count(*) INTO v_active_total
  FROM public.campaign_geographic_assignments
  WHERE tenant_id = p_tenant_id AND campaign_id = p_campaign_id AND is_active;

  INSERT INTO public.security_audit_events
    (id, tenant_id, actor_id, action, entity, entity_id, metadata, created_at, updated_at)
  VALUES (
    pg_catalog.gen_random_uuid(), p_tenant_id, p_actor_id,
    'CAMPAIGN_GEOGRAPHY_ASSIGNMENTS_ADDED', 'campaign', p_campaign_id,
    pg_catalog.jsonb_build_object(
      'requested', v_requested_count, 'added', v_added, 'reactivated', v_reactivated,
      'ancestorsChanged', v_ancestor_changed, 'unchanged', v_unchanged,
      'activeTotal', v_active_total, 'bulk', v_requested_count > 1
    ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );
  RETURN pg_catalog.jsonb_build_object(
    'requested', v_requested_count, 'added', v_added, 'reactivated', v_reactivated,
    'ancestorsChanged', v_ancestor_changed, 'unchanged', v_unchanged,
    'activeTotal', v_active_total
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.campaign_geography_deactivate(
  p_tenant_id uuid,
  p_campaign_id uuid,
  p_actor_id uuid,
  p_master_area_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_requested uuid[];
  v_requested_count integer;
  v_campaign_country text;
  v_deactivated integer;
  v_unchanged integer;
  v_active_total integer;
BEGIN
  SELECT array_agg(id ORDER BY id), count(*)
    INTO v_requested, v_requested_count
    FROM (SELECT DISTINCT unnest(p_master_area_ids) AS id) requested;
  IF v_requested_count IS NULL OR v_requested_count < 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Campaign geography selection is required.';
  END IF;
  IF v_requested_count > 500 OR array_position(v_requested, NULL) IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Campaign geography selection is invalid.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_tenant_id::text || ':' || p_campaign_id::text, 739204022)
  );
  SELECT CASE pg_catalog.upper(pg_catalog.btrim(c.country))
           WHEN 'NIGERIA' THEN 'NG' WHEN 'NG' THEN 'NG' ELSE NULL
         END
    INTO v_campaign_country
    FROM public.campaigns c
   WHERE c.id = p_campaign_id AND c.tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Campaign not found.';
  END IF;
  IF v_campaign_country IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Campaign country is unsupported.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.role_permissions rp ON rp.role = m.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE m.tenant_id = p_tenant_id AND m.user_id = p_actor_id
      AND m.status = 'ACTIVE' AND p."key" = 'campaign-geography:manage'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Campaign geography authorization failed.';
  END IF;
  IF (SELECT count(*) FROM public.master_geographic_areas a
      JOIN public.master_geographic_levels l ON l.id = a.level_id AND l.country_code = a.country_code
      WHERE a.id = ANY(v_requested) AND a.country_code = v_campaign_country
        AND a.is_active AND l.is_active) <> v_requested_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A master geographic area is inactive or unavailable.';
  END IF;

  IF EXISTS (
    WITH RECURSIVE ancestry(origin_id, id, parent_id, level_id, country_code, path, depth) AS (
      SELECT a.id, a.id, a.parent_id, a.level_id, a.country_code, ARRAY[a.id], 0
      FROM public.master_geographic_areas a
      JOIN public.master_geographic_levels l
        ON l.id = a.level_id AND l.country_code = a.country_code
      WHERE a.id = ANY(v_requested) AND a.country_code = v_campaign_country
        AND a.is_active AND l.is_active
      UNION ALL
      SELECT tree.origin_id, parent.id, parent.parent_id, parent.level_id, parent.country_code,
             tree.path || parent.id, tree.depth + 1
      FROM ancestry tree
      JOIN public.master_geographic_areas parent ON parent.id = tree.parent_id
      JOIN public.master_geographic_levels parent_level
        ON parent_level.id = parent.level_id AND parent_level.country_code = parent.country_code
      WHERE parent.is_active AND parent_level.is_active AND tree.depth < 16
        AND NOT parent.id = ANY(tree.path)
    ), invalid AS (
      SELECT tree.id
      FROM ancestry tree
      JOIN public.master_geographic_levels child_level ON child_level.id = tree.level_id
      LEFT JOIN public.master_geographic_areas parent ON parent.id = tree.parent_id
      LEFT JOIN public.master_geographic_levels parent_level ON parent_level.id = parent.level_id
      WHERE tree.country_code <> v_campaign_country
         OR (tree.parent_id IS NULL AND (child_level.order_index <> 0 OR child_level.name <> 'Country'))
         OR (tree.parent_id IS NOT NULL AND (
              parent.id IS NULL OR parent.country_code <> tree.country_code OR
              parent_level.order_index <> CASE child_level.order_index
                WHEN 1 THEN 0 WHEN 2 THEN 1 WHEN 5 THEN 2 WHEN 6 THEN 5 ELSE -1 END
            ))
    ), roots AS (
      SELECT origin_id, count(*) FILTER (WHERE parent_id IS NULL) AS root_count
      FROM ancestry GROUP BY origin_id
    )
    SELECT 1 FROM invalid
    UNION ALL
    SELECT 1 FROM roots WHERE root_count <> 1
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Master geographic ancestry is invalid.';
  END IF;

  IF EXISTS (
    WITH RECURSIVE descendants(id, path, depth) AS (
      SELECT id, ARRAY[id], 1
      FROM public.master_geographic_areas
      WHERE parent_id = ANY(v_requested)
      UNION ALL
      SELECT child.id, parent.path || child.id, parent.depth + 1
      FROM public.master_geographic_areas child
      JOIN descendants parent ON child.parent_id = parent.id
      WHERE parent.depth < 16 AND NOT child.id = ANY(parent.path)
    )
    SELECT 1 FROM descendants d
    JOIN public.campaign_geographic_assignments assignment
      ON assignment.master_geographic_area_id = d.id
     AND assignment.tenant_id = p_tenant_id
     AND assignment.campaign_id = p_campaign_id
     AND assignment.is_active
    WHERE NOT d.id = ANY(v_requested)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'An assigned descendant prevents geographic removal.';
  END IF;

  UPDATE public.campaign_geographic_assignments
     SET is_active = false, removed_at = CURRENT_TIMESTAMP,
         updated_by_id = p_actor_id, updated_at = CURRENT_TIMESTAMP
   WHERE tenant_id = p_tenant_id AND campaign_id = p_campaign_id
     AND master_geographic_area_id = ANY(v_requested) AND is_active;
  GET DIAGNOSTICS v_deactivated = ROW_COUNT;
  v_unchanged := v_requested_count - v_deactivated;
  SELECT count(*) INTO v_active_total FROM public.campaign_geographic_assignments
   WHERE tenant_id = p_tenant_id AND campaign_id = p_campaign_id AND is_active;

  INSERT INTO public.security_audit_events
    (id, tenant_id, actor_id, action, entity, entity_id, metadata, created_at, updated_at)
  VALUES (
    pg_catalog.gen_random_uuid(), p_tenant_id, p_actor_id,
    'CAMPAIGN_GEOGRAPHY_ASSIGNMENTS_DEACTIVATED', 'campaign', p_campaign_id,
    pg_catalog.jsonb_build_object(
      'requested', v_requested_count, 'deactivated', v_deactivated,
      'unchanged', v_unchanged, 'activeTotal', v_active_total, 'bulk', v_requested_count > 1
    ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );
  RETURN pg_catalog.jsonb_build_object(
    'requested', v_requested_count, 'deactivated', v_deactivated,
    'unchanged', v_unchanged, 'activeTotal', v_active_total
  );
END;
$function$;

ALTER FUNCTION public.campaign_geography_assign(uuid, uuid, uuid, uuid[]) OWNER TO polismart_migrator;
ALTER FUNCTION public.campaign_geography_deactivate(uuid, uuid, uuid, uuid[]) OWNER TO polismart_migrator;
REVOKE ALL ON FUNCTION public.campaign_geography_assign(uuid, uuid, uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.campaign_geography_deactivate(uuid, uuid, uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.campaign_geography_assign(uuid, uuid, uuid, uuid[]) TO polismart_runtime;
GRANT EXECUTE ON FUNCTION public.campaign_geography_deactivate(uuid, uuid, uuid, uuid[]) TO polismart_runtime;
