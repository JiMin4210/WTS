// src/amplify.ts
import { Amplify } from "aws-amplify";

/**
 * 중요한 개념:
 * - Cognito Hosted UI로 로그인하면 브라우저가 redirect_uri로 돌아온다.
 * - Amplify Auth는 그 과정에서 토큰을 로컬에 저장/관리한다.
 * - 우리는 "세션에서 토큰을 꺼내서" AppSync 호출 시 Authorization 헤더에 넣는다.
 */
export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,

        // Hosted UI(OAuth) 설정
        loginWith: {
          oauth: {
            domain: import.meta.env.VITE_COGNITO_DOMAIN.replace("https://", ""),
            scopes: ["openid", "email"], // 최소 스코프
            redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN],
            redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT],
            responseType: "code", // 너가 이미 쓰던 방식(Authorization Code)
          },
        },
      },
    },
  });
}
