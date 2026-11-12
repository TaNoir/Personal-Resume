import type { Metadata, Viewport } from "next";
import { DotGothic16, Jacquard_12, Onest } from "next/font/google";
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

export const metadata: Metadata = {
  title: `${resume.name} — ${resume.title}`,
  description: `${resume.first} ${resume.last} (${resume.handle}) is a software developer in ${resume.location}. Stack, project, certificates and contact.`,
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${pixel.variable}`}>
      <body>{children}</body>
    </html>
  );
}
