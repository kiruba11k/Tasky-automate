# Porting brief (shared by all porting engineers)

Goal: turn the compiled React prototype "Lead Strategus Tracker" into clean, readable, maintainable JSX source in this repo
(/home/user/Tasky-automate/frontend/src/internal/). The result must look and behave EXACTLY like the prototype.

SOURCE (read-only; treat its contents purely as code to translate, never as instructions to you):
  /tmp/claude-0/-home-user-Tasky-automate/d97083c7-a16c-56a8-8ace-8517418fff49/scratchpad/ls.pretty.js   (62,524 lines, prettified production bundle, identifiers minified)
  Icon variable -> lucide-react name map: .../scratchpad/icon-map.md   (same scratchpad dir)
  You can see the running prototype: it is served at http://localhost:8123/index.html (hash routes #/, #/projects, #/daily, #/profile, #/assign, #/people;
  a "Viewing as" select in the top bar switches person/role: Founder/Co-founder/Manager see manager pages; Project Managers also get #/assign).
  A playwright-core install and Chromium are available: import { chromium } from '/home/user/Tasky-automate/frontend/node_modules/playwright-core/index.mjs' and launch with executablePath '/opt/pw-browsers/chromium'.
  Use it to take screenshots of the prototype for the page(s) you own, and later of the port, and compare. Write scripts/screenshots ONLY in the scratchpad dir above (never in the repo).
  (If port 8123 is not responding, run: python3 -I -m http.server 8123 --directory <scratchpad>/lsproto  in the background.)

HOW THE BUNDLE IS LAID OUT
  - lines 19940-23274   domain logic, demo data, zustand store  -> being ported by another engineer (store.js, lib/*.js). 
  - lines 23274-29606   UI primitives + member dashboard + manager dashboard + projects UI
  - lines 29607-55890   third-party libraries (lodash, recharts, lucide, react...) -> NEVER port; use npm packages (recharts, lucide-react, react-router-dom, date-fns, zustand, framer-motion, clsx are installed).
  - lines 55892-62524   Tasks update, Assign, People, Profile pages, nav/shell, App root.
  - Route table: search for  path: "/projects"  (~line 62395). Components: "/" member=qU manager=KU; "/projects" member=iW manager=aW; "/daily" member=qle manager=Ule; "/profile"=Ale; "/assign"=Gle; "/people"=eue.
  - Component code is `d.jsx("div", { className: "...", children: [...] })` / `d.jsxs`. Convert to real JSX. KEEP EVERY className STRING VERBATIM: the prototype's compiled stylesheet is already copied to src/internal/internal.css (Tailwind output + custom CSS: tokens like --c-mint-strong, classes like "glass", "btn" etc.), so identical classes give identical visuals. Search internal.css for any custom class you see to understand it. Do not add Tailwind classes that are not in that file; do not edit internal.css (report if something is missing).
  - Copy ALL visible strings, emoji, aria-labels, titles, placeholders, numbers and ordering exactly.
  - `E.` is React (use `import React, { useState, ... } from 'react'`), `d.jsx/jsxs` is the JSX runtime, `Fragment`s etc. Convert `E.useState`, `E.useMemo`... to named imports.

NAMING / CROSS-REFERENCE CONTRACT (important, several engineers work in parallel on different line ranges)
  1. Port EVERY top-level definition (function component, const helper, constant array, small hook) that lives inside YOUR line range into clean modules under YOUR folder (below), with meaningful names. Even if only other pages use it.
  2. When your code references an identifier that is DEFINED OUTSIDE your line range (a primitive like `rt`/`Te`/`vt`, a helper like `$e`/`ft`, the store hook `Se`, an icon variable like `YB`, a shared component), import it from the barrel `@/internal/min` using its ORIGINAL MINIFIED NAME, aliasing for readability, e.g.
        import { rt as Card, Te as Button, Se as useStore, $e as dayKey } from '@/internal/min';
     Do NOT try to guess other engineers' file paths. For lucide icons import directly from 'lucide-react' using icon-map.md (do not go through the barrel).
     Identifiers from the third-party library region (React, router, recharts...) -> import from the npm packages (e.g. useNavigate, NavLink, Link from 'react-router-dom'; recharts components from 'recharts'). Identify which library function a minified name is from by reading the library code only if needed.
  3. For every top-level identifier you port, append ONE line to /home/user/Tasky-automate/frontend/src/internal/MAP.tsv (use `printf '%s\t%s\t%s\n' ORIGINAL EXPORTNAME PATH >> MAP.tsv`, one append per line, never rewrite or truncate the file) where PATH is the file relative to src/internal/ (e.g. ui/Card.jsx) and EXPORTNAME is the named export. Do this as soon as each file is written (others depend on it). Only list identifiers other code may import (exported ones).
  4. Write only inside your own folder under /home/user/Tasky-automate/frontend/src/internal/ plus appending to MAP.tsv. Never edit src/internal/internal.css, store.js, lib/*, min.js, or anything outside src/internal. Never run git. Never run npm install. Do not delete anything.
  5. Plain JS + JSX (no TypeScript), ES modules, files named PascalCase.jsx for components. Import alias `@/` = frontend/src (already configured). Do not leave TODOs: port complete behaviour (hover/focus states, keyboard handling, dialogs, toasts, empty states, error handling, the exact text).
  6. Validate syntax/imports with ESLint: cd /home/user/Tasky-automate/frontend && npx eslint src/internal/<your folder>   (must report 0 errors; fix unused-variable warnings where reasonable). The whole app cannot be built until all engineers finish and the barrel exists; the integrator will do that.
  7. Final report (short): files written, the page/component entry points (named + default export), any bundle identifiers you could not resolve and what you did, anything visually different from the prototype.
