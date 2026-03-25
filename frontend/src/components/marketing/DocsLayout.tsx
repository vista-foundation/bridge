"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DOC_CATEGORIES, type DocSection } from "@/lib/marketing/docs/content";

interface DocsLayoutProps {
  currentDoc: DocSection;
  allSlugs: string[];
}

export default function DocsLayout({ currentDoc, allSlugs }: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Close sidebar by default on mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Find current index for prev/next navigation
  const currentIndex = allSlugs.indexOf(currentDoc.slug);
  const prevSlug = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;

  // Find titles for prev/next
  const findTitle = (slug: string) => {
    for (const cat of DOC_CATEGORIES) {
      const section = cat.sections.find((s) => s.slug === slug);
      if (section) return section.title;
    }
    return slug;
  };

  // Filter sections by search
  const filteredCategories = searchQuery.trim()
    ? DOC_CATEGORIES.map((cat) => ({
        ...cat,
        sections: cat.sections.filter((s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((cat) => cat.sections.length > 0)
    : DOC_CATEGORIES;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-[56px] bg-[#0c0c0c] border-b border-[#1e1e1e] flex items-center px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#1c1c1c] transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="#a1a1a1" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/assets/logo.svg" alt="Vista" width={90} height={28} priority />
          </Link>
          <span className="text-[#555] text-[13px] ml-1">/ Docs</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-[13px] text-[#a1a1a1] hover:text-white transition-colors"
          >
            Back to Home
          </Link>
          <a
            href="https://github.com/Agrow-Labs/vista-bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#1c1c1c] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="#a1a1a1">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </header>

      <div className="flex pt-[56px] min-h-screen">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-[56px] left-0 bottom-0 w-[260px] bg-[#0c0c0c] border-r border-[#1e1e1e] overflow-y-auto transition-transform duration-200 z-40 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <circle cx="6" cy="6" r="4.5" stroke="#555" strokeWidth="1.2" />
                <path d="M9.5 9.5L12.5 12.5" stroke="#555" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141414] border border-[#252525] rounded-md text-[13px] text-white placeholder-[#555] pl-8 pr-3 py-[7px] outline-none focus:border-[#f85858]/50 transition-colors"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-2 pb-6">
            {filteredCategories.map((category) => (
              <div key={category.name} className="mb-4">
                <h3 className="text-[11px] font-semibold text-[#666] uppercase tracking-wider px-2 mb-1.5">
                  {category.name}
                </h3>
                <ul>
                  {category.sections.map((section) => {
                    const isActive = section.slug === currentDoc.slug;
                    return (
                      <li key={section.slug}>
                        <Link
                          href={`/docs/${section.slug}`}
                          onClick={() => {
                            if (typeof window !== "undefined" && window.innerWidth < 768) {
                              setSidebarOpen(false);
                            }
                          }}
                          className={`block text-[13px] px-2 py-[6px] rounded-md transition-colors ${
                            isActive
                              ? "bg-[#f85858]/10 text-[#f85858] font-medium"
                              : "text-[#a1a1a1] hover:text-white hover:bg-[#1c1c1c]"
                          }`}
                        >
                          {section.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-200 ${
            sidebarOpen ? "md:ml-[260px]" : "ml-0"
          }`}
        >
          <div className="max-w-[780px] mx-auto px-4 md:px-8 py-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[12px] text-[#555] mb-6">
              <Link href="/docs" className="hover:text-[#a1a1a1] transition-colors">
                Docs
              </Link>
              <span>/</span>
              <span className="text-[#888]">{currentDoc.category}</span>
              <span>/</span>
              <span className="text-white">{currentDoc.title}</span>
            </div>

            {/* Markdown Content */}
            <article className="docs-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentDoc.content}
              </ReactMarkdown>
            </article>

            {/* Prev / Next Navigation */}
            <div className="mt-12 pt-6 border-t border-[#1e1e1e] flex items-center justify-between">
              {prevSlug ? (
                <Link
                  href={`/docs/${prevSlug}`}
                  className="group flex flex-col items-start gap-0.5"
                >
                  <span className="text-[11px] text-[#555] group-hover:text-[#888] transition-colors">
                    ← Previous
                  </span>
                  <span className="text-[14px] text-[#a1a1a1] group-hover:text-white transition-colors">
                    {findTitle(prevSlug)}
                  </span>
                </Link>
              ) : (
                <div />
              )}
              {nextSlug ? (
                <Link
                  href={`/docs/${nextSlug}`}
                  className="group flex flex-col items-end gap-0.5"
                >
                  <span className="text-[11px] text-[#555] group-hover:text-[#888] transition-colors">
                    Next →
                  </span>
                  <span className="text-[14px] text-[#a1a1a1] group-hover:text-white transition-colors">
                    {findTitle(nextSlug)}
                  </span>
                </Link>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
