-- Final launch hardening: restore auth bootstrap and keep the public RPC surface minimal.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

DROP FUNCTION IF EXISTS public.roll_die();

REVOKE ALL ON FUNCTION public.cleanup_old_scores() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_scores() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_cotw() FROM anon;
REVOKE ALL ON FUNCTION public.update_cotw() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_lifetime_ep() FROM anon;
REVOKE ALL ON FUNCTION public.update_lifetime_ep() FROM authenticated;
REVOKE ALL ON FUNCTION public.update_streak() FROM anon;
REVOKE ALL ON FUNCTION public.update_streak() FROM authenticated;

REVOKE ALL ON FUNCTION public.admin_bump_shop_version() FROM anon;
REVOKE ALL ON FUNCTION public.admin_bump_shop_version() FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_randomize_cotw() FROM anon;
REVOKE ALL ON FUNCTION public.admin_randomize_cotw() FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_trigger_cotw_test() FROM anon;
REVOKE ALL ON FUNCTION public.admin_trigger_cotw_test() FROM authenticated;
