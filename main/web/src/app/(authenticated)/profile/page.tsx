import { ProfilePage } from "@/features/profile/pages/ProfilePage";
import { requireStaffPage } from "@/shared/lib/auth";
import { formatJapaneseDate } from "@/shared/lib/date";

// マイページ（ACTIVE なスタッフなら誰でも、自分の情報だけを見られる）
export default async function ProfileRoute() {
	const loginUser = await requireStaffPage();

	// 画面に渡すのは表示する項目だけ（clerkUserId などは渡さない）
	let endDate: string | null = null;
	if (loginUser.endDate !== null) {
		endDate = formatJapaneseDate(loginUser.endDate);
	}

	return (
		<ProfilePage
			profile={{
				lastName: loginUser.lastName,
				firstName: loginUser.firstName,
				email: loginUser.email,
				role: loginUser.role,
				status: loginUser.status,
				startDate: formatJapaneseDate(loginUser.startDate),
				endDate,
				dateOfBirth: formatJapaneseDate(loginUser.dateOfBirth),
				nationality: loginUser.nationality,
				gender: loginUser.gender,
			}}
		/>
	);
}
