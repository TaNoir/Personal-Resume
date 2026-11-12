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
      items: ["TypeScript", "JavaScript", "Python", "Java", "C#", "C++", "Rust", "PHP"],
    },
    {
      group: "frontend",
      items: ["HTML", "CSS", "React", "Next.js", "Tailwind CSS", "Bootstrap"],
    },
    { group: "backend", items: ["Laravel", "ASP.NET", "Supabase", "REST API"] },
    { group: "database", items: ["MySQL", "PostgreSQL", "SQLite", "Neon (Postgres)"] },
    { group: "devops & cloud", items: ["Git", "GitHub", "Vercel", "Render"] },
    { group: "tools", items: ["VS Code"] },
  ],
  projects: [
    {
      name: "MobileOps Connect",
      year: "2025",
      blurb:
        "A web app for running a vehicle fleet: manage the units, track their maintenance and keep compliance in order, all from one dashboard.",
      url: "https://moppscon.runasp.net/",
      host: "moppscon.runasp.net",
      tags: ["C#", "ASP.NET"],
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
