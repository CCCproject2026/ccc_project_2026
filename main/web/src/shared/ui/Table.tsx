// Placeholder Table component.
// uses shared/tokens/colors, shared/tokens/spacing, shared/tokens/typography
export interface TableProps {
  headers?: string[]
}

export function Table({ headers = [] }: TableProps) {
  return (
    <table>
      <thead>
        <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
      </thead>
      <tbody />
    </table>
  )
}
