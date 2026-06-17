// Placeholder Modal component.
// uses shared/tokens/colors, shared/tokens/spacing, shared/tokens/radius, shared/tokens/typography
export interface ModalProps {
	title?: string;
	open?: boolean;
}

export function Modal({ title, open = false }: ModalProps) {
	return open ? (
		<section aria-modal="true">
			<header>{title}</header>
		</section>
	) : null;
}
