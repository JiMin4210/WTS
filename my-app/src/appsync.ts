// src/appsync.ts
import { fetchAuthSession } from "aws-amplify/auth";

/**
 * GraphQL POST를 직접 날리는 방식.
 * - 장점: 동작이 투명해서 디버깅이 쉬움(초보자에게 유리)
 * - 핵심: Authorization 헤더에 JWT를 넣는다.
 *   AppSync(Cognito User Pools)는 이 JWT를 보고 사용자를 식별한다. :contentReference[oaicite:2]{index=2}
 */

// 개발 모드 여부 (Vite 제공)
const isDev = import.meta.env.DEV;

// 개발 로그용 헬퍼
function devLog(...args: any[]) {
  if (isDev) {
    console.log(...args);
  }
}

// 토큰 마스킹 (앞/뒤만 보여주기)
function maskToken(token: string, head = 12, tail = 8) {
  if (token.length <= head + tail) return token;
  return `${token.slice(0, head)}...${token.slice(-tail)}`;
}

export async function callAppSync<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  devLog("[callAppSync] start");
  devLog("[callAppSync] variables:", variables ?? "(none)");

  // 1) 세션에서 토큰 꺼내기
  const session = await fetchAuthSession();

  devLog("[callAppSync] session tokens exist?:", {
    hasIdToken: !!session.tokens?.idToken,
    hasAccessToken: !!session.tokens?.accessToken,
  });

  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    devLog("[callAppSync] no idToken -> need login");
    throw new Error("로그인이 필요합니다 (idToken 없음)");
  }

  devLog("[callAppSync] idToken (masked):", maskToken(idToken));

  // 2) 요청 미리보기
  devLog("[callAppSync] query (head 120):", query.slice(0, 120));
  devLog("[callAppSync] request body preview:", {
    queryHead: query.slice(0, 80),
    variables: variables ?? null,
  });

  // 2) AppSync endpoint로 GraphQL POST
  const res = await fetch(import.meta.env.VITE_APPSYNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: idToken,
      // 만약 401이 계속이면 아래처럼 Bearer를 붙여보는 경우도 있음(환경별 차이 대응)
      // Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  devLog("[callAppSync] http status:", res.status);

  const json = await res.json();

  devLog("[callAppSync] response keys:", Object.keys(json));

  if (json.errors?.length) {
    devLog("[callAppSync] graphql errors:", json.errors);
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  devLog("[callAppSync] data preview:", json.data);
  devLog("[callAppSync] end (success)");

  return json.data as T;
}
