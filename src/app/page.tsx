import Clock from "@/components/Clock";
import CopyButton from "@/components/CopyButton";
import Reveals from "@/components/Reveals";
import RotField from "@/components/RotField";
import Scramble from "@/components/Scramble";
import Stickers from "@/components/Stickers";
import { resume, stackCount } from "@/content/resume";

const pad = (n: number) => String(n).padStart(2, "0");

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

const TAPE = [resume.status, resume.title, resume.location, resume.handle];

export default function Home() {
  const project = resume.projects[0];

  return (
    <>
      <Reveals />
      <div className="boot" aria-hidden="true">
        <p>mount /dev/{resume.handle}</p>
        <p>checking sectors ...... 3 bad</p>
        <p>recovering {resume.last.toLowerCase()}.resume</p>
        <p className="boot-ok">ok</p>
      </div>

      <header className="banner">
        <RotField />
        <div className="banner-bar">
          <span className="tape-label">{resume.handle}</span>
          <nav aria-label="Sections">
            <a href="#stack">stack</a>
            <a href="#project">project</a>
            <a href="#record">record</a>
            <a href="#contact">contact</a>
          </nav>
        </div>
        <h1 className="name" aria-label={resume.name}>
          <span className="glitch" data-text={resume.first}>
            {resume.first}
          </span>
          <span className="name-mid">{resume.middle}</span>
          <span className="glitch glitch-late" data-text={resume.last}>
            {resume.last}
          </span>
        </h1>
      </header>

      <div className="tape" aria-hidden="true">
        <div className="tape-run">
          {[0, 1, 2, 3].map((k) => (
            <span key={k}>
              {TAPE.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <main>
        <section className="intro wrap">
          <div className="intro-copy">
            {resume.intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <div className="actions">
              <a className="btn btn-solid" href={`mailto:${resume.emails[0].address}`}>
                Email me <Arrow />
              </a>
              {resume.links.map((l) => (
                <a key={l.label} className="btn" href={l.href} target="_blank" rel="noreferrer">
                  {l.label} <Arrow />
                </a>
              ))}
            </div>
          </div>
          <dl className="sheet">
            <div>
              <dt>role</dt>
              <dd>{resume.title}</dd>
            </div>
            <div>
              <dt>base</dt>
              <dd>{resume.location}</dd>
            </div>
            <div>
              <dt>local time</dt>
              <dd>
                <Clock timeZone={resume.timeZone} /> PHT
              </dd>
            </div>
            <div>
              <dt>status</dt>
              <dd className="status">
                <i aria-hidden="true" />
                {resume.status}
              </dd>
            </div>
          </dl>
        </section>

        <section id="stack" className="wrap">
          <h2 className="head" data-reveal="wipe">
            stack <span>/ {stackCount}</span>
          </h2>
          <div className="stack">
            {resume.stack.map((g, i) => (
              <div
                key={g.group}
                className="stack-row"
                data-reveal="slide"
                style={{ "--i": i } as React.CSSProperties}
              >
                <h3>
                  {g.group} <span>{pad(g.items.length)}</span>
                </h3>
                <ul>
                  {g.items.map((item) => (
                    <li key={item} tabIndex={-1}>
                      <Scramble text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="project" className="flyer">
          <div className="wrap">
            <h2 className="head head-ink" data-reveal="wipe">
              project <span>/ {pad(resume.projects.length)}</span>
            </h2>
            <div className="flyer-body">
              <h3 className="flyer-title" data-reveal="stamp">{project.name}</h3>
              <div className="flyer-side">
                <p>{project.blurb}</p>
                <ul className="flyer-tags">
                  <li>{project.year}</li>
                  {project.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                  <li>{project.note}</li>
                </ul>
                <a className="btn btn-ink" href={project.url} target="_blank" rel="noreferrer">
                  {project.host} <Arrow />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="record" className="wrap record">
          <div>
            <h2 className="head" data-reveal="wipe">education</h2>
            <div className="school">
              <p className="school-name">{resume.education.school}</p>
              <p>{resume.education.degree}</p>
              <p className="dim">
                {resume.education.place} · {resume.education.status}
              </p>
            </div>
          </div>
          <div>
            <h2 className="head" data-reveal="wipe">
              certificates <span>/ {pad(resume.certificates.length)}</span>
            </h2>
            <ul className="certs">
              {resume.certificates.map((c, i) => (
                <li key={c.name} data-reveal="slide" style={{ "--i": i } as React.CSSProperties}>
                  <a href={c.file} target="_blank" rel="noreferrer">
                    <span className="cert-name">{c.name}</span>
                    <time dateTime={c.date}>{c.label}</time>
                    <span className="cert-open">
                      PDF <Arrow />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="dim certs-note">{resume.certIssuer} certifications</p>
          </div>
        </section>
      </main>

      <footer id="contact" className="contact">
        <Stickers />
        <div className="wrap">
          <h2 className="contact-title" data-reveal="track">
            Got work?
            <br />
            Say hi.
          </h2>
          <ul className="reach" data-reveal="slide">
            {resume.emails.map((e) => (
              <li key={e.address}>
                <span className="reach-label">{e.label} email</span>
                <a href={`mailto:${e.address}`}>{e.address}</a>
                <CopyButton value={e.address} label={`${e.label} email`} />
              </li>
            ))}
            {resume.links.map((l) => (
              <li key={l.label}>
                <span className="reach-label">{l.label}</span>
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.handle} <Arrow />
                </a>
              </li>
            ))}
          </ul>
          <p className="colophon">
            <span>
              <Clock timeZone={resume.timeZone} seconds={false} /> in Davao City
            </span>
            <span>the labels are loose. drag them.</span>
            <span>© 2026 {resume.name}</span>
          </p>
        </div>
      </footer>
    </>
  );
}
