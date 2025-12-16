import { ChevronDown, Download, Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import LogoIcon from '../../icons/logo/logo.icon';

export const Navigation: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Video Calls', href: '#rooms-with-memory' },
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
          ? 'bg-white/80 backdrop-blur-xl shadow-apple-sm border-b border-gray-200/50' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <LogoIcon size={18} className="text-white" />
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
                  className="flex items-center gap-1 px-4 py-2 text-[14px] font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100/50"
                >
                  {item.label}
                  {item.dropdown && (
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`} />
                  )}
                </a>
                
                {/* Dropdown Menu */}
                {item.dropdown && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 pt-2 w-56">
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-apple-lg border border-gray-100/50 py-2 animate-in fade-in zoom-in-95 duration-200">
                      {item.dropdown.map((subItem) => (
                        <a
                          key={subItem.label}
                          href={subItem.href}
                          className="block px-4 py-2.5 text-[14px] text-gray-600 hover:text-purple-600 hover:bg-purple-50/50 transition-colors"
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
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/johnnonsoBetter/DevConsole" 
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-[14px] font-medium rounded-full hover:bg-gray-800 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
            
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-xl">
            <div className="py-4 space-y-1">
              {navItems.map((item) => (
                <div key={item.label}>
                  <a
                    href={item.href}
                    onClick={() => !item.dropdown && setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-[15px] font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    {item.label}
                  </a>
                  {item.dropdown && (
                    <div className="pl-6 space-y-1">
                      {item.dropdown.map((subItem) => (
                        <a
                          key={subItem.label}
                          href={subItem.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-2 text-[14px] text-gray-500 hover:text-purple-600"
                        >
                          {subItem.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="px-4 pt-4">
                <a 
                  href="https://github.com/johnnonsoBetter/DevConsole" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-900 text-white text-[14px] font-medium rounded-xl"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Extension</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
