// DevConsole Landing Page - Interactive Scripts

document.addEventListener('DOMContentLoaded', () => {
  // =============================================
  // Navigation - Scroll Effect
  // =============================================
  const nav = document.querySelector('.nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      nav.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    } else {
      nav.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
  });

  // =============================================
  // Mobile Navigation Toggle
  // =============================================
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('nav-links-open');
      mobileToggle.classList.toggle('active');
    });
  }

  // =============================================
  // Smooth Scroll for Anchor Links
  // =============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // =============================================
  // "Say Goodbye" Section - Text Rotation
  // =============================================
  const goodbyeItems = document.querySelectorAll('.goodbye-item');
  let currentGoodbyeIndex = 0;

  function rotateGoodbye() {
    goodbyeItems.forEach((item) => {
      item.classList.remove('active');
      item.classList.add('faded');
    });
    
    goodbyeItems[currentGoodbyeIndex].classList.add('active');
    goodbyeItems[currentGoodbyeIndex].classList.remove('faded');
    
    currentGoodbyeIndex = (currentGoodbyeIndex + 1) % goodbyeItems.length;
  }

  setInterval(rotateGoodbye, 2000);

  // =============================================
  // DevTools Mockup - Tab Switching
  // =============================================
  const devToolsTabs = document.querySelectorAll('.devtools-tabs .tab');
  
  devToolsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      devToolsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // =============================================
  // AI Button Animation in Mockup
  // =============================================
  const aiButtons = document.querySelectorAll('.log-ai-btn');
  let aiButtonIndex = 0;

  function animateAIButton() {
    aiButtons.forEach(btn => btn.classList.remove('active'));
    aiButtons[aiButtonIndex].classList.add('active');
    aiButtonIndex = (aiButtonIndex + 1) % aiButtons.length;
  }

  setInterval(animateAIButton, 3000);

  // =============================================
  // Intersection Observer - Animate on Scroll
  // =============================================
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        fadeInObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe feature cards, step cards, testimonials, etc.
  const animateElements = document.querySelectorAll(
    '.feature-card, .step-card, .testimonial-card, .faq-item'
  );
  
  animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    fadeInObserver.observe(el);
  });

  // Add animation class styles
  const style = document.createElement('style');
  style.textContent = `
    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);

  // =============================================
  // Counter Animation for Stats (if added)
  // =============================================

  // =============================================
  // Parallax Effect for Gradient Blurs
  // =============================================
  const gradientBlurs = document.querySelectorAll('.gradient-blur');
  
  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    
    gradientBlurs.forEach((blur, index) => {
      const speed = 0.1 + (index * 0.05);
      blur.style.transform = `translateY(${scrollY * speed}px)`;
    });
  });

  // =============================================
  // Typing Effect for Hero (optional)
  // =============================================

  // =============================================
  // Handle Form Submissions (if forms are added)
  // =============================================
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Handle form submission
      console.log('Form submitted');
    });
  });

  // =============================================
  // Keyboard Navigation Support
  // =============================================
  document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape') {
      navLinks?.classList.remove('nav-links-open');
      mobileToggle?.classList.remove('active');
    }
  });

  // =============================================
  // Performance: Lazy Load Images (if added)
  // =============================================
  const lazyImages = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });

  lazyImages.forEach(img => imageObserver.observe(img));

  // =============================================
  // Console Easter Egg
  // =============================================
  console.log(
    '%c✨ DevConsole Landing Page',
    'font-size: 24px; font-weight: bold; color: #7C3AED; text-shadow: 2px 2px 0 #3B82F6;'
  );
  console.log(
    '%cBuilt with ❤️ for developers who demand excellence.',
    'font-size: 14px; color: #6B7280;'
  );
  console.log(
    '%cInterested in contributing? Visit: https://github.com/johnnonsoBetter/DevConsole',
    'font-size: 12px; color: #9CA3AF;'
  );
});

// =============================================
// Service Worker Registration (for PWA support)
// =============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Only register if service worker file exists
    // navigator.serviceWorker.register('/sw.js');
  });
}
