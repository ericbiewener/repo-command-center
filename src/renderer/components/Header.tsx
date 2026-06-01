import { Command, Radio } from "lucide-react";
import type { AppInfo } from "../../shared/types";

type HeaderProps = {
  activeCount: number;
  appInfo: AppInfo | null;
};

const Header = ({ activeCount, appInfo }: HeaderProps) => (
  <header className="app-header">
    <div>
      <h1>AI Workstreams</h1>
      <p>{activeCount} active</p>
    </div>
    <div className="header-status">
      <span className={appInfo?.localApi.running ? "pill pill-ok" : "pill pill-muted"}>
        <Radio size={14} />
        {appInfo?.localApi.running ? `API ${appInfo.localApi.port}` : "API off"}
      </span>
      <span className={appInfo?.shortcutRegistered ? "pill pill-ok" : "pill pill-warn"}>
        <Command size={14} />
        {appInfo?.shortcutRegistered ? "Shortcut" : "No shortcut"}
      </span>
    </div>
  </header>
);

export default Header;
