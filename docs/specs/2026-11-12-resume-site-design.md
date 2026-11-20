# Resume Site Design

## Intent
A one-page personal resume site for Evander Harold S. Amorcillo, a 4th-year BSIT student at the University of Mindanao looking for software developer work. Readers are recruiters and potential clients who skim. It should feel like him (cybergrunge) and be a pleasure to look at, with rich animation, while the text stays easy to read.

## Goals
- One dark page modelled on the structure of krystuff.vercel.app: banner, intro, stack, project, education, certificates, contact.
- Cybergrunge look: near-black, acid green plus one harsh accent, mono and distressed display type, grain, scanlines, glitch.
- Animation throughout: boot/intro sequence, glitch on the name, scroll reveals, hover states, live clock, an interactive toy.
- Works on phones; respects reduced-motion.

## Non-goals
- No blog, CMS, contact form or backend.
- No GitHub contribution graph (profile has no public repos).

## Anti-goals
- Effects that make body text hard to read.
- A copy of the friend's site.

## Approaches
1. **Next.js + TypeScript + Tailwind on Vercel (chosen).** Matches the friend's stack and Evander's own listed skills, so the site is itself proof of them.
2. Plain HTML/CSS/JS. Simplest, but demonstrates nothing from his stack.

## Content
- Name: Evander Harold S. Amorcillo. Handle: `null.rot` (GitHub display name). Title: Software Developer. Location: Davao City, Philippines (clock in Asia/Manila).
- Stack
  - languages: TypeScript, JavaScript, Python, Java, C#, C++, Rust, PHP
  - frontend: HTML, CSS, React, Next.js, Tailwind CSS, Bootstrap
  - backend: Laravel, ASP.NET, Supabase, REST API
  - database: MySQL, PostgreSQL, SQLite, Neon (Postgres)
  - devops & cloud: Git, GitHub, Vercel, Render
  - tools: VS Code
- Project: MobileOps Connect (2025), https://moppscon.runasp.net/ — fleet, maintenance and compliance management web app built on ASP.NET. Description is provisional until Evander supplies his own.
- Education: BS Information Technology, University of Mindanao, Davao City, 4th year.
- Certificates (Certiport IT Specialist): Databases, Oct 1 2025; Networking, Dec 16 2025; Network Security, Jul 15 2026. Each links to its PDF.
- Links: github.com/TaNoir, linkedin.com/in/evander-harold-amorcillo-183a77381, evanderamorcillo@gmail.com, e.amorcillo.543871@umindanao.edu.ph.

## Left to the builder
Exact palette, fonts, banner art, animation details, the interactive toy.
