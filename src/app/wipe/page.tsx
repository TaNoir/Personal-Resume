import type { Metadata } from "next";
import Link from "next/link";
import WipeWall from "@/components/WipeWall";

// The owner's page for clearing the pixel wall. Not linked anywhere and kept
// out of search results; the token is what actually protects it.
export const metadata: Metadata = {
  title: "wall controls",
  robots: { index: false, follow: false },
};

export default function Wipe() {
  return (
    <div className="page lost">
      <p className="lost-code" aria-hidden="true">
        wall
      </p>
      <h1>Wall controls</h1>
      <p className="lost-copy">For the owner only. Clears every pixel on the footer wall for everyone.</p>
      <WipeWall />
      <Link className="link" href="/">
        Back to the homepage
      </Link>
    </div>
  );
}
