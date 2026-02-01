// src/appsync.ts
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * GraphQL POST를 직접 날리는 방식.
 * - 장점: 동작이 투명해서 디버깅이 쉬움(초보자에게 유리)
 * - 핵심: Authorization 헤더에 JWT를 넣는다.
 *   AppSync(Cognito User Pools)는 이 JWT를 보고 사용자를 식별한다. :contentReference[oaicite:2]{index=2}
 */
export async function callAppSync<TData>(
  query: string,
  variables?: Record<string, any>
): Promise<TData> {
  // 1) 로그인 세션에서 토큰 꺼내기
  const session = await fetchAuthSession();

  // 보통 accessToken/idToken 둘 다 존재한다.
  // AppSync는 보통 Cognito User Pools 인증에서 토큰을 Authorization에 넣어 호출한다.
  const idToken = session.tokens?.idToken?.toString();
  if (!idToken) {
    throw new Error("로그인이 필요합니다: idToken이 없습니다.");
  }

  // 2) AppSync endpoint로 GraphQL POST
  const res = await fetch(import.meta.env.VITE_APPSYNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // ✅ 이게 너가 헷갈렸던 '헤더 value'의 의미:
      // Authorization: <JWT 문자열>
      Authorization: idToken,
      // 만약 401이 계속이면 아래처럼 Bearer를 붙여보는 경우도 있음(환경별 차이 대응)
      // Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  // GraphQL은 HTTP 200이어도 errors가 있을 수 있음
  if (json.errors?.length) {
    // 에러를 그대로 던져서 화면에서 확인할 수 있게 함
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data as TData;
}
