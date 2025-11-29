import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import React, { useRef } from 'react';

const blogPosts = [
  {
    title: 'Introducing Antigravity: The Agent-First IDE',
    date: 'Nov 24, 2025',
    category: 'Product',
    image: 'bg-gradient-to-br from-purple-500 to-blue-600',
    link: '#'
  },
  {
    title: 'How to Build Self-Healing Applications',
    date: 'Nov 18, 2025',
    category: 'Engineering',
    image: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    link: '#'
  },
  {
    title: 'The Future of AI-Assisted Development',
    date: 'Nov 12, 2025',
    category: 'Vision',
    image: 'bg-gradient-to-br from-amber-500 to-orange-600',
    link: '#'
  }
];

export const BlogSection: React.FC = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <section ref={containerRef} id="blog" className="py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        <div className="flex items-end justify-between mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Latest from the blog</h2>
            <p className="text-lg text-gray-600">Insights and updates from the team.</p>
          </motion.div>
          
          <a href="#" className="hidden md:flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors group">
            View all posts
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.a
              key={index}
              href={post.link}
              className="group cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className={`aspect-[16/9] rounded-2xl ${post.image} mb-6 overflow-hidden relative`}>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{post.category}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-500">{post.date}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {post.title}
              </h3>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};
