import type { ReactNode } from "react";

// Placeholder Button component.
// uses shared/tokens/colors, shared/tokens/spacing, shared/tokens/radius, shared/tokens/typography
export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";

export interface ButtonProps {
	variant?: ButtonVariant;
	children?: ReactNode;
}

export function Button({ variant = "primary", children }: ButtonProps) {
	return <button type="button">{children || variant}</button>;
}
