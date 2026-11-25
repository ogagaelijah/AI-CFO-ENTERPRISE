
import { Helmet } from 'react-helmet-async';

import Navbar from '../components/Landing/Navbar';
import AboutSection from '../components/Landing/AboutSection';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';

function About() {
  return (
    <>
      <Helmet>
        <title>About AI CFO Enterprise | Our Mission and Business Intelligence Platform</title>

        <meta
          name="description"
          content="Discover AI CFO Enterprise, a financial analytics and business management platform helping African SMEs track performance, understand their finances and make better business decisions."
        />

        <meta name="robots" content="index, follow" />

        <link
          rel="canonical"
          href="https://aicfotechnologies.com/about"
        />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AI CFO Enterprise" />
        <meta
          property="og:title"
          content="About AI CFO Enterprise | Financial Intelligence for African SMEs"
        />
        <meta
          property="og:description"
          content="Learn how AI CFO Enterprise helps African businesses understand their numbers, identify risks and make smarter decisions."
        />
        <meta
          property="og:url"
          content="https://aicfotechnologies.com/about"
        />
        <meta
          property="og:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />

        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="About AI CFO Enterprise"
        />
        <meta
          name="twitter:description"
          content="Financial intelligence and business management for African SMEs."
        />
        <meta
          name="twitter:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-slate-950">
        <Navbar />

        <main>
          <AboutSection headingLevel="h1" />
        </main>

        <Footer />
        <ChatWidget />
      </div>
    </>
  );
}

export default About;
