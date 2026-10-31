import type { ReactNode } from "react";
import { TopNavBar } from "./TopNavBar";

export interface AppShellProps {
  sidebar: ReactNode;
  topNav?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  overlays?: ReactNode;
  className?: string;
}

/**
 * Modular desktop application shell decoupling sidebar navigation,
 * top navigation bar, main view container, player footer deck, and overlay portals.
 */
export function AppShell({
  sidebar,
  topNav,
  children,
  footer,
  overlays,
  className = "",
}: AppShellProps) {
  return (
    <div
      className={`relative w-screen h-screen overflow-hidden grid grid-rows-[1fr_96px] max-md:grid-rows-[1fr_84px] grid-cols-[232px_1fr] max-lg:grid-cols-[68px_1fr] bg-midnight-bg text-midnight-text font-sans text-sm ${className}`}
    >
      {/* Navigation sidebar slot */}
      {sidebar}

      {/* Main viewport column with fixed top navigation bar and scroll contained view */}
      <div className="col-start-2 row-start-1 flex flex-col h-full overflow-hidden min-w-0">
        {topNav !== undefined ? topNav : <TopNavBar />}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
          {children}
        </div>
      </div>

      {/* Persistent player footer deck */}
      {footer}

      {/* Modal and overlay portals */}
      {overlays}
    </div>
  );
}

