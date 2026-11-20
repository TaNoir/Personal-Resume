import type { Metadata } from "next";
import Link from "next/link";
import Pack404 from "@/components/Pack404";
import WipeGate from "@/components/WipeGate";

export const metadata: Metadata = {
  title: "404 — sector not found",
};

export default function NotFound() {
  return (
    <WipeGate>
      <div className="page lost">
        <Pack404 />
        {/* The pack lines up to spell 404 over this space. */}
        <div className="pack-anchor" data-pack-anchor aria-hidden="true" />
        <h1>
          <span className="sr-only">404: </span>Sector not found
        </h1>
        <p className="lost-copy">
          Whatever was here has rotted away, or it never existed. The pack is guarding what&apos;s left.
        </p>

        <pre className="lost-log" aria-hidden="true">
          {`$ cd /requested/page
  error: no such sector
  bad blocks ......... 1
  pack ............... awake`}
        </pre>

        <Link className="btn btn-solid" href="/">
          Back to the homepage
        </Link>
      </div>
    </WipeGate>
  );
}
