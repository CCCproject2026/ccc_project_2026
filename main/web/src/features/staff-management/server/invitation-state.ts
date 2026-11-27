// 招待の状態の判定（純粋な関数。DB も Clerk も呼ばない）
//
// Clerk は、同じメールアドレスの招待が残っていると新しい招待を作れない
// （duplicate_record というエラーになる）。
// アカウントを削除したあとに招待だけが残ると、受け入れ済みの招待は
// 「取り消す（revoke）」もできないので、放置すると再招待ができなくなる。
//
// このモジュールは server-only にしない（テストから直接読み込むため）

// 放置すると害になる招待かどうか
// ・pending（取り消すだけ）→ 既存の処理（ALREADY_INVITED）で扱えるので、害はない
// ・accepted（受け入れ済みで、アカウントは削除された）→ 害がある
export function isOrphanedInvitation(invitation: { status: string }): boolean {
	return invitation.status !== "pending";
}

// この招待を削除してよいか
//
// ・放置すると害になる招待（受け入れ済みなど）である
// ・そのメールアドレスの Clerk アカウントが 1 つも無い
//   （アカウントが残っているときは、受け入れ済みの招待も消さない。
//    消すと、既存アカウントと二重で登録できてしまう）
export function shouldDeleteInvitation(input: {
	invitationStatus: string;
	clerkUserCount: number;
}): boolean {
	return (
		isOrphanedInvitation({ status: input.invitationStatus }) &&
		input.clerkUserCount === 0
	);
}
