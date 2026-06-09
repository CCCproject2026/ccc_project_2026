import type { ReactNode } from 'react';

interface FeatureLayoutProps {
  title: string;
  children: ReactNode;
}

export function FeatureLayout({ title, children }: FeatureLayoutProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-semibold">{title}</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
