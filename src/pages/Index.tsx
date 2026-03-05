import { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import ValueCardsSection from "@/components/landing/ValueCardsSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import { trackEvent, getUTMParams, getDeviceType } from "@/lib/analytics";

const Index = () => {
  useEffect(() => {
    trackEvent("page_view_landing", {
      ...getUTMParams(),
      device_type: getDeviceType(),
      referrer: document.referrer || undefined,
    });
  }, []);

  return (
    <div className="min-h-screen">
      <HeroSection />
      <ValueCardsSection />
      <SocialProofSection />
    </div>
  );
};

export default Index;
