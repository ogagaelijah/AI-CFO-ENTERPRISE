
// frontend/src/pages/Landing.jsx
// v2.6.0 — Improves homepage feature descriptions and SEO keyword relevance.
// v2.5.0 — Adds Organization schema and connects it to Website and SoftwareApplication.
// v2.4.0 — Adds Schema.org structured data for Website and SoftwareApplication.
// v2.3.0 — Fixes homepage hash navigation across React Router page changes.
// v2.2.0 — Extracts pricing into a reusable PricingSection component.
// SEO — Adds page-specific metadata using react-helmet-async.

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  TrendingUp, Package, Users, FileText, BarChart3, Zap,
  ChevronRight, Smartphone
} from 'lucide-react';

import Navbar from '../components/Landing/Navbar';
import ProblemStatement from '../components/Landing/ProblemStatement';
import AboutSection from '../components/Landing/AboutSection';
import FAQSection from '../components/Landing/FAQSection';
import LoyaltyBanner from '../components/Landing/LoyaltyBanner';
import ResourcesSection from '../components/Landing/ResourcesSection';
import ContactSection from '../components/Landing/ContactSection';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';
import PricingSection from '../components/Landing/PricingSection';

const READY_INDUSTRIES = [
  'Retail / Wholesale',
  'Construction',
  'Consultancy / Services',
  'Education',
  'NGO / Non-Profit',
];

const COMING_SOON_INDUSTRIES = [
  'Manufacturing',
  'Healthcare',
  'Real Estate',
  'Logistics',
];

const Landing = () => {
  const location = useLocation();

  // Homepage animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll('.fade-in');

      elements.forEach((el) => {
        observer.observe(el);

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
          el.classList.add('visible');
        }
      });
    }, 100);

    const handleScroll = () => {
      const elements = document.querySelectorAll('.fade-in:not(.visible)');

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();

        if (rect.top < window.innerHeight - 50) {
          el.classList.add('visible');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Homepage hash navigation.
  // Handles navigation from other React Router pages as well as
  // hash changes while already on the homepage.
  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return;

    let firstFrame;
    let secondFrame;

    const targetId = decodeURIComponent(location.hash.slice(1));

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const target = document.getElementById(targetId);

        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
      <Helmet>
        {/* Structured Data — Organization, Website and Software Application */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
                            {
                "@type": "Organization",
                "@id": "https://aicfotechnologies.com/#organization",
                "name": "AI CFO Technologies Ltd",
                "url": "https://aicfotechnologies.com/",
                "brand": "AI CFO Enterprise"
              },
              {
                "@type": "WebSite",
                "@id": "https://aicfotechnologies.com/#website",
                "name": "AI CFO Enterprise",
                "url": "https://aicfotechnologies.com/",
                "description": "Official website of AI CFO Enterprise, a business management and financial analytics platform for African SMEs.",
                "inLanguage": "en",
                "publisher": {
                  "@id": "https://aicfotechnologies.com/#organization"
                }
              },
              {
                "@type": "SoftwareApplication",
                "@id": "https://aicfotechnologies.com/#software",
                "name": "AI CFO Enterprise",
                "url": "https://aicfotechnologies.com/",
                "description": "A business management and financial analytics platform that helps African SMEs track sales, inventory, expenses, debtors, cash flow, profits, and business performance.",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web browser",
                "image": "https://aicfotechnologies.com/og-image.png?v=1",
                "featureList": [
                  "Sales and income tracking",
                  "Inventory management",
                  "Debtors and creditors management",
                  "Business reports and financial analytics",
                  "Financial forecasting",
                  "AI-powered business insights"
                ],
                "publisher": {
                  "@id": "https://aicfotechnologies.com/#organization"
                }
              }
            ]
          })}
        </script>

        <title>AI CFO Enterprise | Business Management & Financial Analytics for African SMEs</title>

        <meta
          name="description"
          content="Manage your business with AI CFO Enterprise. Track sales, inventory, expenses, debtors, cash flow and profits. Get financial analytics and business insights in one platform built for African SMEs."
        />

        <meta
          name="robots"
          content="index, follow"
        />

        <link
          rel="canonical"
          href="https://aicfotechnologies.com/"
        />

        <meta
          property="og:type"
          content="website"
        />

        <meta
          property="og:site_name"
          content="AI CFO Enterprise"
        />

        <meta
          property="og:title"
          content="AI CFO Enterprise | Business Management & Financial Analytics"
        />

        <meta
          property="og:description"
          content="Track sales, inventory, expenses, debtors, cash flow and business performance with AI CFO Enterprise."
        />

        <meta
          property="og:url"
          content="https://aicfotechnologies.com/"
        />

        <meta
          property="og:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />

        <meta
          name="twitter:card"
          content="summary_large_image"
        />

        <meta
          name="twitter:title"
          content="AI CFO Enterprise | Financial Intelligence for African SMEs"
        />

        <meta
          name="twitter:description"
          content="Manage sales, inventory, cash flow and business performance in one platform."
        />

        <meta
          name="twitter:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />
      </Helmet>

      {/* Navbar */}
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center fade-in visible">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-gold-400 text-sm font-medium mb-6 border border-primary-200 dark:border-primary-700">
            <Zap className="w-4 h-4 mr-2" />
            Built for African SMEs
          </div>

          <h1 className="text-3xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight break-words">
            Manage your business like a{' '}
            <span className="text-primary-600 dark:text-gold-400">
              CFO
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto break-words">
            AI CFO ENTERPRISE helps African SMEs track sales, inventory, debtors, and profits — all in one place.
          </p>

          {/* Main Call to Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
            <Link
              to="/register"
              className="px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center"
            >
              Start 14-day free trial
              <ChevronRight className="w-5 h-5 ml-2" />
            </Link>

            <a
              href="#features"
              className="px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition inline-flex items-center justify-center"
            >
              See how it works
            </a>
          </div>

          {/* APK Download Link */}
          <div className="mt-6 flex flex-col items-center justify-center">
            <a
              href="/ai-cfo-app.apk"
              download
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm md:text-base font-medium text-gray-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-sm hover:shadow-md"
            >
              <Smartphone className="w-5 h-5 text-green-500" />
              Download the Android App
            </a>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Available as a direct download for Android devices (.apk)
            </p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            No card required · Full Pro access for 14 days
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <ProblemStatement />

      {/* About */}
      <AboutSection />

      {/* Features */}
      <section
        id="features"
        className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 fade-in">
            Everything you need to run your business
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'Sales & Income',
                desc: 'Record sales, track payments and monitor business revenue as transactions happen.'
              },
              {
                icon: Package,
                title: 'Inventory Management',
                desc: 'Monitor stock levels, track purchase costs, manage suppliers and receive low-stock alerts.'
              },
              {
                icon: Users,
                title: 'Debtors & Creditors',
                desc: 'Track customer balances and supplier obligations, monitor outstanding payments and know what is owed.'
              },
              {
                icon: FileText,
                title: 'Reports & Analytics',
                desc: 'Review daily, weekly, monthly and yearly reports to understand revenue, expenses, cash flow and profitability.'
              },
              {
                icon: BarChart3,
                title: 'Forecasting & AI',
                desc: 'Use business trends and financial forecasts to anticipate performance and receive AI-powered insights for better decisions.'
              },
              {
                icon: Zap,
                title: '9 Industries, 5 Live Today',
                desc: 'Business management and financial analytics for Retail, Consultancy / Services, Construction, Education and NGOs, with four more industries coming soon.'
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="card group fade-in"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <feature.icon className="w-10 h-10 text-primary-600 dark:text-gold-400 mb-4 group-hover:scale-110 transition-transform duration-300" />

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section
        id="industries"
        className="py-20 px-4 bg-gray-50 dark:bg-slate-900 transition-colors duration-300"
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 fade-in">
            Built for 9 Industries
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-12 fade-in">
            5 live today, more coming soon.
          </p>

          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-3 fade-in">
              ✓ Available now
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {READY_INDUSTRIES.map((industry, index) => (
                <div
                  key={industry}
                  className="card bg-white dark:bg-slate-800 p-4 text-center fade-in"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {industry}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 fade-in">
              ⏳ Coming soon
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {COMING_SOON_INDUSTRIES.map((industry, index) => (
                <div
                  key={industry}
                  className="card bg-white/60 dark:bg-slate-800/60 p-4 text-center opacity-70 fade-in border-dashed"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <span className="text-gray-500 dark:text-gray-500 font-medium">
                    {industry}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Loyalty Banner */}
      <LoyaltyBanner />

      {/* FAQ */}
      <FAQSection />

      {/* Resources */}
      <ResourcesSection />

      {/* Contact */}
      <ContactSection />

      {/* Footer */}
      <Footer />

      {/* Chat widget — landing page only */}
      <ChatWidget />
    </div>
  );
};

export default Landing;
