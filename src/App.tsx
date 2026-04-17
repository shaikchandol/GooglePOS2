/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Box, 
  Layers, 
  Network, 
  Database, 
  Cpu, 
  Terminal, 
  Users, 
  ShoppingCart, 
  Package, 
  Receipt, 
  ShieldCheck, 
  ChevronRight,
  GitBranch,
  Settings,
  Monitor,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Mermaid from './components/Mermaid';
import Markdown from 'react-markdown';

// --- Architecture Data ---

const DIAGRAMS = {
  highLevelModule: `
graph TD
    subgraph POS_Modular_Monolith
        Module_Sales[Sales Module]
        Module_Inventory[Inventory Module]
        Module_Customers[Customers Module]
        Module_Finance[Finance Module]
        Shared_Kernel[Shared Kernel]
    end

    User((Retail Staff)) --> Module_Sales
    Admin((Manager)) --> Module_Inventory
    Admin --> Module_Customers
    Admin --> Module_Finance

    Module_Sales -.-> Shared_Kernel
    Module_Inventory -.-> Shared_Kernel
    Module_Customers -.-> Shared_Kernel
    Module_Finance -.-> Shared_Kernel

    style POS_Modular_Monolith fill:#111,stroke:#333,stroke-width:2px,color:#fff
    style Shared_Kernel fill:#222,stroke:#555,stroke-dasharray: 5 5,color:#aaa
  `,
  lowLevelModule: `
graph LR
    subgraph Sales_Module_LLD
        API[API Controllers]
        Application[Application Services]
        Domain[Domain Models & Entities]
        Infrastructure[Persistence & Adapters]
        
        API --> Application
        Application --> Domain
        Application --> Infrastructure
        Infrastructure --> Application
    end

    subgraph Business_Rules
        Pricing[Pricing Engine]
        Tax[Tax Calculator]
        Discount[Discount Logic]
    end

    Domain --- Business_Rules
    
    style Sales_Module_LLD fill:#000,stroke:#444,color:#fff
    style Application fill:#1a365d,stroke:#2b6cb0,color:#fff
    style Domain fill:#22543d,stroke:#2f855a,color:#fff
    style Infrastructure fill:#744210,stroke:#975a16,color:#fff
  `,
  betweenModulesHL: `
graph LR
    Sales[Sales Module]
    Inventory[Inventory Module]
    Customers[Customers Module]
    
    Sales -- "1. Order Created" --> Inventory
    Inventory -- "2. Stock Adjusted" --> Sales
    Sales -- "3. Points Earned" --> Customers
    Customers -- "4. Customer History" --> Sales

    style Sales fill:#2d3748,stroke:#4a5568,color:#fff
    style Inventory fill:#2d3748,stroke:#4a5568,color:#fff
    style Customers fill:#2d3748,stroke:#4a5568,color:#fff
  `,
  betweenModulesLL: `
graph TD
    subgraph Sales_Domain
        OrderCreatedEvent[OrderCreatedEvent]
    end

    subgraph Inventory_Module
        InventoryConsumer[OrderCreatedConsumer]
        StockService[StockManagementService]
    end

    subgraph Customers_Module
        LoyaltyConsumer[LoyaltyPointsConsumer]
        CustomerService[CustomerProfileService]
    end

    OrderCreatedEvent -- "In-Memory Bus (MediatR)" --> InventoryConsumer
    OrderCreatedEvent -- "In-Memory Bus (MediatR)" --> LoyaltyConsumer
    
    InventoryConsumer --> StockService
    LoyaltyConsumer --> CustomerService

    style Sales_Domain fill:#1a202c,stroke:#2d3748,color:#fff
    style Inventory_Module fill:#1a202c,stroke:#2d3748,color:#fff
    style Customers_Module fill:#1a202c,stroke:#2d3748,color:#fff
  `,
  inProcessComm: `
sequenceDiagram
    participant S as Sales Module
    participant M as Mediator (MediatR)
    participant I as Inventory Module (Handler)
    participant C as Customer Module (Handler)

    S->>M: Publish(OrderPlacedEvent)
    activate M
    M->>I: Handle(OrderPlacedEvent)
    activate I
    Note over I: Decrement Stock
    I-->>M: Done
    deactivate I
    
    M->>C: Handle(OrderPlacedEvent)
    activate C
    Note over C: Add Loyalty Points
    C-->>M: Done
    deactivate C
    deactivate M
  `,
  outProcessComm: `
graph LR
    subgraph Module_A
        AppA[Application Service]
        Outbox[Outbox Table]
        Publisher[Publisher Service]
    end

    subgraph Message_Broker
        Bus[RabbitMQ / Azure Service Bus / Redis]
    end

    subgraph Module_B
        Subscriber[Subscriber Service]
        Inbox[Inbox Table]
        HandlerB[Event Handler]
    end

    AppA --> Outbox
    Publisher -- "Polls" --> Outbox
    Publisher -- "Publish" --> Bus
    Bus -- "Deliver" --> Subscriber
    Subscriber --> Inbox
    HandlerB -- "Process" --> Inbox

    style Message_Broker fill:#2c5282,stroke:#4299e1,color:#fff
  `
};

const SDLC_PROMPT_FLOW = `
### 🚀 End-to-End SDK Prompt Flow

#### Step 1: Inception & Domain Discovery
> "I want to build a Modular Monolith POS system. Help me identify the core **Bounded Contexts** (e.g., Sales, Inventory, Customers) and the **Shared Kernel**. Detail the Ubiquitous Language for each module."

#### Step 2: Architecture Setup
> "Generate the .NET Solution structure for a Modular Monolith. Use **Clean Architecture** within each module. Include projects for: 
> - POS.Modules.Sales.Api
> - POS.Modules.Sales.Application
> - POS.Modules.Sales.Domain
> - POS.Modules.Sales.Infrastructure
> Ensure the shared kernel contains cross-cutting abstractions like \`ITenantProvider\`, \`IDomainEvent\`, and \`IMessageBus\`."

#### Step 3: Multi-tenancy Implementation
> "Implement a cloud-agnostic multi-tenancy strategy using a shared database with a \`TenantId\` discriminator in EF Core Global Query Filters. Provide the \`TenantMiddleware\` to resolve the tenant from the request header or domain."

#### Step 4: Module Communication
> "Set up in-process communication using **MediatR**. Guide me on implementing the **Outbox Pattern** for reliable out-of-process messaging via MassTransit, ensuring it is cloud-agnostic with an abstraction for RabbitMQ or Azure Service Bus."

#### Step 5: Testing & Deployment (CI/CD)
> "Generate a Dockerfile and a GitHub Actions workflow that builds the modular monolith and runs integration tests with TestContainers (PostgreSQL). Ensure the setup is cloud-agnostic for deployment on AWS AppRunner, Azure Container Apps, or Google Cloud Run."
`;

const TECH_STACK = {
  concepts: [
    { title: "Modular Monolith", desc: "Single deployment unit with strict logical isolation between modules." },
    { title: "Cloud Agnostic", desc: "Code doesn't depend on cloud-specific SDKs; uses abstractions for DB, Storage, and Messaging." },
    { title: "Clean Architecture", desc: "Inner domain layers have no dependencies on outer infrastructure layers." },
    { title: "Multi-tenancy", desc: "Ability to serve multiple isolated clients (tenants) from a single instance." }
  ],
  nugets: [
    "MediatR (In-process events)",
    "MassTransit (Message bus abstraction)",
    "Entity Framework Core (C-agnostic ORM)",
    "AutoMapper / Mapster",
    "FluentValidation",
    "Quartz.NET / Hangfire (Jobs)",
    "Serilog (Structured Logging)"
  ],
  tools: [
    "Docker & Compose",
    "PostgreSQL / Microsoft SQL Server",
    "Redis (Distributed Cache/Bus)",
    "RabbitMQ",
    "Swagger / Scalar (API Docs)",
    "TestContainers"
  ]
};

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Architecture Map', icon: <Box size={14} /> },
    { id: 'architecture', label: 'Module Designer', icon: <Layers size={14} /> },
    { id: 'modules', label: 'Process Flows', icon: <Network size={14} /> },
    { id: 'tech', label: 'Tech Schematics', icon: <Cpu size={14} /> },
    { id: 'tenancy', label: 'Multi-tenancy', icon: <Users size={14} /> },
    { id: 'sdlc', label: 'SDLC Pipelines', icon: <Terminal size={14} /> },
  ];

  return (
    <div className="h-screen w-full overflow-hidden grid grid-cols-[200px_1fr_280px] grid-rows-[60px_1fr_180px] border-[4px] border-ink bg-bg text-ink font-sans selection:bg-accent/30">
      {/* Sidebar Nav */}
      <nav className="row-span-3 border-r border-line bg-[#D8D7D2] flex flex-col">
        <div className="p-5 font-serif italic border-b-2 border-line bg-ink text-bg text-base flex items-center gap-2">
          <Layers size={18} />
          MODULAR.POS
        </div>
        <div className="flex-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 border-b border-line text-[11px] font-semibold uppercase tracking-wider text-left transition-colors ${
                activeTab === tab.id 
                  ? 'bg-bg font-extrabold' 
                  : 'text-ink/60 hover:bg-ink/5'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'modules' && <span className="ml-auto bg-ink text-bg px-1.5 py-0.5 text-[9px] rounded-sm">VISIO</span>}
            </button>
          ))}
        </div>
        <div className="p-5 border-t border-line text-[10px] uppercase font-mono text-ink/40">
          v1.0.4 r-pos-core
        </div>
      </nav>

      {/* Top Bar */}
      <header className="col-span-2 border-b border-line bg-[#EBEBE8] px-6 flex items-center justify-between">
        <div className="font-serif italic text-lg leading-tight">
          Retail Modular Monolith <span className="text-accent not-italic font-sans font-bold uppercase text-xs border border-line px-1.5 ml-2 bg-white">Specification</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="bg-white border border-line px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase shadow-[1px_1px_0_var(--color-line)]">.NET 8.0</span>
          <span className="bg-white border border-line px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase shadow-[1px_1px_0_var(--color-line)]">MULTI-TENANT</span>
          <span className="bg-white border border-line px-2.5 py-1 rounded-sm font-mono text-[10px] uppercase shadow-[1px_1px_0_var(--color-line)] text-accent">CLOUD AGNOSTIC</span>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="bg-[#F0EFEA] p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <TabContent id={activeTab} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Inspector Panel */}
      <aside className="row-span-2 border-l border-line bg-white flex flex-col">
        <div className="p-4 border-b border-line">
          <div className="font-serif italic text-xs mb-3 opacity-60">Technology Nuggets</div>
          <div className="space-y-1.5">
            {TECH_STACK.nugets.slice(0, 5).map((n, i) => (
              <span key={i} className="block font-mono text-[11px] bg-[#F4F4F4] border border-gray-300 px-2.5 py-1.5 leading-tight">
                {n}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 border-b border-line">
          <div className="font-serif italic text-xs mb-3 opacity-60">System Design Concepts</div>
          <p className="text-[11px] leading-relaxed text-ink/80">
            Architecture centered on <strong>Bounded Contexts</strong> with strict isolation. 
            <strong>Multi-tenancy</strong> resolved via <code>ITenantProvider</code> abstraction for maximum infrastructure flexibility.
          </p>
        </div>
        <div className="p-4 flex-1 flex flex-col justify-end">
          <div className="font-serif italic text-xs mb-2 opacity-60">Pipeline Status</div>
          <div className="font-mono text-[10px] text-accent uppercase leading-tight tracking-tighter">
            BUILD_CI -&gt; TEST_UNIT -&gt; ANALYZE_SAST -&gt; DISPATCH_PROD
          </div>
        </div>
      </aside>

      {/* Architecture Summary Footer */}
      <footer className="border-t border-line bg-white grid grid-cols-4">
        <div className="p-4 border-r border-line">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1 font-bold">Total Modules</span>
          <span className="font-mono text-lg font-bold">08</span>
        </div>
        <div className="p-4 border-r border-line">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1 font-bold">Interfaces</span>
          <span className="font-mono text-lg font-bold">34</span>
        </div>
        <div className="p-4 border-r border-line">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1 font-bold">Tenancy Mode</span>
          <span className="font-mono text-lg font-bold">HYBRID</span>
        </div>
        <div className="p-4">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1 font-bold">Status</span>
          <span className="font-mono text-lg font-bold text-green-600 flex items-center gap-2">
            READY <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </span>
        </div>
      </footer>
    </div>
  );
}

function TabContent({ id }: { id: string }) {
  switch (id) {
    case 'overview':
      return (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card title="Business Architecture" label="01_DOMAIN">
              Retail workflows: Catalog management, Sales engine, Customer loyalty, and multi-location logistics.
            </Card>
            <Card title="Agnostic Strategy" label="02_INFRA">
              Interface-based hardware and cloud integration for S3, Azure Bus, and multi-flavor SQL.
            </Card>
          </div>

          <div className="space-y-3 bg-white border border-line p-5">
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40 border-b border-line/10 pb-2">High Level System Map</h3>
            <Mermaid chart={DIAGRAMS.highLevelModule} id="hl-pos" />
          </div>
        </section>
      );
    case 'architecture':
      return (
        <section className="space-y-8">
          <div className="space-y-4 bg-white border border-line p-5">
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40 border-b border-line/10 pb-2">Business & Application Architecture (LLD)</h3>
            <Mermaid chart={DIAGRAMS.lowLevelModule} id="ll-module" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 bg-white border border-line space-y-2">
              <div className="text-accent font-bold font-mono text-[10px] border-b border-line/10 pb-1">API LAYER</div>
              <p className="text-[11px] text-ink/70 leading-normal">Rest Controllers, SignalR Hubs for real-time receipting.</p>
            </div>
            <div className="p-4 bg-white border border-line space-y-2">
              <div className="text-accent font-bold font-mono text-[10px] border-b border-line/10 pb-1">APPLICATION</div>
              <p className="text-[11px] text-ink/70 leading-normal">CQRS Handlers (MediatR), Domain Event Dispatchers.</p>
            </div>
            <div className="p-4 bg-white border border-line space-y-2">
              <div className="text-accent font-bold font-mono text-[10px] border-b border-line/10 pb-1">DOMAIN</div>
              <p className="text-[11px] text-ink/70 leading-normal">Aggregates (Order, Stock), Domain Services, Value Objects.</p>
            </div>
          </div>
        </section>
      );
    case 'modules':
      return (
        <section className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-3 bg-white border border-line p-5">
              <div className="flex items-center justify-between border-b border-line/10 pb-2">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40">High Level Interaction</h3>
                <span className="bg-ink text-bg px-1.5 py-0.5 text-[8px] font-mono">FLOW:01</span>
              </div>
              <Mermaid chart={DIAGRAMS.betweenModulesHL} id="between-hl" />
            </div>

            <div className="space-y-3 bg-white border border-line p-5">
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40 border-b border-line/10 pb-2">Low Level Integration</h3>
              <Mermaid chart={DIAGRAMS.betweenModulesLL} id="between-ll" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3 bg-white border border-line p-4">
                <h3 className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">In-Process (Sync)</h3>
                <Mermaid chart={DIAGRAMS.inProcessComm} id="in-proc" />
              </div>
              <div className="space-y-3 bg-white border border-line p-4">
                <h3 className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">Out-Process (Async)</h3>
                <Mermaid chart={DIAGRAMS.outProcessComm} id="out-proc" />
              </div>
            </div>
          </div>
        </section>
      );
    case 'tech':
      return (
        <section className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40 border-b border-line/10 pb-2">Core Architectures</h3>
              <div className="space-y-3">
                {TECH_STACK.concepts.map((c, i) => (
                  <div key={i} className="p-4 bg-white border border-line shadow-[2px_2px_0_var(--color-line)]">
                    <div className="text-ink font-bold font-serif italic text-base leading-tight">{c.title}</div>
                    <div className="text-[11px] text-ink/60 mt-1">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40 border-b border-line/10 pb-2">NuGet Ecosystem</h3>
                <div className="grid grid-cols-1 gap-2">
                  {TECH_STACK.nugets.map((n, i) => (
                    <div key={i} className="px-3 py-2 bg-white border border-line font-mono text-[10px] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                      {n}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink/40 border-b border-line/10 pb-2 font-bold">Infra Tools</h3>
                <div className="flex flex-wrap gap-2">
                  {TECH_STACK.tools.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 bg-ink text-bg text-[10px] uppercase font-mono border border-line">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    case 'tenancy':
      return (
        <section className="space-y-8">
          <div className="p-6 bg-white border-2 border-line shadow-[4px_4px_0_var(--color-line)]">
            <h2 className="font-serif italic text-xl mb-3">Multi-tenancy Strategy</h2>
            <p className="text-[12px] text-ink/80 leading-relaxed italic border-l-4 border-accent pl-4">
              "For high-density Retail POS, we recommend a **Shared Database / Shared Schema** approach using **Global Query Filters** in Entity Framework Core, or a **Shared Database / Dedicated Schema** for larger enterprise clients."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: 'Isolation', desc: 'Identity context per request injected via middleware.', icon: <Users size={20} /> },
              { title: 'Query Filters', desc: 'TenantId discriminator enforced at DB level.', icon: <Layers size={20} /> },
              { title: 'Migrations', desc: 'Shared schema updates with tenant-specific seeders.', icon: <Cloud size={20} /> }
            ].map((item, i) => (
              <div key={i} className="p-5 bg-white border border-line space-y-3">
                <div className="text-accent">{item.icon}</div>
                <h4 className="font-bold uppercase text-[10px] border-b border-line/10 pb-1">{item.title}</h4>
                <p className="text-[11px] text-ink/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      );
    case 'sdlc':
      return (
        <section className="space-y-6">
          <div className="bg-white border border-line p-8 shadow-[4px_4px_0_var(--color-line)]">
            <div className="markdown-body">
              <Markdown>{SDLC_PROMPT_FLOW}</Markdown>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-sm italic text-xs text-accent">
            <Terminal size={14} /> 
            PRO-TIP: Use these prompts sequentially in an AIS agent to build this exact architecture.
          </div>
        </section>
      );
    default:
      return null;
  }
}

function Card({ title, label, children }: { title: string, label: string, children: React.ReactNode }) {
  return (
    <div className="p-5 bg-white border border-line relative group hover:shadow-[3px_3px_0_var(--color-line)] transition-all">
      <span className="font-mono text-[9px] text-gray-400 mb-2 block tracking-widest">{label}</span>
      <h4 className="font-bold text-ink text-base border-b border-gray-100 pb-2 mb-3 tracking-tight font-serif italic">{title}</h4>
      <p className="text-[11px] text-ink/70 leading-relaxed">{children}</p>
      <div className="absolute top-2 right-2 w-1 h-1 bg-ink opacity-20"></div>
    </div>
  );
}
