
import { Helmet } from 'react-helmet-async';

import Navbar from '../components/Landing/Navbar';
import ContactSection from '../components/Landing/ContactSection';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';

function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact AI CFO Enterprise | Get in Touch</title>

        <meta
          name="description"
          content="Contact AI CFO Enterprise for product enquiries, technical support and business assistance. Call, WhatsApp or email our team. We aim to respond within 24 hours."
        />

        <meta name="robots" content="index, follow" />

        <link
          rel="canonical"
          href="https://aicfotechnologies.com/contact"
        />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AI CFO Enterprise" />

        <meta
          property="og:title"
          content="Contact AI CFO Enterprise | Get in Touch"
        />

        <meta
          property="og:description"
          content="Get in touch with AI CFO Enterprise for product enquiries, support and assistance."
        />

        <meta
          property="og:url"
          content="https://aicfotechnologies.com/contact"
        />

        <meta
          property="og:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />

        <meta name="twitter:card" content="summary_large_image" />

        <meta
          name="twitter:title"
          content="Contact AI CFO Enterprise"
        />

        <meta
          name="twitter:description"
          content="Contact our team for product enquiries and support."
        />

        <meta
          name="twitter:image"
          content="https://aicfotechnologies.com/og-image.png?v=1"
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
        <Navbar />

        <main className="pt-20">
          <ContactSection headingLevel="h1" />
        </main>

        <Footer />
        <ChatWidget />
      </div>
    </>
  );
}

export default Contact;
