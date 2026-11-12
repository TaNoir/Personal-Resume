import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — sector not found",
};

export default function NotFound() {
  return (
    <div className="page lost">
      <div className="lost-dog" aria-hidden="true">
        <div className="dog">
          {/* eslint-disable @next/next/no-img-element */}
          <img className="dog-head" src="/dog.png" alt="" width={360} height={360} />
          <img className="dog-jaw" src="/dog.png" alt="" width={360} height={360} />
          {/* eslint-enable @next/next/no-img-element */}
        </div>
      </div>

      <p className="lost-code" aria-hidden="true">
        404
      </p>
      <h1>Sector not found</h1>
      <p className="lost-copy">
        Whatever was here has rotted away, or it never existed. The dog is guarding what&apos;s left.
      </p>

      <pre className="lost-log" aria-hidden="true">
        {`$ cd /requested/page
  error: no such sector
  bad blocks ......... 1
  guard dog .......... awake`}
      </pre>

      <Link className="btn btn-solid" href="/">
        Back to the homepage
      </Link>
    </div>
  );
}
