import type { Metadata, Viewport } from "next";
import { DotGothic16, Jacquard_12, Onest } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import DogRunner from "@/components/DogRunner";
import RotPlayer from "@/components/RotPlayer";
import Secrets from "@/components/Secrets";
import StarTrail from "@/components/StarTrail";
import Terminal from "@/components/Terminal";
import { resume } from "@/content/resume";
import "./globals.css";

const display = Jacquard_12({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const body = Onest({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const pixel = DotGothic16({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

const THEME_INIT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;
// The boot screen plays once per visit: later loads in the same tab skip it.
const BOOT_INIT = `try{if(sessionStorage.getItem("booted"))document.documentElement.dataset.booted="";else sessionStorage.setItem("booted","1")}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL("https://amorcillo.vercel.app"),
  title: `${resume.name} — ${resume.title}`,
  openGraph: { type: "website", siteName: resume.name },
  twitter: { card: "summary_large_image" },
  description: `${resume.first} ${resume.last} (${resume.handle}) is a software developer in ${resume.location}. Stack, project, certificates and contact.`,
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${pixel.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply a saved theme, and skip a boot screen already seen, before the
            first paint so the page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT + BOOT_INIT }} />
      </head>
      <body>
        {children}
        <RotPlayer />
        <StarTrail />
        <Secrets />
        <Terminal />
        <DogRunner />
        <Analytics />
      </body>
    </html>
  );
}
