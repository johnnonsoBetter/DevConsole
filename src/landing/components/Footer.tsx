import { Github } from 'lucide-react';
import React from 'react';
import LogoIcon from '../../icons/logo/logo.icon';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white pt-12 sm:pt-20 pb-8 sm:pb-10 border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8 sm:gap-10 mb-12 sm:mb-16">
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5 mb-4 sm:mb-6 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LogoIcon size={18} className="text-white" />
              </div>
              <span className="text-[15px] font-semibold text-gray-900 tracking-tight">
                DevConsole
              </span>
            </a>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 max-w-sm">
              DevTools + Video Calls that never forget. Debug smarter, meet better, 
              remember everything with SmartMemory.
            </p>
            <div className="flex gap-4">
              <a href="https://github.com/johnnonsoBetter/DevConsole" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Links Columns */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-purple-600 transition-colors">Features</a></li>
              <li><a href="#rooms-with-memory" className="hover:text-purple-600 transition-colors">Video Calls</a></li>
              <li><a href="#product" className="hover:text-purple-600 transition-colors">DevTools</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="https://github.com/johnnonsoBetter/DevConsole#readme" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Documentation</a></li>
              <li><a href="https://github.com/johnnonsoBetter/DevConsole/blob/main/ARCHITECTURE.md" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">Architecture</a></li>
              <li><a href="https://github.com/johnnonsoBetter/DevConsole" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-6 sm:pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-gray-400 text-center md:text-left">
            © 2025 DevConsole. Built with ❤️ for developers.
          </p>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
            <span className="text-[10px] sm:text-xs text-gray-400">Powered by</span>
            <span className="text-[10px] sm:text-xs font-medium text-purple-600">Raindrop SmartMemory</span>
            <span className="text-[10px] sm:text-xs text-gray-300">•</span>
            <span className="text-[10px] sm:text-xs font-medium text-blue-600">LiveKit</span>
            <span className="text-[10px] sm:text-xs text-gray-300">•</span>
            <span className="text-[10px] sm:text-xs font-medium text-emerald-600">Vultr</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
