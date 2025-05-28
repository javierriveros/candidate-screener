import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gray-50 py-8 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto space-y-8">{children}</div>
    </div>
  );
}
