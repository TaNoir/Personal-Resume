import type { Metadata, Viewport } from "next";
import { Big_Shoulders_Stencil, Chakra_Petch, Martian_Mono } from "next/font/google";
import { resume } from "@/content/resume";
import "./globals.css";

const display = Big_Shoulders_Stencil({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const body = Chakra_Petch({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: `${resume.name} — ${resume.title}`,
  description: `${resume.first} ${resume.last} (${resume.handle}) is a software developer in ${resume.location}. Stack, project, certificates and contact.`,
};

export const viewport: Viewport = {
  themeColor: "#0c0e0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
