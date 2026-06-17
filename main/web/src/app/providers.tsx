import type { ReactNode } from 'react'

// App-level providers placeholder.
// This file is intended for shared context providers and global composition.
// uses shared/tokens/colors, shared/tokens/typography
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}
