import type { ReactNode } from 'react';

interface ApplyPageShellProps {
  children: ReactNode;
  className?: string;
}

export function ApplyPageShell({ children, className = '' }: ApplyPageShellProps) {
  return (
    <div className={`mx-auto w-full max-w-5xl space-y-6 ${className}`.trim()}>
      {children}
    </div>
  );
}
