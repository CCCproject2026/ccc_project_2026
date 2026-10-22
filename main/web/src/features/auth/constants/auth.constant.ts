// Clerk に渡す、サインイン・サインアップの送り先
//
// Clerk はこの指定がなければ、自分自身のページ
// （Clerk のロゴと英語だけの「Sign in to test」画面）に送ってしまう。
// どの環境（ローカル・Heroku・その他）でも、このアプリのログイン画面へ
// 行くように、コードで固定している。
//
// ・ログイン画面 … /login（app/login/[[...rest]]/page.tsx）
// ・アカウントを作れるのは招待を受けた人だけなので、
//   サインアップの送り先も /login にする
//   （/sign-up は招待チケットがないと「招待リンクが正しくありません」と出る）
export const SIGN_IN_URL = "/login";
export const SIGN_UP_URL = "/login";
