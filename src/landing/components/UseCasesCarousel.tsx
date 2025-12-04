import { ArrowLeft, ArrowRight, Terminal } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

export const UseCasesCarousel: React.FC = () => {
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
    <section id="use-cases" className="py-32 px-6 lg:px-10 bg-white overflow-hidden border-t border-gray-100">
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
              className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              aria-label="Previous"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              onClick={next}
              className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              aria-label="Next"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
        {/* Carousel */}
        <div ref={containerRef} className="relative overflow-hidden">
          <div 
            className="flex gap-6 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * (100 / (window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1))}%)` }}
          >
            {useCases.map((useCase) => (
              <div 
                key={useCase.role}
                className="flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <div className="bg-gray-50 rounded-2xl p-8 h-full hover:bg-gray-100 transition-colors group border border-transparent hover:border-gray-200">
                  {/* Gradient Badge */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.color} mb-6 flex items-center justify-center shadow-md`}>
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
                    className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 group-hover:gap-3 transition-all"
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
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === index ? 'w-6 bg-purple-600' : 'w-2 bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
