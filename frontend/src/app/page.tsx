import Navbar from "@/components/landing/navbar";
import HeroSection from "@/components/landing/hero-section";
import { ConnectDemoSection } from "@/components/landing/connect-demo-section";
import { AskDemoSection } from "@/components/landing/ask-demo-section";
import HowItWorksSection from "@/components/landing/how-it-works-section";
import LiveConnectorSection from "@/components/landing/live-connector-section";
import BuildNextSection from "@/components/landing/build-next-section";
import Footer from "@/components/landing/footer";
import { auth } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface">
      <Navbar session={session} />
      <HeroSection session={session} />
      <ConnectDemoSection />
      <AskDemoSection />
      <HowItWorksSection />
      <LiveConnectorSection />
      <BuildNextSection />
      <Footer />
    </div>
  );
}
