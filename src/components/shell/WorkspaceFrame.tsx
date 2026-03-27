import type { ReactNode } from "react";

type WorkspaceTone = "personal" | "business";

type WorkspaceFrameProps = {
  tone: WorkspaceTone;
  label: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function WorkspaceFrame({
  tone,
  label,
  title,
  description,
  children,
}: WorkspaceFrameProps) {
  const toneClass =
    tone === "business" ? "workspace-frame--business" : "workspace-frame--personal";

  return (
    <div className={`workspace-frame ${toneClass}`}>
      <header className="workspace-frame__header">
        <p className="workspace-frame__label">{label}</p>
        <h1 className="workspace-frame__title">{title}</h1>
        <p className="workspace-frame__description">{description}</p>
      </header>
      <div className="workspace-frame__content">{children}</div>
    </div>
  );
}
