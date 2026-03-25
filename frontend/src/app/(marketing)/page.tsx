import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/marketing/Footer";
import ArrowIcon from "@/components/marketing/ArrowIcon";
import SolarSystemBackground from "@/components/SolarSystemBackground";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] overflow-hidden" style={{ fontFamily: "'Raleway', sans-serif" }}>
      <SolarSystemBackground variant="full" />
      <Header />

      {/* ─── Block 1 : Hero ──────────────────────────────────────── */}
      <section className="relative min-h-[420px] md:h-[713px] overflow-hidden">
        {/* Glow behind text */}
        <div className="absolute left-1/2 top-[200px] -translate-x-1/2 w-[600px] h-[230px] bg-[radial-gradient(ellipse_at_center,rgba(248,88,88,0.08)_0%,transparent_70%)]" />

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center pt-[80px] md:pt-[100px] px-5">
          {/* Lightning icon */}
          <div className="mb-4">
            <svg width="22" height="28" viewBox="0 0 22 28" fill="none">
              <path d="M12.5 1L1 16H11L9.5 27L21 12H11L12.5 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <div className="w-[200px] h-[1px] bg-gradient-to-r from-transparent via-[#555] to-transparent mx-auto mt-2" />
          </div>

          <h1 className="text-[28px] md:text-[48px] font-black text-white leading-[1.1] tracking-tight">
            Open-Source <span className="text-[#f85858]">Cross-Chain</span><br />
            Bridge Protocol
          </h1>

          <p className="mt-3 text-[16px] md:text-[18px] font-medium text-[#cecece] max-w-[500px] leading-relaxed">
            Move assets seamlessly between blockchains
            with a fully transparent and open-source bridge
          </p>

          {/* CTA Button */}
          <Link
            href="/docs"
            className="mt-8 inline-flex items-center gap-[6px] bg-white text-[#121212] font-bold text-[14px] px-[25px] py-[12px] rounded-full hover:bg-gray-100 transition-colors"
          >
            Read Docs
            <ArrowIcon />
          </Link>
        </div>
      </section>

      {/* ─── Block 2 : Features ──────────────────────────────────── */}
      <section id="features" className="relative bg-black border-t border-b border-white/10 py-[50px]">
        {/* Section title */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <h2 className="text-[24px] font-bold text-white">Features</h2>
          <svg width="27" height="27" viewBox="0 0 27 27" fill="none">
            <path d="M13.5 1L15.5 10.5L24 8L17 13.5L24 19L15.5 16.5L13.5 26L11.5 16.5L3 19L10 13.5L3 8L11.5 10.5L13.5 1Z" fill="#f85858" opacity="0.8" />
          </svg>
        </div>

        {/* Feature cards */}
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-center gap-4 md:gap-6">
          {/* Open-Source */}
          <div className="relative w-full md:w-[396px] h-[138px] rounded-[15px] overflow-hidden bg-gradient-to-b from-[#2f2f2f] to-[#090808] border border-[rgba(79,79,79,0.3)]">
            <div className="absolute left-[25px] top-[37px]">
              <h3 className="text-[18px] font-bold text-white">Open-Source</h3>
              <p className="text-[16px] font-medium text-[#888] mt-2 leading-snug">
                We embrace transparency<br />and community collaboration
              </p>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[160px] h-[160px] opacity-80">
              <Image src="/assets/home/icon-opensource.png" alt="" fill className="object-contain" />
            </div>
          </div>

          {/* Secure & Reliable */}
          <div className="relative w-full md:w-[396px] h-[138px] rounded-[15px] overflow-hidden bg-gradient-to-b from-[#181818] to-[#0b0b0b]">
            <div className="absolute left-[25px] top-[37px]">
              <h3 className="text-[18px] font-bold text-white">Secure &amp; Reliable</h3>
              <p className="text-[16px] font-medium text-[#888] mt-2 leading-snug">
                Engineered to prioritize<br />security and reliability
              </p>
            </div>
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-[160px] h-[170px]">
              {/* Lock icon placeholder */}
              <svg viewBox="0 0 120 140" fill="none" className="w-full h-full opacity-80">
                <rect x="20" y="55" width="80" height="70" rx="12" fill="url(#lockGrad)" />
                <path d="M40 55V40C40 26.745 50.745 16 64 16H56C69.255 16 80 26.745 80 40V55" stroke="#f85858" strokeWidth="4" strokeLinecap="round" />
                <circle cx="60" cy="88" r="8" fill="#f85858" opacity="0.6" />
                <defs>
                  <linearGradient id="lockGrad" x1="60" y1="55" x2="60" y2="125" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f85858" />
                    <stop offset="1" stopColor="#c03030" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Universal */}
          <div className="relative w-full md:w-[396px] h-[138px] rounded-[15px] overflow-hidden bg-gradient-to-b from-[#181818] to-[#0b0b0b]">
            <div className="absolute left-[25px] top-[37px]">
              <h3 className="text-[18px] font-bold text-white">Universal</h3>
              <p className="text-[16px] font-medium text-[#888] mt-2 leading-snug">
                Connect seamlessly<br />across blockchains
              </p>
            </div>
            <div className="absolute right-[5px] top-[-20px] w-[200px] h-[200px] opacity-70">
              <Image src="/assets/home/icon-universal.png" alt="" fill className="object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Block 3 : Expanding Ecosystem ───────────────────────── */}
      <section className="relative min-h-[500px] md:h-[809px] overflow-hidden">
        {/* Deep space background */}
        <div className="absolute inset-0">
          <Image
            src="/assets/home/deep-space-bg.png"
            alt=""
            fill
            className="object-cover opacity-50"
          />
        </div>

        {/* Floating planets / dots */}
        <div className="absolute right-[15%] bottom-[20%] w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#666] to-[#333] opacity-40 hidden md:block" />
        <div className="absolute right-[8%] bottom-[30%] w-[25px] h-[25px] rounded-full bg-gradient-to-br from-[#888] to-[#444] opacity-30 hidden md:block" />
        <div className="absolute left-[5%] top-[25%] w-[15px] h-[15px] rounded-full bg-gradient-to-br from-[#777] to-[#333] opacity-25 hidden md:block" />

        {/* Content: Left text + Right icon */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 h-full flex flex-col md:flex-row items-center py-16 md:py-0">
          <div className="flex-1 max-w-[560px]">
            <h2 className="text-[28px] md:text-[48px] font-black text-white leading-[1.1]">
              <span className="text-[#f85858]">Expanding</span> Ecosystems
              Through Interoperability
            </h2>
            <p className="mt-6 md:mt-8 text-[16px] md:text-[18px] font-medium text-white/90 leading-relaxed max-w-[530px]">
              <strong>VISTA</strong> is an open-source bridge protocol that enables
              blockchains to safely and easily communicate with one another,
              making it simpler for different networks to work together. It
              ensures safe exchanges and is designed to protect against
              security risks, making it reliable for any project.
            </p>
          </div>

          {/* Bridge icon */}
          <div className="flex-shrink-0 mt-10 md:mt-0 md:ml-auto">
            <div className="relative w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full bg-white flex items-center justify-center">
              <svg width="90" height="90" viewBox="0 0 90 90" fill="none" className="w-[65px] h-[65px] md:w-[90px] md:h-[90px]">
                {/* Two chain links bridging */}
                <circle cx="25" cy="45" r="18" stroke="#f85858" strokeWidth="4" fill="none" />
                <circle cx="65" cy="45" r="18" stroke="#f85858" strokeWidth="4" fill="none" />
                {/* Bridge connection */}
                <path d="M43 45H47" stroke="#f85858" strokeWidth="4" strokeLinecap="round" />
                {/* Dots representing networks */}
                <circle cx="25" cy="45" r="5" fill="#f85858" />
                <circle cx="65" cy="45" r="5" fill="#f85858" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Benefit Cards ────────────────────────────────────────── */}
      <div className="relative z-10 max-w-[1480px] mx-auto px-6 -mt-[30px] mb-[60px]">
        <div className="flex flex-col md:flex-row gap-4 md:gap-[43px] justify-center">
          <div className="bg-white rounded-[5px] px-5 py-[24px] md:py-[30px] w-full md:w-[477px] flex items-center justify-center">
            <p className="text-[#121212] text-[15px] md:text-[18px] font-medium leading-snug">
              <strong>Makes</strong> connecting different blockchain technologies simple and straightforward
            </p>
          </div>
          <div className="bg-white rounded-[5px] px-5 py-[24px] md:py-[30px] w-full md:w-[477px] flex items-center justify-center">
            <p className="text-[#121212] text-[15px] md:text-[18px] font-medium leading-snug">
              <strong>Ensures</strong> your cross-chain communications are safe and reliable, minimizing risks and protecting data
            </p>
          </div>
          <div className="bg-white rounded-[5px] px-5 py-[24px] md:py-[30px] w-full md:w-[477px] flex items-center justify-center">
            <p className="text-[#121212] text-[15px] md:text-[18px] font-medium leading-snug">
              <strong>Offers</strong> unparalleled accessibility and flexibility, empowering developers to innovate across chains
            </p>
          </div>
        </div>
      </div>

      {/* ─── Block 4 : Want to Learn More / Subscribe ─────────────── */}
      <section className="relative bg-black py-[60px] md:py-[120px] overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <h2 className="text-[28px] md:text-[48px] font-black text-white">Want to Learn More?</h2>
          <p className="mt-3 text-[16px] md:text-[18px] font-medium text-white max-w-[500px] leading-relaxed">
            Subscribe to our mailing list and stay in touch
            with updates to VISTA
          </p>

          {/* Email form */}
          <div className="mt-[30px] md:mt-[50px] relative w-full max-w-[420px]">
            <div className="flex items-center">
              <input
                type="email"
                placeholder="Your email"
                className="w-full h-[51px] rounded-full bg-white border border-white/20 px-6 text-[16px] font-medium text-[#333] placeholder-[#797979] outline-none"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              />
              <button className="absolute right-[4px] top-1/2 -translate-y-1/2 bg-[#f85858] hover:bg-[#e04848] transition-colors text-white font-bold text-[14px] px-[15px] md:px-[25px] py-[12px] rounded-full flex items-center gap-[5px]">
                <span className="hidden md:inline">Subscribe</span>
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <rect x="1" y="3" width="15" height="11" rx="2" stroke="white" strokeWidth="1.5" />
                  <path d="M1 5L8.5 10L16 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
