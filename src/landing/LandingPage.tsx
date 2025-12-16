import React, { useEffect } from 'react';
import { DevToolsSection } from './components/DevToolsSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navigation } from './components/Navigation';
import { RoomsSection } from './components/RoomsSection';

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
        {/* Hero - First impression */}
        <HeroSection />
        
        {/* DevTools Enhancement - First feature section */}
        <DevToolsSection />
        
        {/* Rooms with Memory - Second feature section */}
        <RoomsSection />
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
