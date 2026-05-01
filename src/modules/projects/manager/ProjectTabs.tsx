export type TabId =
  | "overview"
  | "milestones"
  | "tasks"
  | "reports"
  | "team"
  | "history";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "milestones", label: "Milestones", icon: "🏁" },
  { id: "tasks", label: "Tasks", icon: "✅" },
  { id: "reports", label: "Reports", icon: "📄" },
  { id: "team", label: "Team", icon: "👥" },
  { id: "history", label: "History", icon: "🕘" },
];

interface Props {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  taskCount?: number;
}

const ProjectTabs = ({ activeTab, onChange, taskCount }: Props) => {
  return (
    <div className="flex items-center gap-1 border-b border-stroke px-1 overflow-x-auto no-scrollbar">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap [overflow-wrap:normal] [word-break:normal]
              ${isActive
                ? "text-primary"
                : "text-fg-muted hover:text-fg-secondary"
              }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="leading-none">{tab.label}</span>
            {tab.id === "tasks" && taskCount !== undefined && taskCount > 0 && (
              <span className="ml-1 text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-1.5 py-0.5 font-mono">
                {taskCount}
              </span>
            )}
            {/* Active underline */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProjectTabs;
