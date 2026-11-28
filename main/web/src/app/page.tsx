// src/app/page.tsx

// app/page.tsx
import { redirect } from "next/navigation";

export default function HomePage() {
	// This instantly pushes the user to /dashboard automatically
	redirect("/dashboard");
}
