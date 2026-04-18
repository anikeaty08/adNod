import type { ReactNode } from "react";

export default function StudioPublisherLayout({ children }: { children: ReactNode }) {
  return <div className="container pt-4">{children}</div>;
}

