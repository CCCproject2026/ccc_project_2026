/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	images: {
		// マイページのプロフィール写真（Clerk が配信する画像）を next/image で表示するため
		remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
	},
};

export default nextConfig;
