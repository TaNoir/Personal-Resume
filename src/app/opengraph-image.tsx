import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { resume } from "@/content/resume";

export const alt = `${resume.name}, ${resume.title} in ${resume.location}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STAR =
  "M12 0c.9 7.2 4.8 11.1 12 12-7.2.9-11.1 4.8-12 12-.9-7.2-4.8-11.1-12-12 7.2-.9 11.1-4.8 12-12Z";

function Star({ size, color, left, top }: { size: number; color: string; left: number; top: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ position: "absolute", left, top }}
    >
      <path d={STAR} fill={color} />
    </svg>
  );
}

/** The preview card shown when the site's link is pasted into a chat or post. */
export default async function Image() {
  const root = process.cwd();
  const [display, pixel, dog] = await Promise.all([
    readFile(join(root, "src/assets/Jacquard12-Regular.ttf")),
    readFile(join(root, "src/assets/DotGothic16-Regular.ttf")),
    readFile(join(root, "public/dog.png")),
  ]);
  const dogSrc = `data:image/png;base64,${dog.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 80px",
          background: "#0b0b0c",
          backgroundImage: "radial-gradient(circle, #1c3566 1.5px, transparent 2px)",
          backgroundSize: "14px 14px",
          color: "#ededee",
          position: "relative",
        }}
      >
        <Star size={120} color="#5b9bff" left={1010} top={40} />
        <Star size={46} color="#dceaff" left={930} top={170} />
        <Star size={64} color="#dceaff" left={1080} top={470} />

        <div
          style={{
            display: "flex",
            width: 360,
            height: 360,
            flexShrink: 0,
            background: "#dceaff",
            border: "2px solid #27272b",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dogSrc} width={360} height={360} alt="" style={{ objectFit: "cover" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Pixel",
              fontSize: 26,
              color: "#5b9bff",
              letterSpacing: 2,
            }}
          >
            {resume.handle} / {resume.status.toLowerCase()}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Display",
              fontSize: 112,
              lineHeight: 0.92,
              marginTop: 18,
            }}
          >
            <span>{resume.first}</span>
            <span>{resume.last}</span>
          </div>
          <div style={{ display: "flex", fontFamily: "Pixel", fontSize: 30, marginTop: 28, color: "#94949b" }}>
            {resume.title} · {resume.location}
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontFamily: "Pixel",
              fontSize: 26,
              marginTop: 30,
              padding: "8px 16px",
              background: "#dceaff",
              color: "#09090b",
            }}
          >
            amorcillo.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, style: "normal", weight: 400 },
        { name: "Pixel", data: pixel, style: "normal", weight: 400 },
      ],
    },
  );
}
