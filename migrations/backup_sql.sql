| backup_sql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| -- Function: can_access_family_bulletins
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.can_access_family_bulletins(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:view_bulletins');
END;
$function$
;

                                                |
| -- Function: can_create_family_bulletins
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.can_create_family_bulletins(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:create_bulletins');
END;
$function$
;

                                              |
| -- Function: can_delete_family_bulletins
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.can_delete_family_bulletins(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:delete_bulletins');
END;
$function$
;

                                              |
| -- Function: can_edit_family_bulletins
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.can_edit_family_bulletins(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN has_permission(user_uuid, 'admin:full_access') OR
         has_permission(user_uuid, 'family:full_access') OR
         has_permission(user_uuid, 'family:edit_bulletins');
END;
$function$
;

                                                    |
| -- Function: get_user_role
-- Parameters: user_uuid uuid
-- Return type: character varying
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Returns NULL for unauthenticated users
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Returns role string for authenticated users
  RETURN (
    SELECT role 
    FROM user_roles 
    WHERE user_id = user_uuid
  );
END;
$function$
;

 |
| -- Function: has_permission
-- Parameters: user_uuid uuid, permission_name character varying
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.has_permission(user_uuid uuid, permission_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_id = user_uuid AND permission = permission_name
  );
END;
$function$
;

                                                              |
| -- Function: is_family
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.is_family(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN get_user_role(user_uuid) = 'family';
END;
$function$
;

                                                                                                                                                                                                                          |
| -- Function: is_family_or_admin
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.is_family_or_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN get_user_role(user_uuid) IN ('family', 'admin');
END;
$function$
;

                                                                                                                                                                                            |
| -- Function: is_user_admin
-- Parameters: user_uuid uuid
-- Return type: boolean
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN get_user_role(user_uuid) = 'admin';
END;
$function$
;

                                                                                                                                                                                                                   |
| -- Function: set_created_by
-- Parameters: 
-- Return type: trigger
CREATE OR REPLACE FUNCTION public.set_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$function$
;

                                                                                                                                                                                                                                             |
| -- Function: set_document_created_by
-- Parameters: 
-- Return type: trigger
CREATE OR REPLACE FUNCTION public.set_document_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$function$
;

                                                                                                                                                                                                                           |
| -- Function: update_document_updated_at
-- Parameters: 
-- Return type: trigger
CREATE OR REPLACE FUNCTION public.update_document_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

                                                                                                                                                                                                                          |