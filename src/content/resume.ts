export const resume = {
  name: "Evander Harold S. Amorcillo",
  first: "Evander",
  middle: "Harold S.",
  last: "Amorcillo",
  handle: "null.rot",
  title: "Software Developer",
  location: "Davao City, Philippines",
  timeZone: "Asia/Manila",
  status: "Open to work",
  intro: [
    "I'm Evander, a software developer from Davao City and a 4th-year IT student at the University of Mindanao.",
    "I build web apps across the whole stack, from the interface down to the database. Lately that means C# and ASP.NET, with Rust on the side.",
  ],
  stack: [
    {
      group: "languages",
      items: ["TypeScript", "JavaScript", "Python", "Java", "C#", "C++", "Rust", "PHP", "PowerShell"],
    },
    {
      group: "frontend",
      items: ["HTML", "CSS", "React", "Next.js", "Tailwind CSS", "Bootstrap", "Canvas API", "PWA"],
    },
    {
      group: "backend",
      items: ["Node.js", "Laravel", "ASP.NET", "Entity Framework Core", "SignalR", "Supabase", "REST API"],
    },
    {
      group: "database",
      items: ["MySQL", "PostgreSQL", "SQL Server", "SQLite", "Neon (Postgres)", "Upstash (Redis)", "IndexedDB"],
    },
    { group: "ai", items: ["Google Gemini", "Groq"] },
    { group: "devops & cloud", items: ["Git", "GitHub", "Vercel", "Render"] },
    { group: "tools", items: ["VS Code", "Visual Studio", "xUnit"] },
  ],
  projects: [
    {
      name: "Kadr",
      year: "2026",
      blurb:
        "Upload a photo and Kadr finds the shot hiding inside it. Two AIs race to pick the strongest crop, a virtual camera glides and zooms onto it, and a small film studio finishes it with looks and borders, exported at full resolution. It's plain JavaScript with no dependencies, installs as an app, and gives guests a few free scans a day.",
      url: "https://kadrph.vercel.app/",
      host: "kadrph.vercel.app",
      tags: ["JavaScript", "Node.js", "Google Gemini", "Groq", "Upstash Redis", "Canvas API", "PWA"],
      note: "Live, 5 free AI scans a day",
    },
    {
      name: "MobileOps Connect",
      year: "2025",
      blurb:
        "An ERP web app for day-to-day operations: warehouse stock and purchase orders, payroll with PDF payslips, accounting and leave requests, all behind role-based access. Stock changes reach every user live, and it installs as an app with push notifications.",
      url: "https://moppscon.runasp.net/",
      host: "moppscon.runasp.net",
      tags: ["C#", "ASP.NET Core MVC", "SQL Server", "SignalR", "Tailwind CSS", "PWA"],
      note: "Live, behind a login",
    },
  ],
  education: {
    degree: "BS Information Technology",
    school: "University of Mindanao",
    place: "Davao City",
    status: "4th year",
  },
  certificates: [
    {
      name: "Network Security",
      date: "2026-07-15",
      label: "Jul 15, 2026",
      file: "/certs/network-security.pdf",
    },
    {
      name: "Networking",
      date: "2025-12-16",
      label: "Dec 16, 2025",
      file: "/certs/networking.pdf",
    },
    {
      name: "Databases",
      date: "2025-10-01",
      label: "Oct 1, 2025",
      file: "/certs/databases.pdf",
    },
  ],
  certIssuer: "Certiport IT Specialist",
  emails: [
    { label: "personal", address: "evanderamorcillo@gmail.com" },
    { label: "school", address: "e.amorcillo.543871@umindanao.edu.ph" },
  ],
  links: [
    { label: "GitHub", handle: "TaNoir", href: "https://github.com/TaNoir" },
    {
      label: "LinkedIn",
      handle: "evander-harold-amorcillo",
      href: "https://www.linkedin.com/in/evander-harold-amorcillo-183a77381/",
    },
  ],
} as const;

export const stackCount = resume.stack.reduce((n, g) => n + g.items.length, 0);
