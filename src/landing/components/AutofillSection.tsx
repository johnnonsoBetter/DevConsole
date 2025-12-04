import { Camera, Image, Type, Wand2 } from 'lucide-react';
import React from 'react';

export const AutofillSection: React.FC = () => {
  return (
    <section className="py-32 px-6 lg:px-10 bg-gray-50 overflow-hidden border-t border-gray-200">
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
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 border border-gray-200">Alt</kbd>
                <span className="text-gray-400">+</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 border border-gray-200">`</kbd>
                <span className="text-xs text-gray-500">Open suggestions</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 border border-gray-200">Ctrl</kbd>
                <span className="text-gray-400">+</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 border border-gray-200">F</kbd>
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
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Full Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value="John Doe"
                      readOnly
                      className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-gray-900 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-medium">✓</span>
                  </div>
                </div>
                
                {/* Email Field - With Suggestion Icon */}
                <div className="relative">
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Email Address</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value="john.doe@techcorp.com"
                      readOnly
                      className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-gray-900 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-medium">✓</span>
                  </div>
                </div>
                
                {/* Phone Field - Being Filled */}
                <div className="relative">
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Phone Number</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Enter phone..."
                      readOnly
                      className="w-full px-4 py-3 bg-white border border-blue-400 ring-2 ring-blue-100 rounded-lg text-sm text-gray-400 placeholder:text-gray-300 focus:outline-none"
                    />
                    {/* Blue Autofill Icon */}
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-600 transition-colors animate-pulse">
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  
                  {/* Suggestion Dropdown */}
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-10 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Suggestions</div>
                    {[
                      '+1 (555) 123-4567',
                      '+1 (555) 234-5678',
                      '+1 (555) 345-6789',
                    ].map((phone, i) => (
                      <button
                        key={phone}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${i === 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        {phone}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Avatar Field - Image Picker */}
                <div className="relative pt-12">
                  <label className="text-xs text-gray-500 mb-1 block font-medium">Profile Picture</label>
                  <div className="relative">
                    <div className="w-full px-4 py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex justify-center gap-2 mb-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`w-12 h-12 rounded-lg bg-gradient-to-br shadow-sm ${
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
                <button className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-2 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  <Wand2 className="w-4 h-4" />
                  Fill All
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">4</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
