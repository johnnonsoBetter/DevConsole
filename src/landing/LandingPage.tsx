import React, { useEffect } from 'react';
import { AutofillSection } from './components/AutofillSection';
import { CrossSurfaceSection } from './components/CrossSurfaceSection';
import { FeatureShowcase } from './components/FeatureShowcase';
import { Footer } from './components/Footer';
import { GitHubSection } from './components/GitHubSection';
import { HeroSection } from './components/HeroSection';
import { MassiveStatementSection } from './components/MassiveStatementSection';
import { Navigation } from './components/Navigation';
import { ProductOverview } from './components/ProductOverview';
import { StickyNotesSection } from './components/StickyNotesSection';
import { UseCasesCarousel } from './components/UseCasesCarousel';

export const LandingPage: React.FC = () => {
  // Smooth scroll behavior for anchor links
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-white selection:bg-purple-100 selection:text-purple-900 font-sans">
      <Navigation />
      
      <main>
        <HeroSection />
        <MassiveStatementSection />
       
        <ProductOverview />
        <FeatureShowcase />
        <StickyNotesSection />
        <AutofillSection />
        <GitHubSection />
        <UseCasesCarousel />
        <CrossSurfaceSection />
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
