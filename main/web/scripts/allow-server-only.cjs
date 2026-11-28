// スクリプト（scripts/）用の準備ファイル
//
// "server-only" は「ブラウザ用のコードに混ざっていないか」を Next.js がチェックするための目印で、
// Next.js の外（このスクリプト）で読み込むとエラーになる。
// ここでは "server-only" だけを空のモジュールに置き換える（React などは本物のまま使う）。
//
// 使い方: tsx --require ./scripts/allow-server-only.cjs scripts/xxx.ts
const Module = require("node:module");
const path = require("node:path");

const emptyModule = path.join(__dirname, "empty-module.cjs");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, ...rest) {
	if (request === "server-only") {
		return emptyModule;
	}
	return originalResolveFilename.call(this, request, ...rest);
};
