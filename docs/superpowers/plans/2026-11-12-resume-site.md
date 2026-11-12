# Resume Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page cybergrunge resume site for Evander Amorcillo.

**Architecture:** Next.js App Router, a single statically rendered route. All resume content lives in one typed data file; sections are server components; anything animated or interactive is a small client component. Effects are CSS and canvas, no animation library.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, next/font.

**Spec:** `docs/superpowers/specs/2026-11-12-resume-site-design.md`

## Global Constraints
- Body text contrast at least 4.5:1; effects never sit on top of paragraph text.
- All motion disabled or reduced under `prefers-reduced-motion: reduce`.
- No horizontal scroll at 375px width.
- Content strings come only from `src/content/resume.ts`.
- Clock uses the `Asia/Manila` time zone regardless of the visitor's.

## Review Focus
- Reduced-motion visitor: page fully readable, nothing hidden waiting on an animation.
- JavaScript disabled or slow: all content present in the server HTML.
- 375px phone: stack chips wrap, banner scales, no overflow.
- Clock hydration: no server/client mismatch warning.
- Certificate links: each opens the right PDF.

---

### Task 1: Scaffold and content
**Files:** Create the Next.js project at the repo root; `src/content/resume.ts`; move `cert*.pdf` to `public/certs/` as `databases.pdf`, `networking.pdf`, `network-security.pdf`.

**Interfaces — Produces:** `resume` object with `name`, `handle`, `title`, `location`, `timeZone`, `intro`, `stack: {group: string; items: string[]}[]`, `projects: {name; year; blurb; url; tags}[]`, `education: {school; degree; place; status}[]`, `certificates: {name; issuer; date; file}[]`, `links: {label; href}[]`.

- [ ] Scaffold with create-next-app (TypeScript, Tailwind, App Router, src dir, ESLint).
- [ ] Write `resume.ts` with the spec's content verbatim.
- [ ] Run `npm run build`; expected: succeeds.
- [ ] Commit.

### Task 2: Page, sections and visual system
**Files:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/components/{Banner,Intro,Stack,Project,Education,Certificates,Contact,SectionHeading}.tsx`.

**Interfaces — Consumes:** `resume` from Task 1.

- [ ] Define colour, type and texture tokens in `globals.css`; load fonts in `layout.tsx` with page metadata.
- [ ] Build each section as a server component reading from `resume`.
- [ ] Run `npm run build` and `npm run lint`; expected: both pass.
- [ ] View at 375px and desktop widths; expected: no overflow, text readable.
- [ ] Commit.

### Task 3: Motion and interaction
**Files:** `src/components/{GlitchText,Reveal,Clock,BannerCanvas,BootSequence,Toy}.tsx`, additions to `globals.css`.

- [ ] Glitch effect on the name, scroll-in reveals, hover states on chips and cards.
- [ ] `Clock` renders after mount only, formatted in `Asia/Manila`.
- [ ] Animated banner canvas and a short boot sequence that can be skipped and never blocks content.
- [ ] One interactive toy in the footer.
- [ ] Reduced-motion media query turns all of the above off or static.
- [ ] Run `npm run build` and `npm run lint`; expected: both pass. Check the browser console; expected: no errors or hydration warnings.
- [ ] Commit.
