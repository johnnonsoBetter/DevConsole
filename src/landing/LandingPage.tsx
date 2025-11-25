import {
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    Camera,
    CheckCircle2,
    ChevronDown,
    CircleDot,
    Download,
    Edit3,
    ExternalLink,
    Filter,
    Github,
    GitPullRequest,
    Image,
    MessageCircle,
    MessageSquare,
    MousePointer2,
    Play,
    Plus,
    RefreshCw,
    Search,
    Sparkles,
    StickyNote,
    Tag,
    Terminal,
    Type,
    Wand2,
    Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// =============================================
// Landing Page Component - Antigravity-inspired Design
// =============================================
export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden font-sans antialiased">
      {/* Navigation */}
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Product Overview with Video */}
      <ProductOverview />
      
      {/* Feature Sections - Vertically flowing */}
      <FeatureShowcase />
      
      {/* Sticky Notes Feature */}
      <StickyNotesSection />
      
      {/* Smart Autofill Feature */}
      <AutofillSection />
      
      {/* GitHub Integration Feature */}
      <GitHubSection />
      
      {/* Use Cases Carousel */}
      <UseCasesCarousel />
      
      {/* Cross-surface Agents Section */}
      <CrossSurfaceSection />
      
      {/* Testimonials */}
      <TestimonialsSection />
      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* CTA Section */}
      <CTASection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

// =============================================
// Navigation - Minimal Antigravity Style
// =============================================
const Navigation: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Product', href: '#product' },
    { 
      label: 'Use Cases', 
      href: '#use-cases',
      dropdown: [
        { label: 'Frontend Developer', href: '#frontend' },
        { label: 'Full-stack Developer', href: '#fullstack' },
        { label: 'Backend Engineer', href: '#backend' },
        { label: 'DevOps Engineer', href: '#devops' },
      ]
    },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Blog', href: '#blog' },
    { 
      label: 'Resources', 
      href: '#resources',
      dropdown: [
        { label: 'Documentation', href: 'https://github.com/johnnonsoBetter/DevConsole#readme' },
        { label: 'Architecture', href: 'https://github.com/johnnonsoBetter/DevConsole/blob/main/ARCHITECTURE.md' },
        { label: 'GitHub', href: 'https://github.com/johnnonsoBetter/DevConsole' },
      ]
    },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100' 
          : 'bg-white'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
              DevConsole
            </span>
          </a>
          
          {/* Center Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <div 
                key={item.label} 
                className="relative"
                onMouseEnter={() => item.dropdown && setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <a 
                  href={item.href}
                  className="flex items-center gap-1 px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
                >
                  {item.label}
                  {item.dropdown && (
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                  )}
                </a>
                
                {/* Dropdown Menu */}
                {item.dropdown && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 pt-2 w-52">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-dropdown">
                      {item.dropdown.map((subItem) => (
                        <a
                          key={subItem.label}
                          href={subItem.href}
                          className="block px-4 py-2.5 text-[14px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                        >
                          {subItem.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Right CTA */}
          <a 
            href="https://github.com/johnnonsoBetter/DevConsole" 
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[14px] font-medium rounded-full hover:bg-gray-800 transition-all hover:shadow-lg group"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </a>
          
          {/* Mobile Menu Button */}
          <button className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

// =============================================
// Hero Section - Clean Antigravity Style
// =============================================
const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Subtle animated dot pattern background */}
      <div className="absolute inset-0 dot-pattern opacity-40" />
      
      {/* Floating gradient orbs - very subtle */}
      <div className="absolute top-1/4 right-[15%] w-[500px] h-[500px] bg-blue-400/5 rounded-full blur-[100px] animate-float-slow" />
      <div className="absolute bottom-1/4 left-[10%] w-[400px] h-[400px] bg-purple-400/5 rounded-full blur-[100px] animate-float-slow animation-delay-2000" />
      
      {/* Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-10 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full mb-8 animate-fade-up">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[13px] font-medium text-gray-600">Now with Chrome Built-in AI</span>
        </div>
        
        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-gray-900 tracking-tight mb-6 animate-fade-up animation-delay-100">
          Experience liftoff
        </h1>
        <p className="text-2xl sm:text-3xl lg:text-4xl text-gray-400 font-light mb-12 animate-fade-up animation-delay-200">
          with the next-generation DevTools
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up animation-delay-300">
          <a 
            href="https://github.com/johnnonsoBetter/DevConsole"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white text-[15px] font-semibold rounded-full hover:bg-gray-800 transition-all hover:shadow-xl hover:-translate-y-0.5 group"
          >
            <Download className="w-4 h-4" />
            <span>Download for Chrome</span>
          </a>
          <a 
            href="#use-cases"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 text-[15px] font-semibold rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
          >
            <span>Explore use cases</span>
          </a>
        </div>
        
        {/* Browser Mockup */}
        <div className="max-w-5xl mx-auto animate-fade-up animation-delay-400">
          <HeroMockup />
        </div>
      </div>
      
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  );
};

// =============================================
// Hero Mockup - Modern Browser Chrome
// =============================================
const HeroMockup: React.FC = () => {
  return (
    <div className="relative group">
      {/* Glow effect on hover */}
      <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-800">
        {/* Browser Chrome */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1.5 bg-gray-800 rounded-lg text-[12px] text-gray-400 font-mono">
              DevConsole — Chrome DevTools
            </div>
          </div>
          <div className="w-20" />
        </div>
        
        {/* DevTools Content */}
        <div className="bg-[#1a1a2e] p-6">
          {/* Tab Bar */}
          <div className="flex gap-1 mb-6">
            {['Logs', 'Network', 'AI Panel', 'GitHub', 'GraphQL'].map((tab, i) => (
              <button
                key={tab}
                className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${
                  i === 0 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'text-gray-500 hover:text-gray-400 hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Log Entries */}
          <div className="space-y-2 mb-6">
            <LogEntryNew type="info" time="12:34:56" message="Application initialized successfully" />
            <LogEntryNew type="warn" time="12:34:57" message="Deprecated API usage detected in auth.js" />
            <LogEntryNew type="error" time="12:34:58" message="Failed to fetch user data: Network error" active />
          </div>
          
          {/* AI Analysis Panel */}
          <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">AI Analysis</span>
              <span className="ml-auto text-xs text-gray-500 font-mono">Gemini Nano</span>
            </div>
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
              This error indicates a network connectivity issue. The request failed, possibly due to:
            </p>
            <ul className="text-sm text-gray-400 space-y-1.5 mb-4">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Server unavailability or downtime
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                CORS configuration issues
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Network timeout exceeded
              </li>
            </ul>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors">
                Apply Fix
              </button>
              <button className="px-4 py-2 text-gray-400 text-xs font-medium hover:text-white transition-colors">
                Create GitHub Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================
// Log Entry Component (Dark Theme)
// =============================================
interface LogEntryNewProps {
  type: 'info' | 'warn' | 'error';
  time: string;
  message: string;
  active?: boolean;
}

const LogEntryNew: React.FC<LogEntryNewProps> = ({ type, time, message, active }) => {
  const badgeStyles = {
    info: 'bg-sky-500/20 text-sky-400',
    warn: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
      active ? 'bg-white/5 ring-1 ring-purple-500/30' : 'bg-white/[0.02] hover:bg-white/5'
    }`}>
      <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeStyles[type]}`}>
        {type}
      </span>
      <span className="text-[11px] text-gray-600 font-mono">{time}</span>
      <span className="flex-1 text-sm text-gray-300">{message}</span>
      <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
        active 
          ? 'bg-purple-500 text-white' 
          : 'bg-white/5 text-gray-400 hover:bg-purple-500 hover:text-white'
      }`}>
        <Sparkles className="w-3 h-3" />
        Explain
      </button>
    </div>
  );
};

// =============================================
// Product Overview Section
// =============================================
const ProductOverview: React.FC = () => {
  return (
    <section id="product" className="py-32 px-6 lg:px-10 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">
            The Platform
          </p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
            An agentic debugging platform
          </h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            DevConsole brings AI-powered debugging directly into Chrome DevTools. 
            Understand errors instantly, create GitHub issues automatically, and explore 
            APIs without leaving your workflow.
          </p>
        </div>
        
        {/* Video Embed Placeholder */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-900 group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform border border-white/20">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
            <span className="text-white/70 text-sm font-medium">Watch the 90-second overview</span>
            <span className="text-white/50 text-sm">1:30</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// Feature Showcase - Vertically Flowing Sections
// =============================================
const FeatureShowcase: React.FC = () => {
  const features = [
    {
      badge: 'Core Feature',
      title: 'An AI IDE Core',
      description: 'DevConsole\'s AI engine offers intelligent log analysis, natural language code explanations, and context-aware suggestions. Stay inside DevTools while AI highlights root causes and fixes.',
      visual: 'ai-core',
    },
    {
      badge: 'Smart Abstractions',
      title: 'Higher-level Abstractions',
      description: 'Transform cryptic errors into actionable insights. Our AI understands your codebase context and provides explanations tailored to your stack and coding patterns.',
      visual: 'abstractions',
    },
    {
      badge: 'Integration',
      title: 'User Feedback',
      description: 'Create perfectly formatted GitHub issues directly from console errors. AI enhances your issues with context, reproduction steps, and suggested fixes—no copy-paste required.',
      visual: 'feedback',
    },
    {
      badge: 'Workflow',
      title: 'An Agent-First Experience',
      description: 'Manage all your debugging workflows from a central mission-control view. GraphQL explorer, network monitoring, and smart autofill work together seamlessly.',
      visual: 'agent-first',
    },
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      {features.map((feature, index) => (
        <div 
          key={feature.title}
          className={`py-20 px-6 lg:px-10 ${index % 2 === 1 ? 'bg-white' : ''}`}
        >
          <div className="max-w-[1200px] mx-auto">
            <div className={`grid lg:grid-cols-2 gap-16 items-center ${index % 2 === 1 ? 'lg:grid-flow-dense' : ''}`}>
              {/* Text Content */}
              <div className={index % 2 === 1 ? 'lg:col-start-2' : ''}>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
                  {feature.badge}
                </span>
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
                  {feature.title}
                </h3>
                <p className="text-lg text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
              
              {/* Visual */}
              <div className={index % 2 === 1 ? 'lg:col-start-1' : ''}>
                <FeatureVisual type={feature.visual} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

// =============================================
// Feature Visual Component
// =============================================
const FeatureVisual: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'ai-core') {
    return (
      <div className="relative">
        <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-2 text-xs text-gray-500">page.tsx</span>
          </div>
          <pre className="text-sm font-mono text-gray-300 leading-relaxed">
            <code>
              <span className="text-purple-400">"use client"</span>;{'\n\n'}
              <span className="text-blue-400">export default function</span> <span className="text-yellow-300">Form</span>() {'{\n'}
              {'  '}<span className="text-blue-400">const</span> <span className="text-emerald-300">onSubmit</span> = () =&gt; {'{\n'}
              {'    '}<span className="text-gray-500">console</span>.<span className="text-yellow-300">log</span>(<span className="text-green-400">"Submitted"</span>);{'\n'}
              {'  }\n\n'}
              {'  '}<span className="text-purple-400">return</span> ({'\n'}
              {'    '}<span className="text-blue-300">&lt;form</span> <span className="text-purple-300">onSubmit</span>=<span className="text-emerald-300">{'{onSubmit}'}</span><span className="text-blue-300">&gt;</span>{'\n'}
              <span className="bg-purple-500/20 block px-2 -mx-2">{'      '}<span className="text-gray-500">{'// AI suggests: Add e.preventDefault()'}</span></span>
              {'    '}<span className="text-blue-300">&lt;/form&gt;</span>{'\n'}
              {'  );\n}'}
            </code>
          </pre>
        </div>
        {/* Floating suggestion card */}
        <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-gray-100 max-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-900">AI Suggestion</span>
          </div>
          <p className="text-xs text-gray-500">Add form validation before submit</p>
        </div>
      </div>
    );
  }
  
  if (type === 'abstractions') {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100">
        <div className="space-y-4">
          {/* Error Input */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-semibold rounded uppercase">Error</span>
            </div>
            <code className="text-sm text-red-500 font-mono">TypeError: Cannot read property 'map' of undefined</code>
          </div>
          
          {/* Arrow */}
          <div className="flex justify-center py-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-purple-600 rotate-90" />
            </div>
          </div>
          
          {/* AI Explanation */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-900">Plain English</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              You're trying to loop through an array that doesn't exist yet. 
              The data probably hasn't loaded—add a loading check before rendering.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (type === 'feedback') {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Github className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-white">New Issue</span>
          <span className="ml-auto px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded">Auto-generated</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title</label>
            <div className="bg-white/5 rounded-lg p-3 text-sm text-white">
              [Bug] Network error when fetching user data
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
              <p className="mb-2">## Description</p>
              <p className="text-gray-400 mb-3">The fetch request to /api/users fails with a network error.</p>
              <p className="mb-2">## Steps to Reproduce</p>
              <p className="text-gray-400">1. Open the app</p>
              <p className="text-gray-400">2. Navigate to users page</p>
            </div>
          </div>
          <button className="w-full py-3 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
            Create Issue
          </button>
        </div>
      </div>
    );
  }
  
  // agent-first
  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {['Console', 'Network', 'GraphQL', 'Settings'].map((tab, i) => (
            <span key={tab} className={`text-sm font-medium ${i === 2 ? 'text-purple-600' : 'text-gray-400'}`}>
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">Endpoint</div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-sm font-mono text-gray-700">https://api.example.com/graphql</span>
            <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Connected</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Query</div>
            <pre className="text-xs font-mono text-emerald-400">
{`query {
  users {
    id
    name
    email
  }
}`}
            </pre>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Response</div>
            <pre className="text-xs font-mono text-gray-600">
{`{
  "users": [
    { "id": 1, ... }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================
// Sticky Notes Section - Showcase Feature
// =============================================
const StickyNotesSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual - Sticky Notes Mockup */}
          <div className="relative order-2 lg:order-1">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/30 via-pink-200/20 to-purple-200/30 rounded-3xl blur-3xl" />
            
            {/* Sticky Notes Container */}
            <div className="relative min-h-[500px]">
              {/* Yellow Note - Main */}
              <div className="absolute top-0 left-4 w-72 bg-yellow-100 rounded-xl shadow-xl border border-yellow-200/50 transform rotate-[-2deg] hover:rotate-0 transition-transform">
                <div className="px-4 py-3 border-b border-yellow-200/50 bg-gradient-to-r from-yellow-200/40 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-semibold text-yellow-800">Bug Report</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-yellow-200/50 rounded">
                      <Camera className="w-3.5 h-3.5 text-yellow-600" />
                    </button>
                    <button className="p-1 hover:bg-yellow-200/50 rounded">
                      <Edit3 className="w-3.5 h-3.5 text-yellow-600" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-yellow-900 leading-relaxed">
                    Login button doesn't work on mobile Safari. Need to check touch event handlers.
                  </p>
                  {/* Screenshot preview */}
                  <div className="mt-3 bg-gray-900 rounded-lg p-2 h-24 flex items-center justify-center">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Screenshot attached
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-yellow-200/50 flex gap-1.5">
                  {['yellow', 'pink', 'blue', 'green', 'purple'].map((color) => (
                    <button
                      key={color}
                      className={`w-4 h-4 rounded-full ${
                        color === 'yellow' ? 'bg-yellow-400 ring-2 ring-yellow-600' :
                        color === 'pink' ? 'bg-pink-400' :
                        color === 'blue' ? 'bg-blue-400' :
                        color === 'green' ? 'bg-green-400' :
                        'bg-purple-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Pink Note - Secondary */}
              <div className="absolute top-32 right-4 w-64 bg-pink-100 rounded-xl shadow-xl border border-pink-200/50 transform rotate-[3deg] hover:rotate-0 transition-transform">
                <div className="px-4 py-3 border-b border-pink-200/50 bg-gradient-to-r from-pink-200/40 to-transparent flex items-center gap-2">
                  <span className="text-sm font-semibold text-pink-800">Feature Idea</span>
                  <span className="ml-auto text-xs text-pink-500">📌 Pinned</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-pink-900 leading-relaxed">
                    Add dark mode toggle in settings. Users have requested this multiple times.
                  </p>
                </div>
              </div>
              
              {/* Blue Note - Small */}
              <div className="absolute bottom-8 left-12 w-56 bg-blue-100 rounded-xl shadow-xl border border-blue-200/50 transform rotate-[-1deg] hover:rotate-0 transition-transform">
                <div className="px-4 py-3 border-b border-blue-200/50 bg-gradient-to-r from-blue-200/40 to-transparent">
                  <span className="text-sm font-semibold text-blue-800">Quick TODO</span>
                </div>
                <div className="p-4">
                  <div className="space-y-2 text-sm text-blue-900">
                    <p>✓ Fix network panel filter</p>
                    <p>○ Update GraphQL schema</p>
                    <p>○ Test on Firefox</p>
                  </div>
                </div>
              </div>
              
              {/* Minimized Note */}
              <div className="absolute bottom-4 right-8 w-48 bg-purple-100 rounded-lg shadow-lg border border-purple-200/50 px-3 py-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-purple-800 truncate">API Documentation</span>
                <span className="ml-auto text-purple-400 text-xs">▢</span>
              </div>
            </div>
          </div>
          
          {/* Text Content */}
          <div className="order-1 lg:order-2">
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
              Sticky Notes
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Capture thoughts<br />
              <span className="text-gray-400">without leaving flow</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Draggable, colorful sticky notes that live right in your DevTools. 
              Jot down bugs, ideas, or TODOs without breaking your debugging concentration.
            </p>
            
            {/* Feature List */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: MousePointer2, title: 'Drag Anywhere', desc: 'Move notes to any position' },
                { icon: Camera, title: 'Screenshot Capture', desc: 'Attach visual context instantly' },
                { icon: Edit3, title: 'Rich Colors', desc: '5 colors to organize your thoughts' },
                { icon: Wand2, title: 'Auto-Save', desc: 'Never lose a note again' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// Smart Autofill Section - Showcase Feature
// =============================================
const AutofillSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-gray-50 overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div>
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
              Smart Autofill
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Fill forms<br />
              <span className="text-gray-400">in milliseconds</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Intelligent field detection fills any form with contextual data. 
              5 rotating personas, Unsplash images for file inputs, and one-click "Fill All" functionality.
            </p>
            
            {/* Feature List */}
            <div className="space-y-4 mb-8">
              {[
                { icon: Type, title: 'Smart Detection', desc: 'Automatically detects 15+ field types from labels, placeholders, and attributes' },
                { icon: Image, title: 'Unsplash Integration', desc: 'Beautiful placeholder images for avatars, covers, and product photos' },
                { icon: Wand2, title: 'Persona Rotation', desc: '5 different user profiles that rotate to avoid repetition' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Keyboard Shortcuts */}
            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Alt</kbd>
                <span className="text-gray-400">+</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">`</kbd>
                <span className="text-xs text-gray-500">Open suggestions</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl</kbd>
                <span className="text-gray-400">+</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">F</kbd>
                <span className="text-xs text-gray-500">Fill all fields</span>
              </div>
            </div>
          </div>
          
          {/* Visual - Form Mockup */}
          <div className="relative">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-200/30 via-purple-200/20 to-emerald-200/30 rounded-3xl blur-3xl" />
            
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Form Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="ml-2 text-xs text-gray-500">Create Account — example.com</span>
                </div>
              </div>
              
              {/* Form Content */}
              <div className="p-6 space-y-4">
                {/* Name Field - Filled */}
                <div className="relative">
                  <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value="John Doe"
                      readOnly
                      className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-gray-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-medium">✓</span>
                  </div>
                </div>
                
                {/* Email Field - With Suggestion Icon */}
                <div className="relative">
                  <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value="john.doe@techcorp.com"
                      readOnly
                      className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-gray-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-medium">✓</span>
                  </div>
                </div>
                
                {/* Phone Field - Being Filled */}
                <div className="relative">
                  <label className="text-xs text-gray-500 mb-1 block">Phone Number</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter phone..."
                      readOnly
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 placeholder:text-gray-300"
                    />
                    {/* Blue Autofill Icon */}
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-600 transition-colors">
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  
                  {/* Suggestion Dropdown */}
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-10">
                    <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider">Suggestions</div>
                    {[
                      '+1 (555) 123-4567',
                      '+1 (555) 234-5678',
                      '+1 (555) 345-6789',
                    ].map((phone, i) => (
                      <button
                        key={phone}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${i === 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        {phone}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Avatar Field - Image Picker */}
                <div className="relative pt-12">
                  <label className="text-xs text-gray-500 mb-1 block">Profile Picture</label>
                  <div className="relative">
                    <div className="w-full px-4 py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center">
                      <div className="flex justify-center gap-2 mb-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                            i === 1 ? 'from-blue-400 to-purple-500 ring-2 ring-blue-500 ring-offset-2' :
                            i === 2 ? 'from-green-400 to-teal-500' :
                            i === 3 ? 'from-orange-400 to-red-500' :
                            'from-pink-400 to-purple-500'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Choose from Unsplash</p>
                    </div>
                    {/* Camera Icon */}
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-600 transition-colors">
                      <Camera className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Fill All Button */}
              <div className="absolute bottom-4 right-4">
                <button className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-2 hover:shadow-xl transition-shadow">
                  <Wand2 className="w-4 h-4" />
                  Fill All
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// GitHub Integration Section - Showcase Feature
// =============================================
const GitHubSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Visual - GitHub Issues Mockup */}
          <div className="relative order-2 lg:order-1">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200/40 via-purple-200/20 to-emerald-200/30 rounded-3xl blur-3xl" />
            
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header Bar */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
                    <Github className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Repository</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">acme/web-app</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {['open', 'closed', 'all'].map((state, i) => (
                    <button
                      key={state}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        i === 0
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {state.charAt(0).toUpperCase() + state.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Search & Actions Bar */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Search issues...</span>
                </div>
                <button className="px-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm hover:bg-emerald-600 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  New Issue
                </button>
                <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              
              {/* Issues List */}
              <div className="divide-y divide-gray-50">
                {/* Issue 1 - Selected */}
                <div className="px-5 py-4 bg-emerald-50/50 border-l-2 border-emerald-500">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CircleDot className="w-2.5 h-2.5" />
                          Open
                        </span>
                        <span className="text-xs font-semibold text-gray-400">#142</span>
                        <span className="text-[10px] text-gray-400">Updated 2h ago</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Login button unresponsive on mobile Safari</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">
                          <Tag className="w-2.5 h-2.5" />
                          bug
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-600">
                          <Tag className="w-2.5 h-2.5" />
                          mobile
                        </span>
                      </div>
                    </div>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=john" alt="avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                  </div>
                </div>
                
                {/* Issue 2 */}
                <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CircleDot className="w-2.5 h-2.5" />
                          Open
                        </span>
                        <span className="text-xs font-semibold text-gray-400">#139</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Add dark mode support to dashboard</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-600">
                          <Tag className="w-2.5 h-2.5" />
                          enhancement
                        </span>
                      </div>
                    </div>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" alt="avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                  </div>
                </div>
                
                {/* Issue 3 - Closed */}
                <div className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer opacity-70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Closed
                        </span>
                        <span className="text-xs font-semibold text-gray-400">#135</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-500 mb-2 line-through">API rate limiting not working</h3>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Issue Detail Slide Panel */}
              <div className="absolute right-0 top-0 bottom-0 w-[55%] bg-white border-l border-gray-200 shadow-xl flex flex-col">
                {/* Detail Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">Issue #142</span>
                    </div>
                    <a href="#" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                      View on GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-gray-900 shadow-sm">Preview</button>
                    <button className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100">Comments</button>
                  </div>
                </div>
                
                {/* Detail Content */}
                <div className="flex-1 p-4 overflow-auto">
                  <div className="flex items-start gap-3 mb-4">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=john" alt="avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Login button unresponsive on mobile Safari</h2>
                      <p className="text-xs text-gray-400 mt-1">Opened 2h ago by johndoe</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-3">
                    <p><strong>Description:</strong></p>
                    <p>The login button doesn't respond to touch events on iOS Safari 17.x. Works fine on Chrome and Firefox mobile.</p>
                    <p><strong>Steps to reproduce:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600">
                      <li>Open app in Safari on iPhone</li>
                      <li>Navigate to login page</li>
                      <li>Tap the "Sign In" button</li>
                    </ol>
                    <p><strong>Expected:</strong> Login modal appears</p>
                    <p><strong>Actual:</strong> Nothing happens</p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Comment
                    </button>
                    <button className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Close Issue
                    </button>
                  </div>
                </div>
                
                {/* Comment Input */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-start gap-3">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=me" alt="avatar" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                    <div className="flex-1">
                      <textarea 
                        placeholder="Add a comment..." 
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        rows={2}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">Markdown supported</span>
                        <button className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-1.5">
                          <MessageCircle className="w-3 h-3" />
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Text Content */}
          <div className="order-1 lg:order-2">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full mb-6 uppercase tracking-wider">
              GitHub Integration
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Manage issues<br />
              <span className="text-gray-400">without context switching</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Full GitHub issue management right inside DevTools. Create, edit, comment, and close issues 
              while debugging—never lose your flow jumping between browser tabs.
            </p>
            
            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Plus, title: 'Create Issues', desc: 'File bugs instantly with context' },
                { icon: Edit3, title: 'Edit & Update', desc: 'Modify title, body, and labels' },
                { icon: MessageCircle, title: 'Comments', desc: 'Discuss with Markdown support' },
                { icon: CheckCircle2, title: 'State Control', desc: 'Open, close, reopen issues' },
                { icon: Filter, title: 'Smart Filters', desc: 'Filter by open, closed, or all' },
                { icon: Search, title: 'Quick Search', desc: 'Find issues by title instantly' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Workflow Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                <RefreshCw className="w-3 h-3" />
                Real-time sync
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                <GitPullRequest className="w-3 h-3" />
                Any repository
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                <Tag className="w-3 h-3" />
                Label support
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// Use Cases Carousel
// =============================================
const UseCasesCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const useCases = [
    {
      role: 'Frontend Developer',
      description: 'Debug React, Vue, and Angular apps with AI-powered error explanations and component inspection.',
      features: ['Component state inspection', 'React DevTools integration', 'CSS debugging'],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      role: 'Full-stack Developer',
      description: 'Bridge frontend and backend debugging seamlessly with network monitoring and GraphQL exploration.',
      features: ['API request tracking', 'GraphQL explorer', 'Request/response diffing'],
      color: 'from-purple-500 to-pink-500',
    },
    {
      role: 'Backend Engineer',
      description: 'Debug server responses, trace API calls, and monitor network performance directly in the browser.',
      features: ['Response time analysis', 'Header inspection', 'Payload validation'],
      color: 'from-emerald-500 to-teal-500',
    },
    {
      role: 'DevOps Engineer',
      description: 'Monitor application health, track performance metrics, and debug production issues efficiently.',
      features: ['Performance monitoring', 'Error aggregation', 'Log analysis'],
      color: 'from-orange-500 to-red-500',
    },
  ];

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % useCases.length);
  }, [useCases.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + useCases.length) % useCases.length);
  }, [useCases.length]);

  return (
    <section id="use-cases" className="py-32 px-6 lg:px-10 bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">
              Use Cases
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
              Built for every developer
            </h2>
          </div>
          
          {/* Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-3">
            <button 
              onClick={prev}
              className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all"
              aria-label="Previous"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={next}
              className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-all"
              aria-label="Next"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Carousel */}
        <div ref={containerRef} className="relative">
          <div 
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
          >
            {useCases.map((useCase) => (
              <div 
                key={useCase.role}
                className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <div className="bg-gray-50 rounded-2xl p-8 h-full hover:bg-gray-100 transition-colors group">
                  {/* Gradient Badge */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.color} mb-6 flex items-center justify-center`}>
                    <Terminal className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {useCase.role}
                  </h3>
                  <p className="text-gray-500 mb-6 leading-relaxed">
                    {useCase.description}
                  </p>
                  
                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {useCase.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <a 
                    href="#"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 group-hover:gap-3 transition-all"
                  >
                    View case
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Mobile Navigation Dots */}
        <div className="flex justify-center gap-2 mt-8 sm:hidden">
          {useCases.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                currentIndex === index ? 'w-6 bg-purple-600' : 'bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================
// Cross-surface Agents Section
// =============================================
const CrossSurfaceSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-gray-50">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Cross-surface Agents
            </h2>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              Synchronized agentic control across your editor, terminal, and browser for powerful development workflows.
            </p>
            
            {/* Feature List */}
            <div className="space-y-6">
              {[
                { icon: Zap, title: 'Real-time Sync', desc: 'Changes propagate instantly across all surfaces' },
                { icon: MessageSquare, title: 'Context Aware', desc: 'AI understands your full development context' },
                { icon: Terminal, title: 'Universal Access', desc: 'Debug from anywhere in your workflow' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Visual */}
          <div className="relative">
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-[#1e1e2e] px-4 py-3 border-b border-gray-800 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-gray-500">Agent Dashboard</span>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Progress Section */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">Verify Changes</span>
                    <span className="text-xs text-gray-500">Nov 14 3:48 PM</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">
                    I have integrated the component into the main page. Now I will verify the changes.
                  </p>
                  
                  {/* Task List */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-gray-300">Verifying changes by checking the browser</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-4 h-4 rounded bg-purple-500/20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      </span>
                      <span className="text-gray-300">Running automated tests</span>
                    </div>
                  </div>
                </div>
                
                {/* Create Walkthrough */}
                <div className="bg-white/5 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Create Walkthrough</h4>
                  <p className="text-xs text-gray-400">
                    I have verified that the component is displayed correctly. The code logic is sound.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-xl p-3 border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-900">Playback available</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// =============================================
// Testimonials Section
// =============================================
const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      quote: "DevConsole has completely transformed how I debug. The AI explanations save me hours every week.",
      name: "James Chen",
      role: "Senior Frontend Engineer",
      company: "Vercel",
    },
    {
      quote: "The GitHub integration is a game-changer. I can create detailed bug reports without leaving my debugging flow.",
      name: "Sarah Kim",
      role: "Full Stack Developer",
      company: "Stripe",
    },
    {
      quote: "Finally, a GraphQL explorer that lives where I need it. No more switching between browser tabs.",
      name: "Mike Rodriguez",
      role: "Backend Engineer",
      company: "GitHub",
    },
  ];

  return (
    <section id="testimonials" className="py-32 px-6 lg:px-10 bg-white">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">
            Testimonials
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Loved by developers
          </h2>
        </div>
        
        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div key={t.name} className="relative">
              {/* Quote Mark */}
              <div className="absolute -top-4 -left-2 text-6xl text-purple-100 font-serif">"</div>
              
              <div className="bg-gray-50 rounded-2xl p-8 hover:bg-gray-100 transition-colors relative">
                <p className="text-gray-700 leading-relaxed mb-8 relative z-10">
                  {t.quote}
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-semibold">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.role} at {t.company}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================
// FAQ Section
// =============================================
const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const faqs = [
    {
      question: "Is DevConsole free?",
      answer: "Yes! DevConsole is completely open source and free to use. You can self-host it or contribute to the project on GitHub. We believe great developer tools should be accessible to everyone.",
    },
    {
      question: "What AI providers are supported?",
      answer: "DevConsole supports OpenAI, Anthropic Claude, Google Gemini, and Chrome's built-in Gemini Nano for on-device AI processing. You can choose your preferred provider in settings.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. All API keys are stored locally in your browser. With Chrome's built-in AI, your data never leaves your device. We take privacy seriously—your code stays yours.",
    },
    {
      question: "Does it work offline?",
      answer: "Core features work offline. With Chrome's on-device AI enabled (Gemini Nano), even AI analysis works without an internet connection. Perfect for air-gapped environments.",
    },
    {
      question: "How do I contribute?",
      answer: "We welcome contributions! Check out our GitHub repo, read the ARCHITECTURE.md guide, and submit a PR. All skill levels are welcome—from documentation to new features.",
    },
  ];

  return (
    <section id="faq" className="py-32 px-6 lg:px-10 bg-gray-50">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">
            FAQ
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            Questions & Answers
          </h2>
        </div>
        
        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={faq.question}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-8 pb-6 pt-0">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================
// CTA Section
// =============================================
const CTASection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 dot-pattern-dark opacity-30" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[150px]" />
      
      <div className="max-w-[900px] mx-auto text-center relative z-10">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
          Ready to debug smarter?
        </h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Join thousands of developers who have transformed their debugging workflow with DevConsole.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a 
            href="https://github.com/johnnonsoBetter/DevConsole"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 text-[15px] font-semibold rounded-full hover:bg-gray-100 transition-all hover:shadow-2xl hover:-translate-y-0.5"
          >
            <Github className="w-5 h-5" />
            <span>Get Started on GitHub</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
          <a 
            href="#product"
            className="inline-flex items-center gap-2 px-8 py-4 text-white text-[15px] font-semibold rounded-full border border-white/20 hover:bg-white/10 transition-all"
          >
            <span>Watch Demo</span>
            <Play className="w-4 h-4" />
          </a>
        </div>
        
        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-20">
          {[
            { value: '5K+', label: 'GitHub Stars' },
            { value: '10K+', label: 'Downloads' },
            { value: '500+', label: 'Contributors' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// =============================================
// Footer
// =============================================
const Footer: React.FC = () => {
  const links = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Use Cases', href: '#use-cases' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Changelog', href: '#' },
    ],
    Resources: [
      { label: 'Documentation', href: 'https://github.com/johnnonsoBetter/DevConsole#readme' },
      { label: 'Architecture', href: 'https://github.com/johnnonsoBetter/DevConsole/blob/main/ARCHITECTURE.md' },
      { label: 'API Reference', href: '#' },
      { label: 'Guides', href: '#' },
    ],
    Community: [
      { label: 'GitHub', href: 'https://github.com/johnnonsoBetter/DevConsole' },
      { label: 'Discord', href: '#' },
      { label: 'Twitter', href: '#' },
      { label: 'Blog', href: '#' },
    ],
    Company: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  };

  return (
    <footer className="py-20 px-6 lg:px-10 bg-white border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-12 pb-16">
          {/* Brand */}
          <div className="col-span-2">
            <a href="#" className="flex items-center gap-2.5 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
                <Terminal className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
                DevConsole
              </span>
            </a>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              The AI-powered DevTools extension for developers who demand excellence in debugging.
            </p>
          </div>
          
          {/* Link Columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">{title}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <a 
                      href={item.href}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            © 2025 DevConsole. Open source under MIT License.
          </p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <a 
              href="https://github.com/johnnonsoBetter/DevConsole"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingPage;
