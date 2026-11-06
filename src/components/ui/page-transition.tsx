import { ViewTransition } from "react";

// Fondu et léger glissement du contenu à chaque changement de page.
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <div className={className}>{children}</div>
    </ViewTransition>
  );
}
