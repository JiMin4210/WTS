import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * ✅ Cognito 그룹 기반 관리자 판별
 * - ID 토큰 payload의 "cognito:groups"에 admins 포함 여부
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);

      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      const payload: any = idToken?.payload ?? {};

      const groups = (payload["cognito:groups"] as string[] | undefined) ?? [];
      setIsAdmin(Array.isArray(groups) && groups.includes("admins"));
    } catch (e: any) {
      setIsAdmin(false);
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { isAdmin, loading, error, refresh };
}
