import Header from "@/components/Header";
import Footer from "@/components/marketing/Footer";
import ArrowIcon from "@/components/marketing/ArrowIcon";

const CATALYST_STEPS = [
  {
    number: "01",
    title: "Propose",
    description:
      "Teams submit proposals for projects they want to build for the Cardano ecosystem.",
  },
  {
    number: "02",
    title: "Vote",
    description:
      "ADA holders review proposals and vote on which projects should receive funding.",
  },
  {
    number: "03",
    title: "Build",
    description:
      "Funded teams deliver on their milestones and ship real products to the community.",
  },
];

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-[10px] h-[10px] rounded-full bg-[#f85858]" />
      <span className="text-[14px] font-bold text-[#f85858] uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

function CTAButton({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <div className="mt-10">
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="inline-flex items-center gap-[6px] bg-white text-[#121212] font-bold text-[14px] px-[25px] py-[12px] rounded-full hover:bg-gray-100 transition-colors"
      >
        {label}
        <ArrowIcon />
      </a>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div
      className="relative min-h-screen bg-[#0c0c0c] overflow-hidden"
      style={{ fontFamily: "'Raleway', sans-serif" }}
    >
      <Header />

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-[100px] md:pt-[140px] pb-[40px] md:pb-[80px]">
        <div className="relative z-10 max-w-[900px] mx-auto px-6 text-center">
          <h1 className="text-[30px] md:text-[48px] font-black text-white leading-[1.1] tracking-tight">
            About <span className="text-[#f85858]">VISTA</span>
          </h1>
          <p className="mt-5 text-[16px] md:text-[18px] font-medium text-[#cecece] max-w-[620px] mx-auto leading-relaxed">
            VISTA is an open-source cross-chain bridge protocol created by
            Agrow Labs and funded through Project Catalyst — Cardano&apos;s
            community-driven innovation fund.
          </p>
        </div>
      </section>

      {/* ─── Agrow Labs ────────────────────────────────────────────── */}
      <section className="relative py-[40px] md:py-[80px]">
        <div className="relative z-10 max-w-[1100px] mx-auto px-4 md:px-6">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0e0e0e] border border-white/10 rounded-[20px] p-[24px] md:p-[60px]">
            <SectionLabel label="Built by" />

            <h2 className="text-[28px] md:text-[40px] font-black text-white leading-[1.15]">
              Agrow Labs
            </h2>

            <div className="mt-6 md:mt-8 space-y-5 md:space-y-6 text-[15px] md:text-[17px] font-medium text-white/80 leading-relaxed max-w-[800px]">
              <p>
                Agrow Labs is a team of expert blockchain developers with a
                collective 20 years of experience building on the Cardano
                ecosystem. The team specialises in smart contract development,
                protocol design, and cross-chain infrastructure — combining deep
                technical knowledge with a commitment to open-source principles.
              </p>
              <p>
                Driven by the belief that blockchain technology should be
                accessible, secure, and interoperable, Agrow Labs founded the
                VISTA project to address one of the most pressing challenges in
                the space: enabling seamless communication between different
                blockchain networks.
              </p>
              <p>
                From protocol architecture to front-end tooling, every component
                of VISTA has been designed and built in-house by the Agrow Labs
                team with a focus on transparency, security, and developer
                experience.
              </p>
            </div>

            {/* Stats row */}
            <div className="mt-8 md:mt-10 flex flex-wrap gap-6 md:gap-[50px]">
              <div>
                <p className="text-[28px] md:text-[36px] font-black text-[#f85858]">20+</p>
                <p className="text-[12px] md:text-[14px] font-bold text-white/50 mt-1">
                  Years Combined Experience
                </p>
              </div>
              <div>
                <p className="text-[28px] md:text-[36px] font-black text-[#f85858]">100%</p>
                <p className="text-[12px] md:text-[14px] font-bold text-white/50 mt-1">
                  Open-Source Codebase
                </p>
              </div>
              <div>
                <p className="text-[28px] md:text-[36px] font-black text-[#f85858]">Cardano</p>
                <p className="text-[12px] md:text-[14px] font-bold text-white/50 mt-1">
                  Native Expertise
                </p>
              </div>
            </div>

            <CTAButton href="https://agrowlabs.io" label="Visit Agrow Labs" external />
          </div>
        </div>
      </section>

      {/* ─── Project Catalyst ──────────────────────────────────────── */}
      <section className="relative py-[40px] md:py-[80px]">
        <div className="relative z-10 max-w-[1100px] mx-auto px-4 md:px-6">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0e0e0e] border border-white/10 rounded-[20px] p-[24px] md:p-[60px]">
            <SectionLabel label="Funded by" />

            <h2 className="text-[28px] md:text-[40px] font-black text-white leading-[1.15]">
              Project Catalyst
            </h2>

            <div className="mt-6 md:mt-8 space-y-5 md:space-y-6 text-[15px] md:text-[17px] font-medium text-white/80 leading-relaxed max-w-[800px]">
              <p>
                Project Catalyst is the world&apos;s largest decentralised
                innovation fund. It is a key pillar of the Cardano ecosystem,
                empowering the community to propose, evaluate, and vote on
                projects that advance the blockchain and the broader Web3 space.
              </p>
              <p>
                Every funding round, thousands of community members participate
                in the process — submitting proposals, reviewing ideas, and
                casting votes to decide which projects receive funding. This
                model ensures that development is community-led and that the
                most impactful ideas rise to the top.
              </p>
              <p>
                VISTA was successfully funded through Project Catalyst,
                reflecting the Cardano community&apos;s recognition of the
                critical need for secure, open-source cross-chain
                infrastructure. The support from Catalyst has enabled Agrow Labs
                to build VISTA as a public good — free, transparent, and
                available for anyone to use and contribute to.
              </p>
            </div>

            {/* How it works mini-steps */}
            <div className="mt-8 md:mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {CATALYST_STEPS.map((step) => (
                <div
                  key={step.number}
                  className="bg-white/5 border border-white/10 rounded-[12px] p-5"
                >
                  <div className="text-[24px] font-black text-[#f85858] mb-2">
                    {step.number}
                  </div>
                  <h3 className="text-[16px] font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[14px] font-medium text-white/60 leading-snug">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            <CTAButton
              href="https://projectcatalyst.io"
              label="Explore Project Catalyst"
              external
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
