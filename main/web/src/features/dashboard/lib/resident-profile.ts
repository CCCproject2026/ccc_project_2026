import { fromDbDate, todayInJapan } from "@/shared/lib/date";

export function residentAge(dateOfBirth: Date, now = new Date()): number {
	const birthday = fromDbDate(dateOfBirth);
	const today = todayInJapan(now);
	const years = Number(today.slice(0, 4)) - Number(birthday.slice(0, 4));
	return years - (today.slice(5) < birthday.slice(5) ? 1 : 0);
}

export function dashboardPageNumber(value: string | string[] | undefined): number {
	if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return 1;
	const page = Number(value);
	return Number.isSafeInteger(page) ? page : 1;
}
