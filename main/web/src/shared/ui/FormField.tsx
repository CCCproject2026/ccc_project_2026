import type { ReactNode } from "react";

interface FormFieldProps {
	label: string;
	htmlFor: string;
	children: ReactNode;
	error?: string;
	required?: boolean;
}

export function FormField({
	label,
	htmlFor,
	children,
	error,
	required,
}: FormFieldProps) {
	return (
		<div>
			<label
				htmlFor={htmlFor}
				className="block text-sm font-medium text-gray-700 mb-1"
			>
				{label}
				{required && <span className="text-red-500"> *</span>}
			</label>
			{children}
			{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
		</div>
	);
}
