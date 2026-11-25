
import { Helmet } from 'react-helmet-async';

import Navbar from '../components/Landing/Navbar';
import ResourcesSection from '../components/Landing/ResourcesSection';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';

function Resources() {
  return (
    <>
      <Helmet>
        <title>AI CFO Resources | Business Guides, Videos & Financial Insights</title>

        <meta
          name="description"
          content="Explore AI CFO Enterprise resources for African SMEs, including practical business guides, financial education, tutorials, videos and articles on business management and financial analytics."
        />

        <meta name="robots" content="index, follow" />

        <link
          rel="canonical"
          href="https://aicfotechnologies.com/resources"
        />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AI CFO Enterprise" />

        <meta
          property="og:title"
          content="AI CFO Resources | Guides, Videos & Financial Insights"
        />

        <meta
          property="og:description"
          content="Learn how to manage and grow your business with practical financial guides, tutorials, videos and articles from AI CFO Enterprise."
        />

        <meta
          property="og:url"
          content="https://aicfotechnologies.com/resources"
        />

        <meta
          property="og:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />

        <meta name="twitter:card" content="summary_large_image" />

        <meta
          name="twitter:title"
          content="AI CFO Resources"
        />

        <meta
          name="twitter:description"
          content="Explore business guides, financial insights and tutorials for African SMEs."
        />

        <meta
          name="twitter:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
        <Navbar />

        <main className="pt-20">
          <ResourcesSection headingLevel="h1" />
        </main>

        <Footer />
        <ChatWidget />
      </div>
    </>
  );
}

export default Resources;
