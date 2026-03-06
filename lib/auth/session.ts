import type { User } from "@supabase/supabase-js";
import { canManageContent } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthUserContext = {
  user: User;
  roles: string[];
  isAdmin: boolean;
};

export async function getAuthUserContext(): Promise<AuthUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: userRoleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    return {
      user,
      roles: [],
      isAdmin: false
    };
  }

  const roles = (userRoleRows ?? []).map((row) => row.role);

  return {
    user,
    roles,
    isAdmin: canManageContent(roles)
  };
}

