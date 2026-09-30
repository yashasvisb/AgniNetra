import { useState } from "react";

import { LOGO_SOURCES } from "../lib/logo";

/**
 * The Agni Netra logo. Tries each candidate file in turn and falls
 * back to a plain "A" mark only if none of them exist.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  const src = LOGO_SOURCES[index];

  if (!src) {
    return (
      <span
        className={`brand-mark brand-mark--fallback ${className}`}
        aria-hidden="true"
      >
        A
      </span>
    );
  }

  return (
    <img
      className={`brand-mark ${className}`}
      src={src}
      alt="Agni Netra logo"
      onError={() => setIndex((current) => current + 1)}
    />
  );
}