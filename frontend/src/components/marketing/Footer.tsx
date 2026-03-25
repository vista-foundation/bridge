import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 bg-[#111] py-10 md:py-0 md:h-[198px] flex items-center">
      <div className="max-w-[1280px] mx-auto px-6 w-full flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        <Image
          src="/assets/logo.svg"
          alt="Vista"
          width={125}
          height={40}
        />
        <nav
          className="flex flex-wrap items-center justify-center gap-5 md:gap-[30px]"
          style={{ fontFamily: "'Raleway', sans-serif" }}
        >
          <Link
            href="/"
            className="text-[14px] font-bold text-white hover:opacity-80 transition-opacity"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-[14px] font-bold text-white hover:opacity-80 transition-opacity"
          >
            About
          </Link>
          <Link
            href="/docs"
            className="text-[14px] font-bold text-white hover:opacity-80 transition-opacity"
          >
            Documentation
          </Link>
          <Link
            href="/learn"
            className="text-[14px] font-bold text-white hover:opacity-80 transition-opacity"
          >
            Learn More
          </Link>
        </nav>
      </div>
    </footer>
  );
}
