export type DocSection = {
  heading: string;
  body: string[];
  bullets?: string[];
  steps?: string[];
  mistakes?: string[];
  troubleshooting?: string[];
};

export type KnowledgeDoc = {
  slug: string;
  title: string;
  description: string;
  category: string;
  audience: string;
  time: string;
  learn: string[];
  sections: DocSection[];
  related: string[];
};

const platformSections: DocSection[] = [
  {
    heading: "The simple version",
    body: [
      "NodLync is a workspace for teams that use AI, APIs, projects, and automation in the same day. Instead of keeping prompts in one place, API keys in another, tasks in a project board, and debugging notes in chat messages, NodLync brings those pieces into one working surface.",
      "A workspace is the shared home for your team. A project is one area of work inside that home. A workflow is a repeatable process, such as research a feature, summarize meeting notes, test an API, or generate an image brief.",
    ],
    bullets: [
      "Use projects to organize goals, milestones, tasks, files, notes, and team activity.",
      "Use the AI Playground to talk to models, compare providers, and test prompts.",
      "Use workflows when a process needs repeatable steps instead of one-off chat.",
      "Use the extension and debugging tools when you need to understand what happened inside a real browser or AI request.",
    ],
  },
  {
    heading: "The main ideas",
    body: [
      "A provider is the company or service that runs an AI model. OpenAI, Anthropic, Gemini, Groq, Ollama, TogetherAI, Replicate, and Stability are examples. A model is the specific AI engine you choose from a provider.",
      "An API key is like a password for an app-to-service connection. NodLync stores keys in the API Vault so you can use providers without pasting secrets into every screen.",
    ],
    bullets: [
      "Provider: the AI service you connect to.",
      "Model: the AI brain or media engine used for the request.",
      "Prompt: the instructions and context you give the model.",
      "Inference: the provider running the model and returning an answer.",
      "Streaming: the answer arriving piece by piece instead of all at once.",
      "Trace: a timeline that helps you inspect what was sent, what came back, and where a problem happened.",
    ],
  },
  {
    heading: "How the pieces connect",
    body: [
      "Think of NodLync as a loop: plan work, use AI to move the work forward, capture what happened, and turn the result back into project progress.",
    ],
    steps: [
      "Create a project for the goal your team cares about.",
      "Break the goal into milestones and tasks so the work is visible.",
      "Use the AI Playground, research mode, chat workflows, or media tools to produce useful output.",
      "Save successful prompts, requests, and workflows so they can be repeated.",
      "Use traces, traffic capture, and logs to understand failures or slow responses.",
      "Share findings in meetings, reports, or project updates.",
    ],
  },
];

const providerDocs = [
  {
    slug: "provider-openai",
    title: "OpenAI Provider",
    description: "Set up OpenAI for chat, reasoning, vision, audio, and image workflows.",
    strengths: ["Strong general-purpose chat and reasoning", "Good multimodal support", "Large ecosystem and documentation"],
    limits: ["Premium models can cost more", "Some capabilities vary by model", "Usage limits depend on your account"],
    pricing: "Usually pay-as-you-go based on model, input size, output size, and media generation.",
    useCases: ["Product assistants", "coding help", "research summaries", "image generation", "multimodal analysis"],
  },
  {
    slug: "provider-openrouter",
    title: "OpenRouter Provider",
    description: "Use OpenRouter to access many model families through one compatible provider connection.",
    strengths: ["Many models behind one API shape", "Easy model comparison", "Useful fallback provider for experiments"],
    limits: ["Capabilities depend on the selected downstream model", "Pricing and availability can vary per model", "Some provider-specific features may not map perfectly"],
    pricing: "Usually usage-based with prices shown per model.",
    useCases: ["model comparison", "fallback routing", "team experimentation", "lower-friction provider testing"],
  },
  {
    slug: "provider-anthropic",
    title: "Anthropic Provider",
    description: "Connect Anthropic Claude models for careful writing, analysis, and long-context work.",
    strengths: ["Strong long-document analysis", "Clear writing style", "Good for careful instruction following"],
    limits: ["Media generation is not the core strength", "Some advanced features require specific models", "Rate limits depend on your plan"],
    pricing: "Usually pay-as-you-go by model, input tokens, output tokens, and context size.",
    useCases: ["policy review", "long docs", "meeting synthesis", "research analysis", "support drafting"],
  },
  {
    slug: "provider-gemini",
    title: "Gemini Provider",
    description: "Use Google Gemini for multimodal reasoning and Google ecosystem AI workflows.",
    strengths: ["Good multimodal understanding", "Useful long-context options", "Strong fit for Google-oriented teams"],
    limits: ["Model names and capabilities change often", "Some features require Google Cloud setup", "Regional access can vary"],
    pricing: "Usually based on selected model, context size, and usage volume.",
    useCases: ["image understanding", "document analysis", "large context review", "Google-connected AI workflows"],
  },
  {
    slug: "provider-groq",
    title: "Groq Provider",
    description: "Use Groq when fast text responses matter more than broad media capabilities.",
    strengths: ["Very fast text generation", "Great for responsive chat", "Useful for prototypes and internal tools"],
    limits: ["Model selection is smaller than aggregator platforms", "Not focused on image or video generation", "Rate limits may affect bursts"],
    pricing: "Usually usage-based with emphasis on high-speed inference.",
    useCases: ["fast chat", "summaries", "routing assistants", "low-latency prototypes"],
  },
  {
    slug: "provider-ollama",
    title: "Ollama Provider",
    description: "Run local models through Ollama for private experiments and offline-friendly workflows.",
    strengths: ["Runs on your machine or server", "Good for privacy-sensitive prototypes", "No external API key for local use"],
    limits: ["Quality depends on the local model", "Requires enough CPU/GPU/RAM", "Team access needs local network planning"],
    pricing: "The software is local; cost comes from your hardware and operations.",
    useCases: ["private testing", "offline demos", "local development", "custom model experiments"],
  },
  {
    slug: "provider-togetherai",
    title: "TogetherAI Provider",
    description: "Use TogetherAI for hosted open-weight models and scalable inference experiments.",
    strengths: ["Broad open-model catalog", "Good for experimentation", "Useful when you want more control over model choice"],
    limits: ["Quality varies by model", "Some models need prompt tuning", "Availability can depend on capacity"],
    pricing: "Usually usage-based by model and token volume.",
    useCases: ["open-model testing", "research workflows", "custom assistants", "cost/performance comparisons"],
  },
  {
    slug: "provider-replicate",
    title: "Replicate Provider",
    description: "Use Replicate for image, video, audio, and specialist open-source model workflows.",
    strengths: ["Large catalog of creative and specialist models", "Good for media workflows", "Easy to test new model types"],
    limits: ["Each model can have different inputs", "Cold starts can happen", "Output quality and speed vary widely"],
    pricing: "Usually based on compute time, model runtime, or prediction usage.",
    useCases: ["image tools", "video experiments", "audio transforms", "specialist model prototypes"],
  },
  {
    slug: "provider-stability",
    title: "Stability Provider",
    description: "Connect Stability for image generation, editing, and creative visual workflows.",
    strengths: ["Image generation and editing focus", "Useful style control", "Strong fit for creative asset workflows"],
    limits: ["Mostly visual rather than general chat", "Prompt wording strongly affects output", "Video/audio support depends on available endpoints"],
    pricing: "Usually credit-based or generation-based depending on model and output settings.",
    useCases: ["marketing images", "concept art", "style variations", "visual ideation"],
  },
  {
    slug: "provider-custom",
    title: "Custom Providers",
    description: "Connect your own OpenAI-compatible endpoint, proxy, gateway, or internal AI service.",
    strengths: ["Works with internal services", "Supports private gateways", "Lets teams standardize routing behind one endpoint"],
    limits: ["You must know the endpoint shape", "Streaming and tool support may need testing", "Errors depend on your service implementation"],
    pricing: "Depends on your own infrastructure, gateway, or upstream provider.",
    useCases: ["internal AI gateway", "private model service", "enterprise proxy", "experimental provider integration"],
  },
];

function providerPage(provider: (typeof providerDocs)[number]): KnowledgeDoc {
  return {
    slug: provider.slug,
    title: provider.title,
    description: provider.description,
    category: "AI Providers",
    audience: "Teams setting up model access",
    time: "8 min",
    learn: ["What this provider is", "Where it fits best", "How setup works", "Common setup mistakes"],
    related: ["ai-providers", "api-keys", "models", "troubleshooting"],
    sections: [
      {
        heading: "What this provider is",
        body: [
          `${provider.title.replace(" Provider", "")} is an AI service you can connect to NodLync. The provider runs the model, charges for usage, and returns the result to your workspace.`,
          "NodLync does not replace the provider. It gives your team one place to store keys, choose models, run prompts, save workflows, and debug failures.",
        ],
      },
      {
        heading: "Strengths and limitations",
        body: ["Choose providers by the work you need to do, not only by brand name. A fast text provider, a careful long-context model, and an image provider solve different problems."],
        bullets: [...provider.strengths, ...provider.limits.map((limit) => `Limitation: ${limit}`)],
      },
      {
        heading: "Pricing style",
        body: [provider.pricing, "Before giving broad team access, set a small test budget, confirm rate limits, and document which models are approved for everyday work."],
      },
      {
        heading: "Recommended use cases",
        body: ["Start with one small workflow, prove the result is useful, then expand access."],
        bullets: provider.useCases,
      },
      {
        heading: "Setup process",
        body: ["The exact provider dashboard may look different, but the setup pattern is usually the same."],
        steps: [
          "Create or open your account with the provider.",
          "Find the API keys or developer keys section.",
          "Create a new key with a clear name such as NodLync Production or NodLync Testing.",
          "Copy the key once, then store it in NodLync API Vault.",
          "Choose this provider in the AI Playground or workflow node.",
          "Run a short test prompt and confirm the response arrives.",
        ],
        mistakes: [
          "Using a browser login password instead of an API key.",
          "Choosing a model that the provider account cannot access.",
          "Forgetting to add billing or credits before the first request.",
        ],
        troubleshooting: [
          "Invalid key: create a fresh key, paste it again, and check for extra spaces.",
          "Model not found: choose a model listed in your provider account.",
          "Rate limit: wait, reduce parallel tests, or increase provider limits.",
        ],
      },
    ],
  };
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    slug: "setup-guide",
    title: "Setup Guide",
    description: "Set up NodLync with a project, provider key, AI Playground test, and optional browser extension.",
    category: "Start Here",
    audience: "New users and workspace admins",
    time: "9 min",
    learn: ["First workspace setup", "Provider key connection", "Safe first test"],
    related: ["getting-started", "api-keys", "api-vault", "extension-guide"],
    sections: [
      {
        heading: "What setup means in NodLync",
        body: [
          "NodLync setup is not about activating bundled AI infrastructure. It is about preparing your workspace so your team can connect approved providers, organize work, and run AI workflows with clear ownership.",
        ],
      },
      {
        heading: "Recommended first setup",
        body: ["Start with a small path that proves the platform loop."],
        steps: [
          "Create your account and open the workspace.",
          "Create one project with a short human-readable goal.",
          "Add one provider key in API Vault.",
          "Open AI Playground and run a short prompt.",
          "Save the useful result or turn it into a task.",
          "Install the browser extension only if you need traffic capture or request debugging.",
        ],
        troubleshooting: [
          "If the AI test fails, check the provider key, billing, selected model, and provider access.",
          "If the extension cannot capture traffic, confirm browser permissions and refresh the tested tab.",
        ],
      },
    ],
  },
  {
    slug: "api-monitoring",
    title: "API Monitoring",
    description: "Understand captured API requests, latency, errors, and how debugging connects to AI workflows.",
    category: "Extension & Debugging",
    audience: "Developers and technical operators",
    time: "8 min",
    learn: ["API monitoring basics", "Latency and errors", "How capture supports debugging"],
    related: ["traffic-capture", "debugging", "request-replay", "extension-guide"],
    sections: [
      {
        heading: "What API monitoring means here",
        body: [
          "API monitoring helps you understand how software systems talk to each other. In NodLync, it is part of the debugging layer that supports AI workflows, provider calls, browser capture, and replay.",
          "An API request includes details such as method, URL, headers, body, status code, timing, and response. These details help explain why a workflow succeeded, failed, or felt slow.",
        ],
      },
      {
        heading: "What to watch",
        body: ["You do not need to inspect every request. Focus on the ones connected to a user-visible problem or important AI workflow."],
        bullets: [
          "Status code: did the request succeed or fail?",
          "Latency: how long did it take?",
          "Payload size: was the input or output unexpectedly large?",
          "Authentication: did the request include the right key or token?",
          "Provider response: did the AI service explain the failure?",
        ],
      },
    ],
  },
  {
    slug: "performance-metrics",
    title: "Performance Metrics",
    description: "Learn basic timing metrics used when debugging browser and API experiences.",
    category: "Extension & Debugging",
    audience: "Developers and curious beginners",
    time: "7 min",
    learn: ["Timing vocabulary", "What slow can mean", "How metrics guide investigation"],
    related: ["traffic-capture", "api-monitoring", "debugging"],
    sections: [
      {
        heading: "Why metrics matter",
        body: [
          "Performance metrics are timing clues. They do not automatically tell you the fix, but they help you decide where to investigate first.",
          "For AI workflows, timing can include the browser request, provider response time, time to first streamed chunk, and total completion time.",
        ],
      },
      {
        heading: "Useful terms",
        body: ["These terms appear in many browser and API debugging conversations."],
        bullets: [
          "TTFB: time until the first byte of a response arrives.",
          "DCL: when the browser has parsed the initial page structure.",
          "TBT: time the browser main thread was blocked by long tasks.",
          "LCP: when the largest visible content element finishes loading.",
          "Time to first token: how long a streaming AI response takes to begin.",
        ],
      },
    ],
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "A guided first path through NodLync for people who are new to AI workspaces.",
    category: "Start Here",
    audience: "New users",
    time: "10 min",
    learn: ["What NodLync is", "How to set up a workspace", "Where to start safely"],
    related: ["what-is-nodlync", "api-keys", "ai-playground", "projects-milestones"],
    sections: [
      ...platformSections,
      {
        heading: "Your first useful setup",
        body: ["Do not try to configure everything on day one. A good first setup proves the core loop: create a project, add one provider key, run one prompt, and save one reusable result."],
        steps: [
          "Open Settings and confirm your profile name is recognizable to teammates.",
          "Open API Vault and add one provider key, usually OpenAI, Anthropic, Gemini, or a team-approved custom provider.",
          "Open AI Playground and send a simple request such as: summarize this project goal in five bullets.",
          "Create a project, add one milestone, and add two tasks.",
          "Save a useful prompt or workflow so the next person can repeat it.",
        ],
        troubleshooting: [
          "If the AI request fails, check API Vault first. Most first-run problems are missing keys, invalid keys, or providers without billing enabled.",
          "If teammates cannot see work, check project membership and workspace permissions.",
        ],
      },
    ],
  },
  {
    slug: "what-is-nodlync",
    title: "What Is NodLync?",
    description: "A plain-language explanation of the platform, its workspace model, and the problems it solves.",
    category: "Start Here",
    audience: "Everyone",
    time: "7 min",
    learn: ["The NodLync mental model", "How AI and project work connect", "When to use each module"],
    related: ["beginner-guide", "ai-workspace", "projects-milestones"],
    sections: platformSections,
  },
  {
    slug: "beginner-guide",
    title: "Beginner Guide",
    description: "Core AI terms explained without assuming prior knowledge of APIs, models, routing, or inference.",
    category: "Start Here",
    audience: "Non-technical and technical beginners",
    time: "12 min",
    learn: ["AI vocabulary", "How a request works", "What to expect from models"],
    related: ["models", "prompting", "streaming-responses", "troubleshooting"],
    sections: [
      {
        heading: "What happens when you ask AI for help",
        body: [
          "When you type a message in an AI tool, NodLync packages your instruction, sends it to the selected provider, waits for the model to respond, and displays the answer. That whole journey is called a request.",
          "The response may arrive all at once, or it may stream in piece by piece. Streaming feels faster because you can start reading before the whole answer is complete.",
        ],
      },
      {
        heading: "Terms you will see",
        body: ["These terms are useful because they help you choose the right tool and describe problems clearly."],
        bullets: [
          "API: a structured way for software systems to talk to each other.",
          "Provider: the company or service that runs the AI model.",
          "Model: the specific AI system that answers your request.",
          "Prompt: your instructions, examples, files, and context.",
          "Token: a small chunk of text used for pricing and limits.",
          "Context window: how much information a model can consider at once.",
          "Rate limit: a provider safety limit that slows or blocks too many requests.",
        ],
      },
      {
        heading: "A safe beginner workflow",
        body: ["Beginners should make small, visible changes before building complex automation."],
        steps: [
          "Ask the AI one focused question.",
          "Read the answer and check whether it matches the task.",
          "Improve the prompt with missing context or examples.",
          "Save the version that worked.",
          "Turn repeated prompts into a workflow only after the steps are stable.",
        ],
      },
    ],
  },
  {
    slug: "ai-workspace",
    title: "AI Workspace",
    description: "Understand the AI workspace as a shared operating surface for prompts, providers, workflows, traces, and results.",
    category: "Workspace",
    audience: "Workspace owners and daily users",
    time: "9 min",
    learn: ["Workspace structure", "How AI tools connect", "How teams keep work organized"],
    related: ["ai-playground", "api-vault", "ai-workflows", "collaboration"],
    sections: [
      {
        heading: "What the workspace does",
        body: [
          "The AI workspace is where people, projects, AI providers, saved requests, workflows, and debugging data meet. It is designed to make AI work repeatable instead of scattered.",
          "A good workspace answers three questions: what are we trying to accomplish, which AI tools are approved, and what happened when we ran them?",
        ],
      },
      {
        heading: "Recommended layout",
        body: ["Keep the workspace understandable by naming things for humans, not just systems."],
        bullets: [
          "Projects should match real goals, clients, products, or workstreams.",
          "Milestones should represent checkpoints people can recognize.",
          "Tasks should be small enough to assign and finish.",
          "Prompts should include purpose, input expectations, and success criteria.",
          "Provider keys should have names that show environment and owner.",
        ],
      },
      {
        heading: "Expected behavior",
        body: [
          "When a user chooses a provider and model, NodLync sends the request using a stored key or configured endpoint. Successful results can become project notes, task updates, saved prompts, workflow outputs, or debugging traces.",
        ],
      },
    ],
  },
  {
    slug: "projects-milestones",
    title: "Projects & Milestones",
    description: "Plan work in projects, break it into milestones, and connect AI output to real progress.",
    category: "Projects & Productivity",
    audience: "Team leads and contributors",
    time: "8 min",
    learn: ["Project structure", "Milestone planning", "How AI supports delivery"],
    related: ["task-management", "meetings-collaboration", "ai-assisted-productivity"],
    sections: [
      {
        heading: "What a project is",
        body: [
          "A project is a container for one meaningful goal. It can be a product release, client delivery, research effort, internal automation, or debugging initiative.",
          "A milestone is a checkpoint inside the project. It helps the team understand progress without reading every task.",
        ],
      },
      {
        heading: "How AI fits into projects",
        body: ["AI should support project progress, not hide it. Use AI to summarize, draft, analyze, compare, and generate options, then attach the result to the project where people can review it."],
        bullets: [
          "Generate a project brief from messy notes.",
          "Summarize meeting decisions into tasks.",
          "Turn bug reports into reproduction steps.",
          "Compare provider outputs before choosing a model for the project.",
        ],
      },
      {
        heading: "A good project setup",
        body: ["Start with enough structure to guide people, but not so much that maintaining the board becomes the work."],
        steps: [
          "Write a short project description in plain language.",
          "Create three to six milestones.",
          "Add tasks for the next milestone first.",
          "Assign owners and due dates only when they are real.",
          "Use AI summaries during check-ins to keep updates concise.",
        ],
      },
    ],
  },
  {
    slug: "task-management",
    title: "Task Management",
    description: "Create clear tasks, statuses, priorities, and AI-assisted updates that teams can trust.",
    category: "Projects & Productivity",
    audience: "Daily users",
    time: "7 min",
    learn: ["Task anatomy", "Status meaning", "Common task mistakes"],
    related: ["projects-milestones", "ai-assisted-productivity", "meetings-collaboration"],
    sections: [
      {
        heading: "What makes a task clear",
        body: ["A task should tell someone what outcome is expected. If a teammate cannot tell when the task is done, the task is too vague."],
        bullets: [
          "Title: short action phrase.",
          "Description: context, constraints, and success criteria.",
          "Owner: one person responsible for moving it forward.",
          "Status: where the task is now.",
          "Priority: how urgently it affects the project.",
        ],
      },
      {
        heading: "Using AI with tasks",
        body: ["AI is useful for turning messy inputs into structured task updates."],
        steps: [
          "Paste rough notes into the AI Playground.",
          "Ask for tasks with owner, priority, and acceptance criteria.",
          "Review the result for accuracy.",
          "Create or update tasks manually after review.",
        ],
        mistakes: [
          "Accepting AI-created tasks without checking names, dates, and dependencies.",
          "Creating tasks that are actually large milestones.",
          "Using high priority for everything.",
        ],
      },
    ],
  },
  {
    slug: "ai-assisted-productivity",
    title: "AI-Assisted Productivity",
    description: "Use AI to reduce busywork while keeping human review, ownership, and accountability clear.",
    category: "Projects & Productivity",
    audience: "Teams",
    time: "7 min",
    learn: ["Where AI helps", "Where humans stay responsible", "Useful team patterns"],
    related: ["projects-milestones", "prompting", "chat-workflows"],
    sections: [
      {
        heading: "What AI is good at",
        body: ["AI is strongest when it has context and a clear job. It can draft, summarize, classify, compare, rewrite, brainstorm, and transform information from one format into another."],
        bullets: [
          "Summarize meeting notes into decisions and next steps.",
          "Rewrite technical notes for non-technical stakeholders.",
          "Turn research into a comparison table.",
          "Draft a project update from recent tasks.",
        ],
      },
      {
        heading: "What humans must still do",
        body: ["AI output should be reviewed before it becomes a team decision, customer message, legal statement, security change, or production workflow."],
        bullets: [
          "Check facts, dates, names, and numbers.",
          "Confirm the result matches company policy.",
          "Decide priorities and tradeoffs.",
          "Approve anything that affects customers, money, security, or compliance.",
        ],
      },
    ],
  },
  {
    slug: "meetings-collaboration",
    title: "Meetings & Collaboration",
    description: "Use meetings, shared context, and AI summaries to keep teams aligned without losing decisions.",
    category: "Projects & Productivity",
    audience: "Teams and managers",
    time: "8 min",
    learn: ["Meeting structure", "Collaboration patterns", "AI follow-up workflows"],
    related: ["projects-milestones", "task-management", "research-mode"],
    sections: [
      {
        heading: "Why meetings belong near projects",
        body: ["A meeting is only useful if decisions and follow-ups survive after the call. In NodLync, meeting notes can connect back to projects, tasks, milestones, and AI workflows."],
      },
      {
        heading: "A simple meeting workflow",
        body: ["Use AI after the meeting to clean up notes, not to replace judgment during the meeting."],
        steps: [
          "Capture agenda, decisions, blockers, and follow-ups.",
          "Ask AI to summarize the notes into decisions, risks, and tasks.",
          "Review the summary for accuracy.",
          "Attach the summary to the project.",
          "Create tasks for real follow-ups.",
        ],
      },
      {
        heading: "Collaboration expectations",
        body: ["Shared AI work should be understandable to people who were not present when it was created."],
        bullets: [
          "Name prompts and workflows clearly.",
          "Explain why a provider or model was chosen.",
          "Keep project updates short and decision-focused.",
          "Use comments or notes for unresolved questions.",
        ],
      },
    ],
  },
  {
    slug: "ai-workflows",
    title: "AI Workflows",
    description: "Build repeatable AI processes using clear inputs, steps, provider choices, and outputs.",
    category: "AI Workflows",
    audience: "Workflow builders",
    time: "12 min",
    learn: ["Workflow concepts", "Node-style thinking", "Testing and rollout"],
    related: ["workflow-organization", "chat-workflows", "prompting", "debugging"],
    sections: [
      {
        heading: "What a workflow is",
        body: [
          "A workflow is a repeatable process. It can include prompts, API requests, decisions, transformations, and saved outputs.",
          "Use a workflow when a task happens more than once or needs consistent steps. Use a one-off chat when the work is exploratory.",
        ],
      },
      {
        heading: "Common workflow parts",
        body: ["Workflows are easier to debug when every step has one job."],
        bullets: [
          "Input: the text, file, URL, image, or project context the workflow starts with.",
          "Prompt step: instructions sent to an AI model.",
          "Provider step: which AI service and model should run the prompt.",
          "Decision step: rules that choose what happens next.",
          "Output: the final answer, summary, image, task list, or saved request.",
        ],
      },
      {
        heading: "Build safely",
        body: ["Start with a workflow small enough to inspect."],
        steps: [
          "Write the desired outcome in one sentence.",
          "Create the minimum steps needed to produce that outcome.",
          "Test with a simple input.",
          "Test with a realistic messy input.",
          "Save a known-good example.",
          "Only then share it with a team.",
        ],
      },
    ],
  },
  {
    slug: "workflow-organization",
    title: "Workflow Organization",
    description: "Name, group, test, and maintain workflows so teams can reuse them confidently.",
    category: "AI Workflows",
    audience: "Workflow maintainers",
    time: "6 min",
    learn: ["Workflow naming", "Version habits", "Maintenance patterns"],
    related: ["ai-workflows", "collections", "debugging"],
    sections: [
      {
        heading: "Name workflows by outcome",
        body: ["A workflow name should explain what it produces. Good names are easier to search, discuss, and trust."],
        bullets: [
          "Good: Summarize discovery call into project tasks.",
          "Good: Compare three model outputs for support reply quality.",
          "Avoid: Test 2, New workflow, AI thing, Final final.",
        ],
      },
      {
        heading: "Maintenance checklist",
        body: ["Workflows need maintenance because providers, models, project needs, and team expectations change."],
        steps: [
          "Keep a short purpose note at the top of the workflow.",
          "Save sample inputs and expected outputs.",
          "Review provider and model choices monthly.",
          "Retire workflows that no one uses.",
        ],
      },
    ],
  },
  {
    slug: "ai-providers",
    title: "AI Providers",
    description: "Understand providers, keys, models, capabilities, routing, and when to choose each provider.",
    category: "AI Providers",
    audience: "Admins and AI users",
    time: "12 min",
    learn: ["Provider basics", "How model access works", "How to choose providers"],
    related: ["api-keys", "models", "provider-openai", "provider-custom"],
    sections: [
      {
        heading: "Provider basics",
        body: ["A provider is the AI service powering your requests. For example, OpenAI powers many ChatGPT-style workflows. NodLync lets you connect multiple providers from one workspace so your team can choose the right tool for each job."],
      },
      {
        heading: "Why multiple providers help",
        body: ["No single provider is best at everything. Some are fast, some are careful with long documents, some specialize in images or video, and some are best for local privacy."],
        bullets: [
          "Use a strong reasoning model for planning and analysis.",
          "Use a fast model for chat responses that need low delay.",
          "Use a media provider for image, video, or audio generation.",
          "Use a custom or local provider for private infrastructure.",
        ],
      },
      {
        heading: "Provider setup pattern",
        body: ["Most providers use the same setup pattern."],
        steps: [
          "Create a provider account.",
          "Create an API key in the provider dashboard.",
          "Add billing or credits if required.",
          "Store the key in NodLync API Vault.",
          "Choose a supported model in the AI Playground or workflow.",
          "Run a short test and save the result.",
        ],
      },
    ],
  },
  {
    slug: "api-keys",
    title: "API Keys",
    description: "Learn what API keys are, why they matter, and how to store them safely in NodLync.",
    category: "AI Providers",
    audience: "Everyone using providers",
    time: "8 min",
    learn: ["API key meaning", "Vault setup", "Safety rules"],
    related: ["api-vault", "ai-providers", "troubleshooting"],
    sections: [
      {
        heading: "What an API key is",
        body: ["An API key is a secret text value that lets software use a provider account. Treat it like a password. Anyone with the key may be able to spend credits, view model access, or send requests under your account."],
      },
      {
        heading: "Why the API Vault exists",
        body: ["The API Vault keeps secrets in one controlled place. Users can pick a stored provider key without pasting sensitive text into prompts, tasks, or notes."],
        bullets: [
          "Use clear names such as OpenAI Team Testing or Gemini Production.",
          "Do not paste keys into chat prompts.",
          "Rotate keys if someone leaves the team or a key is exposed.",
          "Use separate keys for testing and production when possible.",
        ],
      },
      {
        heading: "Common key problems",
        body: ["Most provider setup failures are simple key or billing issues."],
        troubleshooting: [
          "Invalid key: the key was copied incorrectly, revoked, expired, or created for the wrong account.",
          "Unauthorized: the key exists but lacks permission for the endpoint or model.",
          "Payment required: the provider account needs billing or credits.",
          "Wrong provider: an Anthropic key will not work in an OpenAI provider field.",
        ],
      },
    ],
  },
  {
    slug: "models",
    title: "Models",
    description: "Understand model differences, context windows, speed, cost, modalities, and quality tradeoffs.",
    category: "AI Providers",
    audience: "AI users and admins",
    time: "10 min",
    learn: ["How models differ", "How to choose a model", "Common mistakes"],
    related: ["ai-providers", "prompting", "multimodal-workflows"],
    sections: [
      {
        heading: "What a model is",
        body: ["A model is the AI system that generates the answer. Providers often offer several models because different work needs different tradeoffs."],
      },
      {
        heading: "How models differ",
        body: ["A model choice affects quality, speed, cost, supported input types, and how much context the model can read at once."],
        bullets: [
          "Reasoning quality: how well it handles complex tasks.",
          "Speed: how quickly it starts and finishes responding.",
          "Cost: how much input and output cost.",
          "Context window: how much text, data, or file content it can consider.",
          "Modality: whether it supports text, images, audio, video, or tool calls.",
        ],
      },
      {
        heading: "Choosing a model",
        body: ["Use the cheapest model that reliably handles the task. Move to a stronger model when the task needs it."],
        steps: [
          "Start with the task: chat, research, image, code, audio, or analysis.",
          "Pick a provider that supports that task.",
          "Choose a model with enough context and quality.",
          "Run the same test prompt twice and compare output quality.",
          "Document the recommended model in your workflow or project notes.",
        ],
      },
    ],
  },
  {
    slug: "ai-playground",
    title: "AI Playground",
    description: "Use the playground to test prompts, compare providers, inspect responses, and learn model behavior.",
    category: "AI Tools",
    audience: "Daily AI users",
    time: "9 min",
    learn: ["Playground basics", "Testing prompts", "Expected behavior"],
    related: ["prompting", "models", "chat-workflows", "research-mode"],
    sections: [
      {
        heading: "What the playground is for",
        body: ["The AI Playground is a safe place to test a prompt before turning it into a shared workflow. It helps you learn how different models respond to the same instruction."],
      },
      {
        heading: "A useful test pattern",
        body: ["Good prompt testing uses examples, not vibes."],
        steps: [
          "Write the task in one sentence.",
          "Add the real input or a realistic sample.",
          "Choose a provider and model.",
          "Run the prompt.",
          "Check whether the answer is accurate, useful, and in the right format.",
          "Try one alternate model if quality, speed, or cost matters.",
        ],
      },
      {
        heading: "Expected behavior",
        body: ["The playground should show the selected provider, model, prompt, response, and any errors. If streaming is enabled, text appears gradually while the request is still running."],
      },
    ],
  },
  {
    slug: "research-mode",
    title: "Research Mode",
    description: "Use AI to explore topics, compare sources, organize findings, and turn research into project actions.",
    category: "AI Tools",
    audience: "Researchers and product teams",
    time: "8 min",
    learn: ["Research workflows", "Source discipline", "Turning findings into tasks"],
    related: ["ai-playground", "projects-milestones", "prompting"],
    sections: [
      {
        heading: "What research mode is",
        body: ["Research mode is for exploratory work where the answer is not known yet. The goal is to gather, compare, summarize, and structure information so a human can decide what matters."],
      },
      {
        heading: "Research workflow",
        body: ["Separate discovery from decision-making."],
        steps: [
          "Write the research question.",
          "Collect notes, links, files, or observations.",
          "Ask AI to summarize themes and open questions.",
          "Ask for a comparison table when choices are involved.",
          "Review claims and mark anything that needs verification.",
          "Create tasks or project notes from confirmed findings.",
        ],
      },
      {
        heading: "Common mistakes",
        body: ["Research output can sound confident even when it is incomplete."],
        mistakes: [
          "Treating generated summaries as verified facts.",
          "Mixing opinions, sources, and decisions in one note.",
          "Forgetting to capture why a recommendation was chosen.",
        ],
      },
    ],
  },
  {
    slug: "chat-workflows",
    title: "Chat Workflows",
    description: "Turn repeated conversations into reliable prompt patterns and team-approved assistant flows.",
    category: "AI Tools",
    audience: "Support, product, and operations teams",
    time: "7 min",
    learn: ["Chat structure", "Prompt reuse", "Quality checks"],
    related: ["prompting", "ai-workflows", "models"],
    sections: [
      {
        heading: "What a chat workflow is",
        body: ["A chat workflow is a repeatable conversation pattern. Examples include customer reply drafting, bug triage, user interview synthesis, or weekly project updates."],
      },
      {
        heading: "Make chat reliable",
        body: ["Give the model a role, context, task, output format, and quality bar."],
        bullets: [
          "Role: what perspective should the assistant use?",
          "Context: what facts should it know?",
          "Task: what should it produce?",
          "Format: bullets, table, JSON, email, checklist, or summary.",
          "Quality bar: what should it avoid or double-check?",
        ],
      },
    ],
  },
  {
    slug: "multimodal-workflows",
    title: "Multimodal Workflows",
    description: "Understand workflows that combine text, images, audio, video, files, and structured data.",
    category: "Media & Multimodal",
    audience: "Creative and product teams",
    time: "8 min",
    learn: ["Modality basics", "How media workflows differ", "Common failure points"],
    related: ["image-generation", "video-generation", "audio-workflows", "models"],
    sections: [
      {
        heading: "What multimodal means",
        body: ["Multimodal means the workflow can use more than one type of input or output. Text is one modality. Images, audio, video, and files are others."],
      },
      {
        heading: "How these workflows operate",
        body: ["Media workflows usually have stricter input requirements than text chat. Image size, video duration, file type, and prompt detail can all affect the result."],
        bullets: [
          "Text-to-image: a prompt becomes an image.",
          "Image-to-image: an existing image guides a new image.",
          "Audio transcription: speech becomes text.",
          "Video generation: text or image prompts become short motion output.",
          "Vision analysis: the model reads an image and answers questions about it.",
        ],
      },
    ],
  },
  {
    slug: "image-generation",
    title: "Image Generation",
    description: "Create and troubleshoot image workflows with clear prompts, provider choice, and review steps.",
    category: "Media & Multimodal",
    audience: "Creative users",
    time: "7 min",
    learn: ["Image prompt basics", "Provider fit", "Failure troubleshooting"],
    related: ["provider-stability", "provider-replicate", "multimodal-workflows"],
    sections: [
      {
        heading: "How image generation works",
        body: ["You describe the image you want, choose a model that can generate images, and the provider returns one or more images. The prompt should describe subject, setting, style, composition, colors, and constraints."],
      },
      {
        heading: "Prompt structure",
        body: ["Detailed prompts help, but clarity matters more than length."],
        bullets: [
          "Subject: what should be visible?",
          "Purpose: what will the image be used for?",
          "Style: realistic, product mockup, editorial, diagram, concept art, and so on.",
          "Constraints: aspect ratio, background, text-free, brand-safe, or transparent background.",
        ],
        troubleshooting: [
          "No image returned: check provider credits, model support, and request size.",
          "Wrong style: add examples of what to include and avoid.",
          "Text looks broken: avoid asking image models to render detailed text; add text in design tools later.",
        ],
      },
    ],
  },
  {
    slug: "video-generation",
    title: "Video Generation",
    description: "Plan video AI workflows, understand limitations, and debug failed generations.",
    category: "Media & Multimodal",
    audience: "Creative and marketing teams",
    time: "7 min",
    learn: ["Video workflow expectations", "Prompt planning", "Common limitations"],
    related: ["provider-replicate", "multimodal-workflows", "troubleshooting"],
    sections: [
      {
        heading: "What to expect",
        body: ["AI video generation is more resource-intensive than text or image generation. It often takes longer, costs more, and has stricter limits on duration, resolution, and input format."],
      },
      {
        heading: "A practical workflow",
        body: ["Treat video generation as iteration."],
        steps: [
          "Start with a short scene description.",
          "Generate a still image or storyboard first when possible.",
          "Use short durations for early tests.",
          "Review motion, composition, and artifacts.",
          "Only increase quality settings after the direction works.",
        ],
      },
    ],
  },
  {
    slug: "audio-workflows",
    title: "Audio Workflows",
    description: "Use AI for transcription, summarization, voice workflows, and audio debugging.",
    category: "Media & Multimodal",
    audience: "Teams using calls or media",
    time: "7 min",
    learn: ["Audio inputs", "Transcription flow", "Quality checks"],
    related: ["meetings-collaboration", "multimodal-workflows", "models"],
    sections: [
      {
        heading: "Common audio workflows",
        body: ["Audio workflows often start by turning speech into text. Once the transcript exists, the same AI tools used for text can summarize, classify, rewrite, or extract tasks."],
        bullets: [
          "Meeting transcription and summary.",
          "Customer call analysis.",
          "Voice note cleanup.",
          "Audio-to-task extraction.",
        ],
      },
      {
        heading: "Quality checks",
        body: ["Audio quality affects transcription quality."],
        troubleshooting: [
          "Poor transcript: reduce background noise and check speaker volume.",
          "Missing speaker names: add speaker labels manually or use tools that support diarization.",
          "Large file fails: compress audio or split it into smaller parts.",
        ],
      },
    ],
  },
  {
    slug: "prompting",
    title: "Prompting",
    description: "Write clearer prompts with context, examples, constraints, output formats, and review rules.",
    category: "AI Tools",
    audience: "Everyone",
    time: "10 min",
    learn: ["Prompt anatomy", "Examples", "Troubleshooting weak answers"],
    related: ["ai-playground", "chat-workflows", "models"],
    sections: [
      {
        heading: "What a prompt is",
        body: ["A prompt is the instruction you give the AI. It can include a task, background information, examples, files, constraints, and the format you want back."],
      },
      {
        heading: "Beginner prompt formula",
        body: ["Use this structure when you are unsure how to start."],
        bullets: [
          "Goal: what do you want?",
          "Context: what should the model know?",
          "Input: what should it work on?",
          "Output format: how should the answer be shaped?",
          "Rules: what should it avoid, check, or preserve?",
        ],
      },
      {
        heading: "Example",
        body: [
          "Goal: turn these meeting notes into project tasks. Context: we are planning a beta launch. Input: paste notes. Output format: table with task, owner, priority, due date, and open questions. Rules: do not invent owners or dates.",
        ],
      },
      {
        heading: "When answers are weak",
        body: ["Improve the input before blaming the model."],
        troubleshooting: [
          "Vague answer: add the audience, goal, and format.",
          "Wrong facts: provide source material and ask the model to only use it.",
          "Too long: set a word limit or section structure.",
          "Too generic: add examples of good and bad output.",
        ],
      },
    ],
  },
  {
    slug: "extension-guide",
    title: "Extension Guide",
    description: "Install and use the browser extension for traffic capture, request inspection, replay, and AI monitoring.",
    category: "Extension & Debugging",
    audience: "Debuggers and workspace admins",
    time: "12 min",
    learn: ["Extension setup", "Request capture", "Privacy and permissions"],
    related: ["traffic-capture", "provider-tracing", "debugging", "streaming-inspection"],
    sections: [
      {
        heading: "What the extension does",
        body: ["The NodLync browser extension helps you capture browser activity that is hard to understand from inside the app alone. It can observe network requests, inspect API behavior, capture performance signals, and send useful debugging context back to the workspace."],
      },
      {
        heading: "Setup instructions",
        body: ["Use a Chromium browser such as Chrome or Edge. During local development, load the extension from the project folder."],
        steps: [
          "Open chrome://extensions or edge://extensions.",
          "Turn on Developer Mode.",
          "Choose Load unpacked.",
          "Select the chrome-extension folder from the NodLync project.",
          "Pin the extension to the browser toolbar.",
          "Open the extension dashboard and confirm it can see the current tab.",
        ],
      },
      {
        heading: "Screenshot placeholders",
        body: [
          "[Screenshot placeholder: Chrome extensions page with Developer Mode enabled.]",
          "[Screenshot placeholder: NodLync extension popup with Capture enabled.]",
          "[Screenshot placeholder: captured request list with timing and status columns.]",
        ],
      },
      {
        heading: "Privacy and permissions",
        body: ["Browser extensions require permissions so they can observe pages and network activity. Teams should explain what is captured, where it is stored, and who can access it."],
        bullets: [
          "Capture only the flows needed for debugging.",
          "Avoid capturing sensitive customer data unless your team has approval.",
          "Turn capture off when you are done.",
          "Review permissions after browser or extension updates.",
        ],
      },
    ],
  },
  {
    slug: "traffic-capture",
    title: "Traffic Capture",
    description: "Capture browser requests, understand request and response data, and send useful traces to NodLync.",
    category: "Extension & Debugging",
    audience: "Debuggers",
    time: "9 min",
    learn: ["Capture basics", "Request anatomy", "Common capture problems"],
    related: ["extension-guide", "request-replay", "debugging"],
    sections: [
      {
        heading: "What request capture means",
        body: ["Request capture records the browser calls made by a web page. A request usually includes a method, URL, headers, optional body, status code, timing, and response details."],
      },
      {
        heading: "Why capture helps",
        body: ["When a feature fails, the visible page rarely tells the full story. Capture shows whether the browser sent the right request, whether the server responded, and how long each step took."],
        bullets: [
          "Find failed API calls.",
          "Compare slow and fast sessions.",
          "Copy a request into the API tester.",
          "Share an exact failure with teammates.",
        ],
      },
      {
        heading: "Common issues",
        body: ["Capture depends on browser permissions and page context."],
        troubleshooting: [
          "Nothing captured: confirm capture is on and refresh the page.",
          "Missing request bodies: some browser APIs restrict sensitive body access.",
          "Wrong tab: make sure the extension is attached to the tab you are testing.",
          "Too much noise: filter by domain, method, or status code.",
        ],
      },
    ],
  },
  {
    slug: "provider-tracing",
    title: "Provider Tracing",
    description: "Trace AI provider requests from prompt to response so teams can debug model and provider behavior.",
    category: "Extension & Debugging",
    audience: "AI debuggers",
    time: "9 min",
    learn: ["Trace meaning", "Provider request lifecycle", "Debugging patterns"],
    related: ["debugging", "streaming-responses", "direct-trace-mode"],
    sections: [
      {
        heading: "What a trace is",
        body: ["A trace is a timeline of a request. For an AI request, it can show when the request started, which provider and model were used, when the first token arrived, when the response completed, and what error occurred if it failed."],
      },
      {
        heading: "What to inspect",
        body: ["A useful trace separates configuration problems from provider problems and prompt problems."],
        bullets: [
          "Provider and model selected.",
          "API key or vault credential used.",
          "Request start time and total duration.",
          "First response timing for streaming.",
          "Error code and provider message.",
        ],
      },
    ],
  },
  {
    slug: "streaming-responses",
    title: "Streaming Responses",
    description: "Understand why AI answers appear gradually, how streaming works, and how to debug interruptions.",
    category: "Extension & Debugging",
    audience: "AI users and debuggers",
    time: "8 min",
    learn: ["Streaming basics", "Expected behavior", "Failure diagnosis"],
    related: ["streaming-inspection", "provider-tracing", "troubleshooting"],
    sections: [
      {
        heading: "What streaming means",
        body: ["Streaming means the provider sends the answer in small pieces as it is generated. This makes the app feel faster because the user can begin reading before the final answer is ready."],
      },
      {
        heading: "Expected behavior",
        body: ["A streamed response may start with a short delay, then text appears progressively. The final response should still complete cleanly and become available for saving, copying, or workflow output."],
      },
      {
        heading: "Common streaming failures",
        body: ["Streaming uses a long-lived connection, so network and browser behavior matters."],
        troubleshooting: [
          "Stops halfway: check network stability and provider timeout limits.",
          "No text appears until the end: the provider or selected model may not support streaming.",
          "Duplicate chunks: inspect the client parser and retry handling.",
          "Response never finishes: check whether the provider sent a completion event.",
        ],
      },
    ],
  },
  {
    slug: "streaming-inspection",
    title: "Streaming Inspection",
    description: "Inspect streamed chunks, timing, completion events, and interruptions during AI responses.",
    category: "Extension & Debugging",
    audience: "Technical debuggers",
    time: "8 min",
    learn: ["Chunk inspection", "Timing clues", "Replay workflow"],
    related: ["streaming-responses", "provider-tracing", "request-replay"],
    sections: [
      {
        heading: "What to look for",
        body: ["Streaming inspection helps you see whether a response is failing at the provider, network, parser, or UI layer."],
        bullets: [
          "Time to first chunk.",
          "Chunk frequency.",
          "Malformed chunks.",
          "Completion signal.",
          "Client cancellation or timeout.",
        ],
      },
      {
        heading: "Debugging flow",
        body: ["Work from outside to inside."],
        steps: [
          "Check whether the provider returned any chunks.",
          "Check whether the browser received them.",
          "Check whether the app parsed them correctly.",
          "Check whether the UI rendered them without duplication.",
        ],
      },
    ],
  },
  {
    slug: "direct-trace-mode",
    title: "Direct Trace Mode",
    description: "Use direct trace mode to inspect a specific request path without unrelated workspace noise.",
    category: "Extension & Debugging",
    audience: "Debuggers",
    time: "6 min",
    learn: ["Direct trace purpose", "When to use it", "How to interpret results"],
    related: ["provider-tracing", "debugging", "traffic-capture"],
    sections: [
      {
        heading: "What direct trace mode is",
        body: ["Direct trace mode focuses on one request or one flow. It is useful when normal logs are too noisy and you need a clean timeline for a specific provider call, browser request, or replay attempt."],
      },
      {
        heading: "When to use it",
        body: ["Use direct tracing when a problem is intermittent, expensive to reproduce, or depends on exact timing."],
        bullets: [
          "A model streams part of a response and then stops.",
          "A provider returns different errors for the same prompt.",
          "A browser request works manually but fails inside the app.",
          "A replayed request behaves differently than the original capture.",
        ],
      },
    ],
  },
  {
    slug: "debugging",
    title: "Debugging",
    description: "A beginner-friendly debugging workflow for AI requests, providers, workflows, browser capture, and API failures.",
    category: "Extension & Debugging",
    audience: "Everyone",
    time: "12 min",
    learn: ["Debugging mindset", "Where to look first", "How to document failures"],
    related: ["troubleshooting", "provider-tracing", "traffic-capture", "api-vault"],
    sections: [
      {
        heading: "Debugging means narrowing the cause",
        body: ["Debugging is not guessing. It is the process of narrowing a problem until the next action is obvious. In NodLync, most failures happen in one of five places: input, key, provider, model, or network."],
      },
      {
        heading: "First checks",
        body: ["Start with simple checks before changing code or workflows."],
        steps: [
          "Read the exact error message.",
          "Check whether the provider key is present and valid.",
          "Confirm the selected model supports the task.",
          "Try a tiny prompt or small file.",
          "Check rate limits, billing, and provider status.",
          "Capture or trace the request if the failure continues.",
        ],
      },
      {
        heading: "Document the failure",
        body: ["A good bug note saves the next person time."],
        bullets: [
          "What you tried.",
          "What you expected.",
          "What happened instead.",
          "Provider, model, and workflow name.",
          "Time of failure and trace link if available.",
        ],
      },
    ],
  },
  {
    slug: "api-vault",
    title: "API Vault",
    description: "Store provider keys and sensitive connection values safely for AI tools and workflows.",
    category: "Workspace",
    audience: "Admins and trusted users",
    time: "8 min",
    learn: ["Vault purpose", "Credential naming", "Security habits"],
    related: ["api-keys", "ai-providers", "debugging"],
    sections: [
      {
        heading: "What the API Vault stores",
        body: ["The API Vault stores sensitive values such as provider API keys. It helps teams avoid sharing secrets in chat messages, screenshots, prompts, or browser notes."],
      },
      {
        heading: "Good vault hygiene",
        body: ["A clean vault makes provider setup easier and safer."],
        bullets: [
          "Use names that include provider, team, and environment.",
          "Remove unused keys.",
          "Rotate keys after exposure or team changes.",
          "Keep production and testing keys separate.",
        ],
      },
    ],
  },
  {
    slug: "collections",
    title: "Collections",
    description: "Organize saved prompts, requests, tests, and reusable examples into collections.",
    category: "Workspace",
    audience: "Teams",
    time: "6 min",
    learn: ["Collection purpose", "Reuse patterns", "Team organization"],
    related: ["ai-playground", "workflow-organization", "api-vault"],
    sections: [
      {
        heading: "What collections are for",
        body: ["Collections help teams save useful items so they are easy to find later. A collection can hold examples, saved requests, successful prompts, debugging cases, or workflow inputs."],
      },
      {
        heading: "Recommended collections",
        body: ["Start with collections that match team behavior."],
        bullets: [
          "Approved prompts.",
          "Provider test cases.",
          "Customer support examples.",
          "Debugging captures.",
          "Workflow sample inputs.",
        ],
      },
    ],
  },
  {
    slug: "request-replay",
    title: "Replay Systems",
    description: "Replay captured requests to reproduce failures, compare behavior, and verify fixes.",
    category: "Extension & Debugging",
    audience: "Debuggers",
    time: "7 min",
    learn: ["Replay concept", "When replay helps", "Replay safety"],
    related: ["traffic-capture", "debugging", "collections"],
    sections: [
      {
        heading: "What replay means",
        body: ["Replay means sending a captured request again so you can reproduce or inspect a behavior. It is helpful when a bug happened once and you need to understand it without clicking through the full UI again."],
      },
      {
        heading: "Replay safely",
        body: ["A replay can change data if the original request created, updated, or deleted something."],
        bullets: [
          "Prefer replaying against test environments.",
          "Check the HTTP method before replaying.",
          "Avoid replaying payments, emails, deletes, or customer-affecting actions unless approved.",
          "Remove sensitive headers before sharing examples.",
        ],
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Fix common NodLync issues with API keys, providers, streaming, models, media generation, and extension capture.",
    category: "Help",
    audience: "Everyone",
    time: "15 min",
    learn: ["Common symptoms", "Why issues happen", "How to fix them"],
    related: ["debugging", "api-keys", "extension-guide", "streaming-responses"],
    sections: [
      {
        heading: "Invalid API keys",
        body: ["This happens when the key is missing, copied incorrectly, revoked, expired, or entered under the wrong provider."],
        troubleshooting: [
          "Identify it by errors such as unauthorized, invalid API key, forbidden, or authentication failed.",
          "Fix it by creating a new provider key, storing it in API Vault, and testing with a short prompt.",
          "Check for accidental leading or trailing spaces when pasting.",
        ],
      },
      {
        heading: "Provider failures",
        body: ["Provider failures can come from outages, billing limits, unsupported endpoints, rate limits, or model access restrictions."],
        troubleshooting: [
          "Try a smaller prompt with the same provider.",
          "Try a different model from the same provider.",
          "Check billing, credits, and rate limits.",
          "If only one provider fails, switch temporarily to another provider while investigating.",
        ],
      },
      {
        heading: "Streaming interruptions",
        body: ["Streaming can stop if the network drops, the provider times out, the browser cancels the request, or the selected model does not support streaming."],
        troubleshooting: [
          "Run the same prompt without streaming if available.",
          "Check whether partial output appears.",
          "Inspect the trace for first chunk and completion events.",
          "Reduce prompt size and retry.",
        ],
      },
      {
        heading: "Unsupported models",
        body: ["A model may not support images, audio, tools, JSON mode, streaming, or the requested context size."],
        troubleshooting: [
          "Choose a model known to support the modality.",
          "Check the provider page for capability notes.",
          "Use a smaller file or shorter prompt.",
          "Update workflow notes when a model choice changes.",
        ],
      },
      {
        heading: "Image and video failures",
        body: ["Media generation is more sensitive to provider credits, file size, dimensions, safety filters, and model-specific input rules."],
        troubleshooting: [
          "Test with a simple prompt first.",
          "Reduce output size, duration, or quality settings.",
          "Check whether the provider requires credits.",
          "Remove unsupported file types or overly large inputs.",
        ],
      },
      {
        heading: "Extension capture issues",
        body: ["Capture issues usually come from permissions, wrong tab context, browser restrictions, or capture being off."],
        troubleshooting: [
          "Confirm the extension is installed and enabled.",
          "Refresh the target tab after turning capture on.",
          "Check browser permissions for the site.",
          "Disable conflicting privacy or network extensions temporarily.",
        ],
      },
    ],
  },
  {
    slug: "advanced-usage",
    title: "Advanced Usage",
    description: "Use routing, custom providers, traces, replay, workflow testing, and governance patterns after the basics are stable.",
    category: "Advanced",
    audience: "Power users and admins",
    time: "10 min",
    learn: ["Advanced patterns", "Governance", "Testing discipline"],
    related: ["custom-providers", "direct-trace-mode", "workflow-organization"],
    sections: [
      {
        heading: "When to move beyond basics",
        body: ["Advanced setup is useful after the team has a working provider, repeatable prompts, and a clear project structure. Add complexity only when it solves a real operational problem."],
      },
      {
        heading: "Advanced patterns",
        body: ["These patterns help larger teams operate more safely."],
        bullets: [
          "Use separate provider keys for development, staging, and production.",
          "Use custom providers or gateways for centralized governance.",
          "Use traces and replay for high-value workflows.",
          "Keep approved model lists for different task types.",
          "Document fallback providers for outages or rate limits.",
        ],
      },
    ],
  },
  {
    slug: "custom-providers",
    title: "Custom Providers",
    description: "Connect an internal AI gateway, proxy, private model endpoint, or OpenAI-compatible service.",
    category: "Advanced",
    audience: "Admins and developers",
    time: "9 min",
    learn: ["Custom provider concepts", "Setup checklist", "Debugging custom endpoints"],
    related: ["provider-custom", "api-keys", "debugging"],
    sections: [
      {
        heading: "What a custom provider is",
        body: ["A custom provider is your own endpoint or gateway that NodLync can call like an AI provider. Teams use custom providers for private models, internal routing, logging, security controls, or approved model gateways."],
      },
      {
        heading: "Setup checklist",
        body: ["Custom providers need clearer documentation because NodLync cannot guess how your internal service behaves."],
        steps: [
          "Confirm the base URL.",
          "Confirm the authentication method.",
          "Confirm request and response format.",
          "Confirm whether streaming is supported.",
          "Add a test key or token to API Vault.",
          "Run a tiny request and inspect the trace.",
        ],
      },
    ],
  },
  {
    slug: "faq",
    title: "FAQ",
    description: "Short answers to common questions about NodLync, providers, workflows, extension capture, and troubleshooting.",
    category: "Help",
    audience: "Everyone",
    time: "6 min",
    learn: ["Quick answers", "Where to go next", "Common beginner concerns"],
    related: ["getting-started", "troubleshooting", "ai-providers"],
    sections: [
      {
        heading: "Do I need to understand APIs to use NodLync?",
        body: ["No. Non-technical users can start with projects, meetings, AI Playground, and saved workflows. API and debugging tools are available when a team needs deeper inspection."],
      },
      {
        heading: "Do I need my own provider account?",
        body: ["Usually yes, unless your workspace admin has already added approved provider keys. Providers bill separately from NodLync."],
      },
      {
        heading: "Can I use multiple AI providers?",
        body: ["Yes. That is one of the main reasons NodLync exists. You can compare providers, use different models for different jobs, and keep provider keys organized in API Vault."],
      },
      {
        heading: "Why did my AI request fail?",
        body: ["Start with the basics: API key, billing, selected model, input size, rate limits, and provider status. Then inspect traces or capture data if the issue continues."],
      },
      {
        heading: "Is the extension required?",
        body: ["No. The extension is helpful for browser traffic capture and debugging, but the workspace, projects, providers, playground, and workflows can still be used without it."],
      },
    ],
  },
  ...providerDocs.map(providerPage),
];

export const DOCS_BY_SLUG = Object.fromEntries(KNOWLEDGE_DOCS.map((doc) => [doc.slug, doc])) as Record<string, KnowledgeDoc>;

export const DOC_CATEGORIES = Array.from(new Set(KNOWLEDGE_DOCS.map((doc) => doc.category)));

export function getDocsByCategory(category: string) {
  return KNOWLEDGE_DOCS.filter((doc) => doc.category === category);
}

export function getRelatedDocs(doc: KnowledgeDoc) {
  return doc.related.map((slug) => DOCS_BY_SLUG[slug]).filter(Boolean);
}
