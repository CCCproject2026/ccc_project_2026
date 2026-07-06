import { SignIn } from "@clerk/nextjs";

export function ClerkSignInCard() {
	return (
		<div className="flex justify-center">
			<SignIn routing="path" path="/login" />
		</div>
	);
}
