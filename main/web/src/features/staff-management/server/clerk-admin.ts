import "server-only";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient, type Invitation, type User } from "@clerk/nextjs/server";

// Clerk を1回呼ぶときの時間制限（設計書 6節：外部HTTPは1回5秒）
const CLERK_TIMEOUT_MS = 5000;

// 一覧を取るときの1ページの件数（Clerk の上限は 500）
const PAGE_SIZE = 100;

// 一覧を取るときの最大ページ数（無限ループ防止。100件 × 50ページ = 5000件まで）
const MAX_PAGES = 50;

// ===== 結果の形 =====
// SUCCESS : 成功した
// FAILED  : 確実に失敗した（Clerk が断った。Clerk 側では何も起きていない）
// UNKNOWN : 結果がわからない（タイムアウトなど。Clerk 側では実行されたかもしれない）
export type ClerkResult<T> =
	| { kind: "SUCCESS"; data: T }
	| { kind: "FAILED"; errorCode: string; status: number }
	| { kind: "UNKNOWN"; reason: string };

// 本システムで使う Clerk ユーザーの情報（必要な項目だけ）
export type ClerkStaffUser = {
	id: string;
	primaryEmail: string | null; // 小文字・空白なしに整えたもの
	isPrimaryEmailVerified: boolean; // primary email が確認済みか
	staffUserId: string | null; // 招待のときに付けた publicMetadata.staffUserId
	isUsable: boolean; // 停止（banned）・ロック（locked）されていないか
};

// 本システムで使う Clerk 招待の情報（必要な項目だけ）
export type ClerkStaffInvitation = {
	id: string;
	email: string; // 小文字・空白なしに整えたもの
	staffUserId: string | null; // 本システムが発行した招待なら User.id が入っている
};

// メールアドレスを比べるときは、必ずこの形に整えてから比べる
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

// ===== 時間制限 =====

class ClerkTimeoutError extends Error {}

// promise が 5 秒以内に終わらなければ ClerkTimeoutError にする
// 注意: Clerk への通信そのものは止まらない（だから結果は「不明」として扱う）
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			reject(new ClerkTimeoutError());
		}, CLERK_TIMEOUT_MS);
	});

	try {
		// Promise.race: 先に終わった方の結果を使う
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer);
	}
}

// ===== エラーの分類 =====

function toFailure(error: unknown): ClerkResult<never> {
	// 時間切れ → 届いたかどうかわからない
	if (error instanceof ClerkTimeoutError) {
		return { kind: "UNKNOWN", reason: "TIMEOUT" };
	}

	if (isClerkAPIResponseError(error)) {
		// 4xx → Clerk が「受け付けない」と返事をした。確実な失敗
		if (error.status >= 400 && error.status < 500) {
			let errorCode = "unknown";
			if (error.errors.length > 0) {
				errorCode = error.errors[0].code;
			}
			return { kind: "FAILED", errorCode, status: error.status };
		}
		// 5xx → Clerk 側の障害。処理されたかどうかわからない
		return { kind: "UNKNOWN", reason: `CLERK_${error.status}` };
	}

	// ネットワークエラーなど → 届いたかどうかわからない
	return { kind: "UNKNOWN", reason: "NETWORK" };
}

// Clerk を呼んで、結果を ClerkResult の形にする
async function callClerk<T>(action: () => Promise<T>): Promise<ClerkResult<T>> {
	try {
		const data = await action();
		return { kind: "SUCCESS", data };
	} catch (error) {
		return toFailure(error);
	}
}

// ===== Clerk のデータを、本システム用の形に変える =====

function toClerkStaffUser(user: User): ClerkStaffUser {
	// primary email を探す
	let primaryEmail: string | null = null;
	let isPrimaryEmailVerified = false;

	for (const address of user.emailAddresses) {
		if (address.id === user.primaryEmailAddressId) {
			primaryEmail = normalizeEmail(address.emailAddress);
			isPrimaryEmailVerified = address.verification?.status === "verified";
		}
	}

	// 招待のときに付けた staffUserId（なければ null）
	let staffUserId: string | null = null;
	if (typeof user.publicMetadata.staffUserId === "string") {
		staffUserId = user.publicMetadata.staffUserId;
	}

	return {
		id: user.id,
		primaryEmail,
		isPrimaryEmailVerified,
		staffUserId,
		isUsable: !user.banned && !user.locked,
	};
}

function toClerkStaffInvitation(invitation: Invitation): ClerkStaffInvitation {
	let staffUserId: string | null = null;
	if (
		invitation.publicMetadata !== null &&
		typeof invitation.publicMetadata.staffUserId === "string"
	) {
		staffUserId = invitation.publicMetadata.staffUserId;
	}

	return {
		id: invitation.id,
		email: normalizeEmail(invitation.emailAddress),
		staffUserId,
	};
}

// ===== 外から使う関数 =====

// Clerk ユーザーを ID で取得する。存在しなければ data が null
export async function getClerkUser(
	clerkUserId: string,
): Promise<ClerkResult<ClerkStaffUser | null>> {
	const result = await callClerk(async () => {
		const client = await clerkClient();
		const user = await withTimeout(client.users.getUser(clerkUserId));
		return toClerkStaffUser(user);
	});

	// 404 は「アカウントがない」という正しい答えなので、失敗ではなく null を返す
	if (result.kind === "FAILED" && result.status === 404) {
		return { kind: "SUCCESS", data: null };
	}
	return result;
}

// email を持つ Clerk ユーザーをすべて探す（全ページ＋完全一致）
export async function findClerkUsersByEmail(
	email: string,
): Promise<ClerkResult<ClerkStaffUser[]>> {
	const target = normalizeEmail(email);

	return callClerk(async () => {
		const client = await clerkClient();
		const found: ClerkStaffUser[] = [];
		let offset = 0;

		for (let page = 0; page < MAX_PAGES; page++) {
			const response = await withTimeout(
				client.users.getUserList({
					emailAddress: [target],
					limit: PAGE_SIZE,
					offset,
				}),
			);

			// Clerk の検索結果を、もう一度自分で完全一致チェックする
			for (const user of response.data) {
				let hasSameEmail = false;
				for (const address of user.emailAddresses) {
					if (normalizeEmail(address.emailAddress) === target) {
						hasSameEmail = true;
					}
				}
				if (hasSameEmail) {
					found.push(toClerkStaffUser(user));
				}
			}

			offset = offset + response.data.length;

			// 最後のページまで読んだら終わり
			if (response.data.length < PAGE_SIZE || offset >= response.totalCount) {
				break;
			}
		}

		return found;
	});
}

// email 宛ての「有効な（pending）」招待をすべて探す（全ページ＋完全一致）
export async function findPendingInvitations(
	email: string,
): Promise<ClerkResult<ClerkStaffInvitation[]>> {
	const target = normalizeEmail(email);

	return callClerk(async () => {
		const client = await clerkClient();
		const found: ClerkStaffInvitation[] = [];
		let offset = 0;

		for (let page = 0; page < MAX_PAGES; page++) {
			const response = await withTimeout(
				client.invitations.getInvitationList({
					status: "pending",
					query: target, // query は部分一致なので、下で完全一致チェックをする
					limit: PAGE_SIZE,
					offset,
				}),
			);

			for (const invitation of response.data) {
				if (normalizeEmail(invitation.emailAddress) === target) {
					found.push(toClerkStaffInvitation(invitation));
				}
			}

			offset = offset + response.data.length;

			if (response.data.length < PAGE_SIZE || offset >= response.totalCount) {
				break;
			}
		}

		return found;
	});
}

// 有効な（pending）招待を、email に関係なくすべて取得する（全ページ）
// 定期処理（T10）で、取消済みスタッフの招待が残っていないか探すのに使う
export async function listAllPendingInvitations(): Promise<
	ClerkResult<ClerkStaffInvitation[]>
> {
	return callClerk(async () => {
		const client = await clerkClient();
		const found: ClerkStaffInvitation[] = [];
		let offset = 0;

		for (let page = 0; page < MAX_PAGES; page++) {
			const response = await withTimeout(
				client.invitations.getInvitationList({
					status: "pending",
					limit: PAGE_SIZE,
					offset,
				}),
			);

			for (const invitation of response.data) {
				found.push(toClerkStaffInvitation(invitation));
			}

			offset = offset + response.data.length;

			if (response.data.length < PAGE_SIZE || offset >= response.totalCount) {
				break;
			}
		}

		return found;
	});
}

// パスワード付きで Clerk ユーザーを作る（開発用の初期 NURSE 作成 T11 だけで使う）
// サーバーから作ったメールアドレスは、Clerk では確認済みとして扱われる
export async function createClerkUserWithPassword(input: {
	email: string;
	password: string;
	lastName: string;
	firstName: string;
}): Promise<ClerkResult<ClerkStaffUser>> {
	return callClerk(async () => {
		const client = await clerkClient();
		const user = await withTimeout(
			client.users.createUser({
				emailAddress: [normalizeEmail(input.email)],
				password: input.password,
				lastName: input.lastName,
				firstName: input.firstName,
			}),
		);
		return toClerkStaffUser(user);
	});
}

// 招待メールのリンクを押したときに開く、本システムのパスワード設定ページの URL
// APP_URL が未設定なら undefined（その場合は Clerk の画面が開く）
export function getSignUpUrl(): string | undefined {
	const appUrl = process.env.APP_URL;
	if (!appUrl) {
		return undefined;
	}
	// 最後の "/" を取ってから "/sign-up" を付ける
	return `${appUrl.replace(/\/+$/, "")}/sign-up`;
}

// 招待を作成する（招待メールが送られる）
// ignoreExisting は使わない（重複していたら FAILED になり、呼び出し側で Clerk を照合し直す）
export async function createStaffInvitation(
	email: string,
	staffUserId: string,
): Promise<ClerkResult<ClerkStaffInvitation>> {
	return callClerk(async () => {
		const client = await clerkClient();
		const invitation = await withTimeout(
			client.invitations.createInvitation({
				emailAddress: normalizeEmail(email),
				publicMetadata: { staffUserId },
				notify: true,
				// メールのリンクから、本システムのパスワード設定ページ（/sign-up）を開く
				redirectUrl: getSignUpUrl(),
			}),
		);
		return toClerkStaffInvitation(invitation);
	});
}

// 招待を失効させる
// 既に受理・失効済みの場合は FAILED になる。成功扱いにするかは呼び出し側（T7）で判断する
export async function revokeInvitation(
	invitationId: string,
): Promise<ClerkResult<null>> {
	return callClerk(async () => {
		const client = await clerkClient();
		await withTimeout(client.invitations.revokeInvitation(invitationId));
		return null;
	});
}
