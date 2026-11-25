
import { Helmet } from 'react-helmet-async';

import Navbar from '../components/Landing/Navbar';
import PricingSection from '../components/Landing/PricingSection';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';

// v1.1.0 — Refines pricing page SEO metadata for business management
//           and financial analytics search relevance.

function Pricing() {
  return (
    <>
      <Helmet>
        <title>
          AI CFO Enterprise Pricing | Business Plans for African SMEs
        </title>

        <meta
          name="description"
          content="Compare AI CFO Enterprise subscription plans for African SMEs. Explore business management, financial reporting, inventory, analytics and forecasting features with monthly and annual billing."
        />

        <meta name="robots" content="index, follow" />

        <link
          rel="canonical"
          href="https://aicfotechnologies.com/pricing"
        />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AI CFO Enterprise" />

        <meta
          property="og:title"
          content="AI CFO Enterprise Pricing | Business Plans for African SMEs"
        />

        <meta
          property="og:description"
          content="Find the right AI CFO Enterprise plan for your business. Compare business management, financial analytics, reporting and forecasting features."
        />

        <meta
          property="og:url"
          content="https://aicfotechnologies.com/pricing"
        />

        <meta
          property="og:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />

        <meta name="twitter:card" content="summary_large_image" />

        <meta
          name="twitter:title"
          content="AI CFO Enterprise Pricing | Business Plans"
        />

        <meta
          name="twitter:description"
          content="Compare subscription plans for business management and financial analytics. Choose monthly or annual billing."
        />

        <meta
          name="twitter:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
        <Navbar />

        <main className="pt-20">
          <PricingSection headingLevel="h1" />
        </main>

        <Footer />
        <ChatWidget />
      </div>
    </>
  );
}

export default Pricing;
