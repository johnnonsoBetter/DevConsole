import { motion, useInView, type Variants } from 'framer-motion';
import { ArrowRight, CheckCircle2, Image, MousePointer2, Sparkles, Type, Users, Wand2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { staggerContainer } from './animations';

// Local fadeInUp variant with correct typing
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

// Persona data
const personas = [
  { name: 'John Doe', email: 'john@techcorp.com', avatar: 'from-blue-400 to-purple-500' },
  { name: 'Sarah Chen', email: 'sarah@startup.io', avatar: 'from-pink-400 to-rose-500' },
  { name: 'Mike Wilson', email: 'mike@agency.co', avatar: 'from-amber-400 to-orange-500' },
  { name: 'Emma Davis', email: 'emma@design.studio', avatar: 'from-emerald-400 to-teal-500' },
  { name: 'Alex Kumar', email: 'alex@dev.com', avatar: 'from-violet-400 to-purple-600' },
];

// Autofill mockup with animated form
const AutofillMockup: React.FC = () => {
  const [currentPersona, setCurrentPersona] = useState(0);
  const [filledFields, setFilledFields] = useState<string[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => { setFilledFields(['name']); setPhase(2); }, 1000),
      setTimeout(() => { setFilledFields(['name', 'email']); setPhase(3); }, 1500),
      setTimeout(() => { setShowSuggestion(true); setPhase(4); }, 2000),
      setTimeout(() => { setFilledFields(['name', 'email', 'phone']); setShowSuggestion(false); setPhase(5); }, 2800),
      setTimeout(() => { setFilledFields(['name', 'email', 'phone', 'company']); setPhase(6); }, 3300),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const persona = personas[currentPersona];

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/20 rounded-3xl blur-3xl" />
      
      <div className="relative bg-white rounded-2xl  overflow-hidden">
        {/* Browser chrome */}
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors cursor-pointer" />
              <span className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors cursor-pointer" />
            </div>
            <div className="flex-1 ml-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 max-w-xs">
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-500 font-mono truncate">acme-app.com/signup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
          {/* Form Header */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Create Account</h3>
            <p className="text-sm text-gray-500">Fill in your details to get started</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name Field */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Full Name</label>
              <div className="relative">
                <input 
                  type="text"
                  value={filledFields.includes('name') ? persona.name : ''}
                  readOnly
                  placeholder="Enter your name"
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                    filledFields.includes('name')
                      ? 'bg-emerald-50 border-2 border-emerald-300 text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-400 placeholder:text-gray-300'
                  }`}
                />
                {filledFields.includes('name') && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </motion.span>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email Address</label>
              <div className="relative">
                <input 
                  type="email"
                  value={filledFields.includes('email') ? persona.email : ''}
                  readOnly
                  placeholder="you@example.com"
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                    filledFields.includes('email')
                      ? 'bg-emerald-50 border-2 border-emerald-300 text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-400 placeholder:text-gray-300'
                  }`}
                />
                {filledFields.includes('email') && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </motion.span>
                )}
              </div>
            </div>

            {/* Phone Field with Suggestion */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Phone Number</label>
              <div className="relative">
                <input 
                  type="tel"
                  value={filledFields.includes('phone') ? '+1 (555) 123-4567' : ''}
                  readOnly
                  placeholder="(555) 000-0000"
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                    filledFields.includes('phone')
                      ? 'bg-emerald-50 border-2 border-emerald-300 text-gray-900'
                      : showSuggestion
                      ? 'bg-white border-2 border-blue-400 ring-4 ring-blue-100 text-gray-400'
                      : 'bg-white border border-gray-200 text-gray-400 placeholder:text-gray-300'
                  }`}
                />
                {filledFields.includes('phone') && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </motion.span>
                )}
                
                {/* Autofill trigger icon */}
                {!filledFields.includes('phone') && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -right-12 top-1/2 -translate-y-1/2"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 animate-pulse cursor-pointer">
                      <Wand2 className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Suggestion Dropdown */}
              {showSuggestion && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-20"
                >
                  <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Smart Suggestions
                  </div>
                  {['+1 (555) 123-4567', '+1 (555) 234-5678', '+1 (555) 345-6789'].map((phone, i) => (
                    <button
                      key={phone}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                        i === 0 ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-mono">{phone}</span>
                      {i === 0 && <span className="text-[10px] text-blue-500 font-semibold">Recommended</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Company Field */}
            <div className="relative">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Company</label>
              <div className="relative">
                <input 
                  type="text"
                  value={filledFields.includes('company') ? 'TechCorp Inc.' : ''}
                  readOnly
                  placeholder="Your company name"
                  className={`w-full px-4 py-3 rounded-xl text-sm transition-all ${
                    filledFields.includes('company')
                      ? 'bg-emerald-50 border-2 border-emerald-300 text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-400 placeholder:text-gray-300'
                  }`}
                />
                {filledFields.includes('company') && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          {/* Fill All Button */}
          {phase >= 6 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">4 fields filled</span>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-sm font-semibold rounded-full flex items-center gap-2 shadow-lg shadow-purple-500/30">
                <Wand2 className="w-4 h-4" />
                <span>Fill All</span>
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">4</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Persona Selector - Bottom */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Active Persona</span>
            <div className="flex items-center gap-2">
              {personas.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPersona(i)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.avatar} transition-all ${
                    i === currentPersona ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Keyboard shortcut display
const KeyboardShortcut: React.FC<{ keys: string[]; label: string }> = ({ keys, label }) => (
  <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-700 border border-gray-200 shadow-[0_2px_0_0_#e5e7eb]">
            {key}
          </kbd>
          {i < keys.length - 1 && <span className="text-gray-300 text-xs">+</span>}
        </React.Fragment>
      ))}
    </div>
    <span className="text-sm text-gray-600">{label}</span>
  </div>
);

export const AutofillSectionNew: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 px-6 lg:px-10 bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden">
      <motion.div 
        ref={ref}
        className="max-w-[1400px] mx-auto"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div variants={fadeInUp} className="lg:order-1 order-2">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200/50 rounded-full mb-6">
              <Wand2 className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700">Smart Autofill</span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6 leading-[1.15]">
              Fill forms in<br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                milliseconds
              </span>
            </h2>

            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Intelligent field detection that understands context. 5 rotating personas, 
              Unsplash images for file inputs, and one-click "Fill All" functionality.
            </p>

            {/* Feature Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Type, title: 'Smart Detection', desc: '15+ field types auto-detected' },
                { icon: Users, title: 'Persona Rotation', desc: '5 profiles that never repeat' },
                { icon: Image, title: 'Unsplash Images', desc: 'Beautiful placeholder photos' },
                { icon: MousePointer2, title: 'One-Click Fill', desc: 'Fill entire forms instantly' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Keyboard Shortcuts */}
            <div className="flex flex-wrap gap-3 mb-8">
              <KeyboardShortcut keys={['Alt', '`']} label="Open suggestions" />
              <KeyboardShortcut keys={['Ctrl', 'F']} label="Fill all fields" />
            </div>

            {/* CTA */}
            <button className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all">
              <span>Try Smart Autofill</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* Right - Visual */}
          <motion.div variants={fadeInUp} className="lg:order-2 order-1">
            <AutofillMockup />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};
