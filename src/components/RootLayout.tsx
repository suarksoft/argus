// Compatibility wrapper - no longer needed
// All pages now use the main Layout from app/layout.tsx
export function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

