// Onboarding section shell. The bottom nav is hidden by BottomNav.tsx's
// `useSelectedLayoutSegment()` guard (01-02) — this layout just provides
// breathing room for the welcome / create / join / share-code surfaces.
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-background">
      {children}
    </div>
  );
}
