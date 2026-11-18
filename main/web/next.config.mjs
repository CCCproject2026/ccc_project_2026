// セキュリティヘッダ。
// CSP は Clerk と Next.js が inline script を挿入するため、まず Report-Only で導入する。
// Report-Only は違反してもブロックされないので、ブラウザのコンソールで確認しながら
// 方針（report-uri の追加 → 縮小 → 本番ヘッダへの切替）を決める。
const contentSecurityPolicyReportOnly = [
	"default-src 'self'",
	// Next.js の inline script と Clerk の初期化スクリプトを許可する
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.com",
	"style-src 'self' 'unsafe-inline'",
	"font-src 'self' data:",
	// プロフィール写真は img.clerk.com、Clerk は beacon を送る
	"img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev",
	"connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com",
	// Clerk のサインイン・再認証などの埋め込み画面
	"frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	images: {
		// マイページのプロフィール写真（Clerk が配信する画像）を next/image で表示するため
		remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					// クリックジャッキング対策（CSP の frame-ancestors は Report-Only のため現在はこれで担保）
					{ key: "X-Frame-Options", value: "SAMEORIGIN" },
					// 送信元の URL を必要最小限だけ送る
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					// MIME 嗅ぎ分け（content sniffing）による実行を防ぐ
					{ key: "X-Content-Type-Options", value: "nosniff" },
					// HTTPS でしか適用されない（HTTP 応答では UA が無視するため
					// ローカル開発には影響しない）。サブドメインも HTTPS に強制する。
					{
						key: "Strict-Transport-Security",
						value: "max-age=31536000; includeSubDomains",
					},
					{
						key: "Content-Security-Policy-Report-Only",
						value: contentSecurityPolicyReportOnly,
					},
				],
			},
		];
	},
};

export default nextConfig;
