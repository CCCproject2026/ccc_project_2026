import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { toProfileInfo } from "@/features/profile/server/profile-service";
import { requireStaffPage } from "@/shared/lib/auth";

// マイページ（ACTIVE なスタッフなら誰でも、自分の情報だけを見られる）
export default async function ProfileRoute() {
	const loginUser = await requireStaffPage();

	// 画面に渡すのは表示する項目だけ（clerkUserId などは toProfileInfo で外す）
	return <ProfilePage profile={toProfileInfo(loginUser)} />;
}
