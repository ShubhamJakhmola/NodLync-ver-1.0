import { useState } from "react";
import ModuleHeader from "../components/ModuleHeader";

const DocumentationPage = () => {
  const [activeSection, setActiveSection] = useState("intro");

  const navItems = [
    { id: "intro", label: "Introduction" },
    { id: "getting-started", label: "Getting Started" },
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "Projects & Tasks" },
    { id: "api-vault", label: "API Vault" },
    { id: "api-tester", label: "API Tester" },
    { id: "workflows", label: "Visual Workflows" },
    { id: "extension", label: "Chrome Extension" },
  ];

  const sections = {
    intro: (
      <div className="space-y-6">
        <h2 className="text-3xl font-black text-fg mb-4">Welcome to NodLync Documentation</h2>
        <p className="text-fg-secondary leading-relaxed">
          NodLync is your all-in-one AI Ops Workspace, designed to streamline your API testing, workflow automation, and project management. This documentation will guide you through all the modules and features available in the platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <div className="p-6 bg-surface border border-stroke rounded-xl">
            <h3 className="text-lg font-bold text-primary mb-2">Centralized Management</h3>
            <p className="text-sm text-fg-muted">Keep all your APIs, secrets, and test histories securely in one place.</p>
          </div>
          <div className="p-6 bg-surface border border-stroke rounded-xl">
            <h3 className="text-lg font-bold text-primary mb-2">Visual Automation</h3>
            <p className="text-sm text-fg-muted">Build complex logic and AI pipelines with an intuitive drag-and-drop workflow editor.</p>
          </div>
        </div>
      </div>
    ),
    "getting-started": (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">Getting Started Guide</h2>
        <p className="text-fg-secondary">Follow these steps to set up your workspace efficiently:</p>
        <ol className="list-decimal list-inside space-y-4 text-fg-secondary ml-4">
          <li className="pl-2">
            <strong className="text-fg">Set up your Profile:</strong> Go to the Settings page and update your display name and avatar. This identity spans across all shared workspaces.
          </li>
          <li className="pl-2">
            <strong className="text-fg">Add API Keys:</strong> Navigate to the <span className="text-primary">API Vault</span> and securely store your provider keys (OpenAI, Anthropic, etc.). Once added, these can be used across the AI Tester and Visual Workflows without typing them again.
          </li>
          <li className="pl-2">
            <strong className="text-fg">Create a Project:</strong> Use the Projects tab to create your first workspace. Inside, you can manage daily logs, track milestones, and assign tasks to teammates.
          </li>
          <li className="pl-2">
            <strong className="text-fg">Install the Extension:</strong> Download the Chrome Extension from Settings to capture live API traffic from any tab and inject it directly into the NodLync tester.
          </li>
        </ol>
      </div>
    ),
    dashboard: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">Dashboard Module</h2>
        <p className="text-fg-secondary">
          The Dashboard is your command center. It provides an at-a-glance overview of your recent activities, active workflows, and system metrics.
        </p>
        <h3 className="text-lg font-bold mt-4">Deep Dive & Navigation:</h3>
        <ul className="list-disc list-inside space-y-4 text-fg-secondary ml-4">
          <li>
            <strong>Quick Actions:</strong> The top bar offers instantaneous jumping points. Click "Test New API" to launch an empty API Tester session, or "Create Workflow" to open a blank canvas.
          </li>
          <li>
            <strong>Recent Activity Feed:</strong> This chronologically displays your latest created tasks, completed API tests, and workflow runs. Clicking any activity will route you directly to that specific asset.
          </li>
          <li>
            <strong>System Status:</strong> At the bottom, you'll see real-time pings reflecting your database connection health and overall API success rate for the current session.
          </li>
        </ul>
      </div>
    ),
    projects: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">Projects & Project Manager</h2>
        <p className="text-fg-secondary">
          Organize your software lifecycles with comprehensive project management tools tailored for developer workflows.
        </p>
        
        <div className="bg-surface border border-stroke p-5 rounded-lg mt-4 space-y-4">
          <h4 className="font-bold text-primary text-lg border-b border-stroke/50 pb-2">Step-by-Step Guide: Working inside a Project</h4>
          
          <div>
            <h5 className="font-bold text-fg mb-1">1. Creating & Opening a Project</h5>
            <p className="text-sm text-fg-muted mb-2">Navigate to <span className="text-primary font-medium">Projects</span>. Click "New Project", give it a name and description, and save. Click the project card to enter the <strong className="text-fg">Project Manager</strong>.</p>
          </div>
          
          <div>
            <h5 className="font-bold text-fg mb-1">2. What else can you do inside an open Project?</h5>
            <ul className="list-disc list-inside space-y-2 text-sm text-fg-muted ml-2">
              <li><strong className="text-fg">Overview Tab:</strong> View global progress, active task breakdown, and recent project updates.</li>
              <li><strong className="text-fg">Milestones:</strong> Create major release checkpoints. Track how many tasks are tied to a milestone and monitor its completion percentage.</li>
              <li><strong className="text-fg">Tasks:</strong> Click "New Task". Assign a title, priority (Low/Medium/High/Critical), status, and due date. You can drag and drop tasks between columns (To Do, In Progress, Review, Done).</li>
              <li><strong className="text-fg">Daily Work Log (Reports):</strong> In the Reports tab, developers can submit a daily log detailing what they worked on. This is compiled into a readable daily summary for team managers.</li>
              <li><strong className="text-fg">Team:</strong> Invite other users to the workspace by their registered email. They will automatically see the project on their dashboard.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    "api-vault": (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">API Vault (Secrets Manager)</h2>
        <p className="text-fg-secondary">
          The API Vault is a highly secure storage module for all your sensitive credentials and provider keys.
        </p>
        
        <div className="bg-surface border border-stroke p-5 rounded-lg mt-4 space-y-4">
          <h4 className="font-bold text-primary text-lg border-b border-stroke/50 pb-2">Step-by-Step Guide: Managing Secrets</h4>
          
          <div>
            <h5 className="font-bold text-fg mb-1">1. Adding a New Key</h5>
            <p className="text-sm text-fg-muted">Navigate to <span className="text-primary font-medium">API Vault</span>. Click "Add Key". Select the Provider (e.g., OpenAI, Custom Proxy), give it a recognizable alias, and paste your key. It is immediately encrypted via the master salt.</p>
          </div>
          
          <div>
            <h5 className="font-bold text-fg mb-1">2. Where are these keys used?</h5>
            <ul className="list-disc list-inside space-y-2 text-sm text-fg-muted ml-2">
              <li><strong className="text-fg">AI Playground:</strong> When chatting with an AI model, the playground will automatically pull your default provider key from the Vault. You never have to paste it into the UI.</li>
              <li><strong className="text-fg">Visual Workflows:</strong> "AI Model" nodes in your workflows will request a Vault credential ID to authenticate outbound requests securely on the server-side.</li>
              <li><strong className="text-fg">Global Settings:</strong> In the Settings &gt; General tab, you can set which Vault key is treated as the Global Default for quick actions.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    "api-tester": (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">API Tester</h2>
        <p className="text-fg-secondary">
          A powerful Postman-like interface for making HTTP requests, debugging responses, and managing headers.
        </p>
        
        <div className="bg-surface border border-stroke p-5 rounded-lg mt-4 space-y-4">
          <h4 className="font-bold text-primary text-lg border-b border-stroke/50 pb-2">Step-by-Step Guide: Executing & Debugging</h4>
          
          <div>
            <h5 className="font-bold text-fg mb-1">1. Constructing a Request</h5>
            <p className="text-sm text-fg-muted">Select an HTTP Method (GET, POST, PUT, DELETE) and enter the URL. Under the "Headers" tab, you can manually input Key-Value pairs (e.g., <code className="text-xs bg-black/20 px-1">Authorization: Bearer Token</code>). Under the "Body" tab, switch to "Raw" and write your JSON payload.</p>
          </div>
          
          <div>
            <h5 className="font-bold text-fg mb-1">2. Importing existing configurations</h5>
            <p className="text-sm text-fg-muted">If you have a cURL string from browser DevTools or documentation, simply click <strong>"Import cURL"</strong>, paste it, and NodLync will automatically parse the headers, URL, method, and body into the UI fields.</p>
          </div>

          <div>
            <h5 className="font-bold text-fg mb-1">3. Analyzing the Response</h5>
            <ul className="list-disc list-inside space-y-2 text-sm text-fg-muted ml-2">
              <li><strong className="text-fg">Status & Latency:</strong> Appears in the top right of the response pane, color-coded by success/failure.</li>
              <li><strong className="text-fg">Payload Review:</strong> The response body supports syntax highlighting and JSON folding.</li>
              <li><strong className="text-fg">Save to Collection:</strong> If this is a frequently used endpoint, click "Save Request" to store it in "My Stuff" for later 1-click execution.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    workflows: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">Visual Workflows</h2>
        <p className="text-fg-secondary">
          Build automated sequences by connecting nodes on an interactive React Flow canvas.
        </p>
        
        <div className="bg-surface border border-stroke p-5 rounded-lg mt-4 space-y-4">
          <h4 className="font-bold text-primary text-lg border-b border-stroke/50 pb-2">Step-by-Step Guide: Building a Pipeline</h4>
          
          <div>
            <h5 className="font-bold text-fg mb-1">1. Initializing the Canvas</h5>
            <p className="text-sm text-fg-muted">Navigate to <span className="text-primary font-medium">Workflows</span>. Create a new Workflow and click "Open Canvas". The grid is infinite. You can Pan (Click & Drag) and Zoom (Scroll).</p>
          </div>

          <div>
            <h5 className="font-bold text-fg mb-1">2. Adding and Connecting Nodes</h5>
            <ul className="list-disc list-inside space-y-2 text-sm text-fg-muted ml-2">
              <li><strong className="text-fg">Add a Node:</strong> Drag a node from the left sidebar onto the canvas (e.g., API Call, AI Model, Condition, Delay).</li>
              <li><strong className="text-fg">Connect:</strong> Click the output dot on the right side of one node, and drag the line to the input dot on the left side of another node to establish the execution order.</li>
              <li><strong className="text-fg">Configure:</strong> Double-click any node to open its configuration panel on the right. Here you define the JSON settings, API endpoint URLs, or the specific AI Prompt to execute.</li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-bold text-fg mb-1">3. Saving & Execution</h5>
            <p className="text-sm text-fg-muted">Click "Save Workflow" in the top right. This serializes your exact node positions, edge connections, and configurations directly into Supabase. Eventually, this graph will be fed into a backend execution engine to run the nodes sequentially.</p>
          </div>
        </div>
      </div>
    ),
    extension: (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-fg border-b border-stroke pb-2">NodLync Chrome Extension</h2>
        <p className="text-fg-secondary">
          A companion browser extension that allows you to capture network traffic seamlessly, analyze web performance, and bring endpoints directly into your workspace.
        </p>

        <div className="bg-surface border border-stroke p-5 rounded-lg mt-4 space-y-4">
          <h4 className="font-bold text-primary text-lg border-b border-stroke/50 pb-2">Step-by-Step Guide: Capturing & Analyzing</h4>
          
          <div>
            <h5 className="font-bold text-fg mb-1">1. Live Traffic Capture</h5>
            <p className="text-sm text-fg-muted">After installing via Developer Mode, open the extension popup. Turn the <strong>Capture Toggle</strong> to ON. As you browse websites, background API requests (XHR/Fetch) are recorded.</p>
          </div>

          <div>
            <h5 className="font-bold text-fg mb-1">2. Reviewing Web Performance</h5>
            <p className="text-sm text-fg-muted">Click the <strong>Insights</strong> tab inside the extension dashboard. Here you will see your Web Performance Metrics (TTFB, DCL, Load Event, TBT) calculated in real-time, helping you diagnose slow pages.</p>
          </div>

          <div>
            <h5 className="font-bold text-fg mb-1">3. Sending to Web Workspace</h5>
            <p className="text-sm text-fg-muted">Select any intercepted network request from the list. Click the <strong className="text-fg border border-stroke px-1 rounded">Send to NodLync</strong> button. If you are logged into the web app in any tab, the extension will securely extract your session and push the captured request payload directly into the cloud database—allowing you to open the web app and test that exact API request immediately.</p>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 h-full flex flex-col">
      <ModuleHeader title="Documentation" description="COMPREHENSIVE GUIDE AND MODULE REFERENCES" icon="📚" />

      <div className="flex flex-col md:flex-row gap-8 mt-6 flex-1 min-h-0">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1 overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg-muted mb-3 pl-3">Table of Contents</h3>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-fg-secondary hover:bg-surface/50 hover:text-fg"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel p-8 md:p-10 overflow-y-auto custom-scrollbar shadow-xl border border-stroke rounded-2xl relative">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {sections[activeSection as keyof typeof sections]}
          </div>
          
          {/* Helpful bottom footer inside content area */}
          <div className="mt-16 pt-8 border-t border-stroke/50 text-center">
             <p className="text-sm text-fg-muted">Need more help? Check out the <span className="text-primary font-semibold cursor-pointer">Support Logs</span> or contact the admin team.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPage;
