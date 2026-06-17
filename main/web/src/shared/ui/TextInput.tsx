// Placeholder TextInput component.
// uses shared/tokens/colors, shared/tokens/spacing, shared/tokens/typography
export interface TextInputProps {
	label?: string;
	value?: string;
}

export function TextInput({ label, value }: TextInputProps) {
	return (
		<label>
			{label}
			<input value={value} readOnly />
		</label>
	);
}
