/**
 * One plain-language line per stack item, written for someone who has never
 * written code. `kind` says what sort of thing it is.
 */
export const stackInfo: Record<string, { kind: string; what: string }> = {
  TypeScript: {
    kind: "Programming language",
    what: "JavaScript with a safety net: it checks your code for mistakes before it ever runs.",
  },
  JavaScript: {
    kind: "Programming language",
    what: "The language of the web. It's what makes pages react when you click, type or scroll.",
  },
  Python: {
    kind: "Programming language",
    what: "Reads almost like English. Popular for automation, data work and AI.",
  },
  Java: {
    kind: "Programming language",
    what: "A long-standing workhorse used for Android apps and large business systems.",
  },
  "C#": {
    kind: "Programming language",
    what: "Microsoft's main language, used for web apps, desktop software and games.",
  },
  "C++": {
    kind: "Programming language",
    what: "Fast and close to the hardware. Used for games, engines and operating systems.",
  },
  Rust: {
    kind: "Programming language",
    what: "As fast as C++, but built to prevent the memory bugs that crash programs.",
  },
  PHP: {
    kind: "Programming language",
    what: "Runs on the server to build web pages. A large share of websites still run on it.",
  },
  HTML: {
    kind: "Markup language",
    what: "The skeleton of every web page: headings, paragraphs, links, images.",
  },
  CSS: {
    kind: "Style language",
    what: "Controls how a page looks: colours, fonts, spacing, layout and animation.",
  },
  React: {
    kind: "Frontend library",
    what: "Builds interfaces out of small reusable pieces called components.",
  },
  "Next.js": {
    kind: "Web framework",
    what: "Built on React. Handles pages, loading speed and deployment. This site runs on it.",
  },
  "Tailwind CSS": {
    kind: "Styling toolkit",
    what: "Ready-made style building blocks you apply straight to the page.",
  },
  Bootstrap: {
    kind: "Styling toolkit",
    what: "Pre-designed buttons, forms and layouts for building pages quickly.",
  },
  Laravel: {
    kind: "Backend framework",
    what: "A PHP toolkit for the behind-the-scenes part of a site: logins, data, emails.",
  },
  "ASP.NET": {
    kind: "Backend framework",
    what: "Microsoft's toolkit for building websites and services with C#.",
  },
  SignalR: {
    kind: "Real-time library",
    what: "Pushes updates to everyone's screen instantly, with no need to refresh.",
  },
  Supabase: {
    kind: "Backend service",
    what: "A ready-made backend: database, logins and file storage without running your own server.",
  },
  "REST API": {
    kind: "Way of connecting apps",
    what: "A common set of rules that lets one program ask another for data over the internet.",
  },
  MySQL: {
    kind: "Database",
    what: "Stores information in tables, like a very large and very fast spreadsheet.",
  },
  PostgreSQL: {
    kind: "Database",
    what: "A powerful free database, known for being reliable with complex data.",
  },
  "SQL Server": {
    kind: "Database",
    what: "Microsoft's database, common in companies that build with C#.",
  },
  SQLite: {
    kind: "Database",
    what: "A whole database in a single small file. Lives inside phones and apps.",
  },
  "Neon (Postgres)": {
    kind: "Database hosting",
    what: "PostgreSQL in the cloud that switches itself on only when it's needed.",
  },
  Git: {
    kind: "Version control",
    what: "Saves every version of your code, so you can undo mistakes and work in teams.",
  },
  GitHub: {
    kind: "Code hosting",
    what: "A website where Git projects are stored, shared and worked on together.",
  },
  Vercel: {
    kind: "Hosting platform",
    what: "Puts websites on the internet. This site is hosted there.",
  },
  Render: {
    kind: "Hosting platform",
    what: "Runs web apps and databases in the cloud so anyone can reach them.",
  },
  "VS Code": {
    kind: "Code editor",
    what: "The program I write code in. Think of it as a word processor for programmers.",
  },
  "Visual Studio": {
    kind: "Development environment",
    what: "Microsoft's full workshop for building C# apps: write, run and debug in one place.",
  },
  xUnit: {
    kind: "Testing tool",
    what: "Runs automatic checks on my code, so a change that breaks something gets caught early.",
  },
  PowerShell: {
    kind: "Scripting language",
    what: "Automates Windows chores, like checking a PC's settings, with a short script.",
  },
  "Entity Framework Core": {
    kind: "Database toolkit",
    what: "Lets C# code save and load data without writing database queries by hand.",
  },
};
