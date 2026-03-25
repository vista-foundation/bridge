"use client";

import { use } from "react";
import DocsLayout from "@/components/marketing/DocsLayout";
import { getDocBySlug, getDefaultDoc, DOC_CATEGORIES } from "@/lib/marketing/docs/content";

// Build flat slug list for prev/next navigation
const allSlugs = DOC_CATEGORIES.flatMap((cat) =>
  cat.sections.map((s) => s.slug)
);

export default function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = use(params);
  const slugStr = slug?.[0] ?? "";

  const doc = slugStr ? getDocBySlug(slugStr) : getDefaultDoc();

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-[48px] font-bold text-white mb-4"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            404
          </h1>
          <p
            className="text-[#a1a1a1] text-[16px] mb-6"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Documentation page not found
          </p>
          <a
            href="/docs"
            className="text-[#f85858] hover:underline text-[14px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            ← Back to Documentation
          </a>
        </div>
      </div>
    );
  }

  return <DocsLayout currentDoc={doc} allSlugs={allSlugs} />;
}
