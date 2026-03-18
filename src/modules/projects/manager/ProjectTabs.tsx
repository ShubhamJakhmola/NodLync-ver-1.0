export type TabId =
  | "overview"
  | "milestones"
  | "tasks"
  | "activity"
  | "reports"
  | "team";

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "milestones", label: "Milestones", icon: "🏁" },
  { id: "tasks", label: "Tasks", icon: "✅" },
  { id: "activity", label: "Activity", icon: "⚡" },
  { id: "reports", label: "Reports", icon: "📄" },
  { id: "team", label: "Team", icon: "👥" },
];

interface Props {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
  taskCount?: number;
}

const ProjectTabs = ({ activeTab, onChange, taskCount }: Props) => {
  return (
    <div className="flex items-center gap-1 border-b border-slate-800 px-1">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors
              ${isActive
                ? "text-primary"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            {tab.label}
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
