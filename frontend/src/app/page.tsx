import Navbar from "@/components/landing/navbar";
import HeroSection from "@/components/landing/hero-section";
import { ConnectDemoSection } from "@/components/landing/connect-demo-section";
import { AskDemoSection } from "@/components/landing/ask-demo-section";
import { BuildDemoSection } from "@/components/landing/build-demo-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LenisProvider } from "@/components/landing/lenis-provider";
import Footer from "@/components/landing/footer";
import { auth } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  return (
    <LenisProvider>
      <div className="min-h-screen bg-surface font-sans text-on-surface">
        <Navbar session={session} />
        <HeroSection session={session} />
        <ConnectDemoSection />
        <AskDemoSection />
        <BuildDemoSection />
        <CtaSection session={session} />
        <Footer />
      </div>
    </LenisProvider>
  );
}
