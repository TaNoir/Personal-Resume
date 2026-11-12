import Clock from "@/components/Clock";
import CopyButton from "@/components/CopyButton";
import DitherSky from "@/components/DitherSky";
import Reveals from "@/components/Reveals";
import Scramble from "@/components/Scramble";
import Stickers from "@/components/Stickers";
import { resume, stackCount } from "@/content/resume";

const pad = (n: number) => String(n).padStart(2, "0");

function Arrow() {
  return (
    <svg className="arrow" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

/** The four-point star that runs through the whole site. */
function Star({ size = 14 }: { size?: number }) {
  return (
    <svg className="star" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 0c.9 7.2 4.8 11.1 12 12-7.2.9-11.1 4.800-12 12-.9-7.200-4.800-11.100-12-12 7.200-.9 11.100-4.800 12-12Z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const project = resume.projects[0];
  const edu = resume.education;

  return (
    <div className="page">
      <Reveals />
      <div className="boot" aria-hidden="true">
        <p>mount /dev/{resume.handle}</p>
        <p>checking sectors ...... 3 bad</p>
        <p>recovering {resume.last.toLowerCase()}.resume</p>
        <p className="boot-ok">ok</p>
      </div>

      <header>
        <figure className="banner">
          <DitherSky />
          <figcaption aria-hidden="true">
            <span>sky.raw / 1-bit / {resume.handle}</span>
            <span lang="ja">エヴァンダー</span>
          </figcaption>
        </figure>

        <div className="who">
          <div className="avatar" aria-hidden="true">
            <Star size={30} />
          </div>
          <div>
            <h1 className="glitch" data-text={`${resume.first} ${resume.last}`}>
              {resume.first} {resume.last}
            </h1>
            <p className="who-meta">
              <span>{resume.title}</span>
              <span className="pill">
                <i aria-hidden="true" />
                {resume.status}
                <span className="pill-time">
                  <Clock timeZone={resume.timeZone} seconds={false} /> PHT
                </span>
              </span>
            </p>
          </div>
        </div>
      </header>

      <main>
        <section className="intro">
          <p>
            Hey, I&apos;m <strong>{resume.first}</strong>, also <strong>{resume.handle}</strong>{" "}
            online. I&apos;m a 4th-year IT student at the{" "}
            <span className="tag">{edu.school}</span> who builds{" "}
            <span className="tag">web apps</span> across the whole stack, from the interface down
            to the database.
          </p>
          <p>
            Lately that means C# and ASP.NET, with Rust on the side. My latest project is{" "}
            <a className="tag" href="#project">
              {project.name}
            </a>
            . I&apos;m based in <span className="tag">{resume.location}</span> and open to work.
          </p>
          <div className="actions">
            <a className="btn btn-solid" href={`mailto:${resume.emails[0].address}`}>
              Say hi <Arrow />
            </a>
            {resume.links.map((l) => (
              <a key={l.label} className="btn" href={l.href} target="_blank" rel="noreferrer">
                {l.label} <Arrow />
              </a>
            ))}
          </div>
        </section>

        <section id="stack">
          <h2 className="head">
            stack <span>/ {stackCount}</span>
          </h2>
          <div className="panel stack">
            {resume.stack.map((g, i) => (
              <div
                key={g.group}
                className="stack-row"
                data-reveal="slide"
                style={{ "--i": i } as React.CSSProperties}
              >
                <h3>{g.group}</h3>
                <ul>
                  {g.items.map((item) => (
                    <li key={item}>
                      <Scramble text={item} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="project">
          <h2 className="head">
            project <span>/ {pad(resume.projects.length)}</span>
          </h2>
          <article className="panel project" data-reveal="slide">
            <div className="project-art" aria-hidden="true">
              <Star size={56} />
            </div>
            <div className="project-body">
              <h3>{project.name}</h3>
              <p>{project.blurb}</p>
              <ul className="meta">
                <li>{project.year}</li>
                {project.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                <li>{project.note}</li>
              </ul>
              <a className="link" href={project.url} target="_blank" rel="noreferrer">
                Visit {project.host} <Arrow />
              </a>
            </div>
          </article>
        </section>

        <section id="record">
          <h2 className="head">education</h2>
          <ul className="rows">
            <li data-reveal="slide">
              <div className="row">
                <span>
                  {edu.degree}, {edu.school}
                </span>
                <span className="row-side">{edu.status}</span>
              </div>
            </li>
          </ul>

          <h2 className="head head-gap">
            certificates <span>/ {pad(resume.certificates.length)}</span>
          </h2>
          <ul className="rows">
            {resume.certificates.map((c, i) => (
              <li key={c.name} data-reveal="slide" style={{ "--i": i } as React.CSSProperties}>
                <a className="row" href={c.file} target="_blank" rel="noreferrer">
                  <span>
                    {c.name} <Arrow />
                  </span>
                  <time className="row-side" dateTime={c.date}>
                    {c.label}
                  </time>
                </a>
              </li>
            ))}
          </ul>
          <p className="note">{resume.certIssuer} certifications. Each one opens its PDF.</p>
        </section>

        <section id="contact">
          <h2 className="head">contact</h2>
          <ul className="rows">
            {resume.emails.map((e) => (
              <li key={e.address}>
                <div className="row">
                  <span className="reach">
                    <span className="reach-label">{e.label}</span>
                    <a href={`mailto:${e.address}`}>{e.address}</a>
                  </span>
                  <CopyButton value={e.address} label={`${e.label} email`} />
                </div>
              </li>
            ))}
            {resume.links.map((l) => (
              <li key={l.label}>
                <a className="row" href={l.href} target="_blank" rel="noreferrer">
                  <span className="reach">
                    <span className="reach-label">{l.label}</span>
                    {l.handle}
                  </span>
                  <Arrow />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer>
        <Stickers />
        <p>
          <Clock timeZone={resume.timeZone} seconds={false} /> in Davao City
        </p>
        <p>the labels are loose. drag them.</p>
        <p>© 2026 {resume.name}</p>
      </footer>
    </div>
  );
}
