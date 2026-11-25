
// frontend/src/pages/TermsOfService.jsx
// v1.0.0 — Public Terms of Service page.

import { Helmet } from 'react-helmet-async';

import Navbar from '../components/Landing/Navbar';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';

const sections = [
  {
    title: '1. About these Terms',
    content: (
      <>
        <p>
          These Terms of Service govern your access to and use of AI CFO
          Enterprise, including its website, business management tools,
          financial analytics, reports, dashboards, and related services
          (collectively, the “Service”).
        </p>
        <p>
          In these Terms, “AI CFO Enterprise”, “we”, “us”, and “our” refer to
          the operator of the Service. “You” and “your” refer to the individual
          or organisation accessing or using the Service.
        </p>
        <p>
          By creating an account, accessing, or using the Service, you agree
          to these Terms. If you do not agree, do not use the Service.
        </p>
      </>
    ),
  },
  {
    title: '2. The Service',
    content: (
      <>
        <p>
          AI CFO Enterprise provides business management and financial
          analytics tools designed to help businesses record and understand
          business activity, monitor performance, manage operational
          information, and make better-informed decisions.
        </p>
        <p>
          Depending on your plan and enabled features, the Service may include
          sales and income tracking, expense management, inventory monitoring,
          customer and supplier records, debtor and creditor tracking,
          financial reports, analytics, forecasts, risk insights, and
          AI-assisted recommendations.
        </p>
        <p>
          Features may change, improve, be added, or be discontinued as the
          Service develops. We will make reasonable efforts to communicate
          material changes that affect users.
        </p>
      </>
    ),
  },
  {
    title: '3. Account registration and security',
    content: (
      <>
        <p>
          You must provide accurate information when creating an account and
          keep your account information up to date.
        </p>
        <p>
          You are responsible for maintaining the confidentiality of your
          login credentials and for activities carried out through your
          account. You should notify us promptly if you suspect unauthorised
          access or a security issue involving your account.
        </p>
        <p>
          If you invite team members or grant other people access to your
          business account, you are responsible for ensuring that they are
          authorised to access the relevant information and understand their
          responsibilities.
        </p>
      </>
    ),
  },
  {
    title: '4. Your business data and responsibilities',
    content: (
      <>
        <p>
          You retain responsibility for the business information and records
          you enter, upload, or manage through the Service. You are responsible
          for ensuring that you have the necessary rights and permissions to
          provide that information.
        </p>
        <p>
          You should ensure that entries are accurate, complete, and kept up
          to date. AI CFO Enterprise provides tools to help organise and
          analyse information; it does not independently verify every
          transaction or business record entered by users.
        </p>
        <p>
          You should maintain your own appropriate business records and
          independent backups where necessary. Do not use the Service as the
          sole repository for information that you are legally required to
          preserve.
        </p>
      </>
    ),
  },
  {
    title: '5. Financial information and AI-generated insights',
    content: (
      <>
        <p>
          Reports, analytics, forecasts, risk indicators, and recommendations
          are generated from information available in your account and the
          capabilities of the relevant features.
        </p>
        <p>
          AI-generated insights and forecasts are informational tools. They
          are not guarantees of future results and should not be treated as
          professional accounting, audit, tax, legal, investment, or financial
          advice.
        </p>
        <p>
          You remain responsible for reviewing outputs, checking important
          figures, and making your own business decisions. Where appropriate,
          consult a qualified professional before making significant
          financial, tax, legal, or investment decisions.
        </p>
      </>
    ),
  },
  {
    title: '6. Plans, subscriptions, and payments',
    content: (
      <>
        <p>
          Some features of the Service may require a paid subscription. The
          available plans, features, prices, billing periods, and applicable
          trial offers are presented on our Pricing page or during the
          subscription process.
        </p>
        <p>
          Payments are processed by Paystack. By initiating a payment, you
          agree to provide accurate payment information and authorise the
          applicable payment transaction.
        </p>
        <p>
          AI CFO Enterprise does not store your full card details on its
          servers. Payment processing is handled by Paystack, subject to
          Paystack's own terms and policies.
        </p>
        <p>
          Your access to paid features may depend on successful payment and
          the status of your subscription. Subscription changes, renewals,
          cancellations, and any applicable refund arrangements are governed
          by the options and terms presented during purchase or within your
          account.
        </p>
      </>
    ),
  },
  {
    title: '7. Acceptable use',
    content: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for unlawful, fraudulent, or deceptive purposes.</li>
          <li>Attempt to gain unauthorised access to accounts, systems, or data.</li>
          <li>Interfere with the security, availability, or proper operation of the Service.</li>
          <li>Upload malicious code or attempt to compromise the Service.</li>
          <li>Copy, resell, or commercially exploit the Service without our written permission.</li>
          <li>Use the Service in a way that infringes another person's rights.</li>
        </ul>
        <p>
          We may restrict or suspend access where reasonably necessary to
          protect users, the Service, or our systems, or where use appears to
          violate these Terms or applicable law.
        </p>
      </>
    ),
  },
  {
    title: '8. Data protection and privacy',
    content: (
      <>
        <p>
          Our collection and use of personal information are described in our
          Privacy Policy. By using the Service, you acknowledge that you have
          had the opportunity to review that policy.
        </p>
        <p>
          We use Supabase as our database service. We apply security measures
          including encryption in transit and at rest, and restrict access to
          account information.
        </p>
        <p>
          We do not sell, rent, or monetise users' financial data. Further
          information about data handling, access, payments, backups, and
          user rights is available in our <a href="/privacy" className="text-amber-500 hover:underline">Privacy Policy</a>.
        </p>
      </>
    ),
  },
  {
    title: '9. Service availability and changes',
    content: (
      <>
        <p>
          We aim to keep the Service available and reliable, but we do not
          guarantee uninterrupted or error-free operation. Maintenance,
          upgrades, technical issues, third-party service interruptions, or
          events beyond our reasonable control may affect availability.
        </p>
        <p>
          We may update, modify, or improve the Service from time to time.
          Where practical, we will take reasonable steps to minimise
          disruption.
        </p>
      </>
    ),
  },
  {
    title: '10. Intellectual property',
    content: (
      <>
        <p>
          The Service, including its software, design, branding, interfaces,
          and original content, is owned by or licensed to AI CFO Enterprise
          and is protected by applicable intellectual property laws.
        </p>
        <p>
          We grant you a limited, non-exclusive, non-transferable right to
          access and use the Service for your legitimate business or personal
          purposes, subject to these Terms and your subscription.
        </p>
        <p>
          You retain your rights to the business information and content you
          submit to the Service. You grant us permission to process that
          information only as reasonably necessary to provide, maintain, and
          secure the Service, in accordance with our Privacy Policy.
        </p>
      </>
    ),
  },
  {
    title: '11. Suspension and termination',
    content: (
      <>
        <p>
          You may stop using the Service at any time. You can initiate account
          deletion through the account controls provided in the Service.
        </p>
        <p>
          We may suspend or restrict access where necessary for security,
          suspected misuse, legal compliance, or a material breach of these
          Terms.
        </p>
        <p>
          Ending your use of the Service does not remove obligations or
          liabilities that arose before termination. Data handling following
          account deletion is explained in our Privacy Policy.
        </p>
      </>
    ),
  },
  {
    title: '12. Disclaimers and limitation of liability',
    content: (
      <>
        <p>
          The Service is provided as a business management and financial
          analytics tool. To the extent permitted by applicable law, we do
          not guarantee that the Service will meet every business requirement
          or that every report, calculation, forecast, or recommendation will
          be free from error.
        </p>
        <p>
          You are responsible for reviewing information and decisions
          generated through the Service. Nothing in these Terms excludes
          liability that cannot lawfully be excluded or limited.
        </p>
        <p>
          To the extent permitted by applicable law, AI CFO Enterprise will
          not be liable for indirect or consequential loss arising from use
          of, or inability to use, the Service. This does not limit any
          liability that applicable law does not allow us to limit.
        </p>
      </>
    ),
  },
  {
    title: '13. Changes to these Terms',
    content: (
      <p>
        We may update these Terms as the Service or applicable requirements
        change. The revised version will be published on this page with an
        updated effective date. Continued use of the Service after an update
        takes effect means you accept the revised Terms, to the extent
        permitted by applicable law.
      </p>
    ),
  },
  {
    title: '14. Governing law',
    content: (
      <p>
        These Terms are governed by the laws of the Federal Republic of
        Nigeria, without prejudice to any mandatory consumer or data
        protection rights that apply to you under applicable law.
      </p>
    ),
  },
  {
    title: '15. Contact',
    content: (
      <p>
        If you have questions about these Terms, contact us at{' '}
        <a href="mailto:support@aicfotechnologies.com" className="text-amber-500 hover:underline">
          support@aicfotechnologies.com
        </a>.
      </p>
    ),
  },
];

function TermsOfService() {
  return (
    <>
      <Helmet>
        <title>Terms of Service | AI CFO Enterprise</title>
        <meta
          name="description"
          content="Read the Terms of Service for AI CFO Enterprise, including account responsibilities, subscriptions, acceptable use, financial analytics, and service conditions."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://aicfotechnologies.com/terms-of-service" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AI CFO Enterprise" />
        <meta property="og:title" content="Terms of Service | AI CFO Enterprise" />
        <meta
          property="og:description"
          content="The terms governing access to and use of AI CFO Enterprise."
        />
        <meta property="og:url" content="https://aicfotechnologies.com/terms-of-service" />
        <meta property="og:image" content="https://aicfotechnologies.com/og-image.png?v=1" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Terms of Service | AI CFO Enterprise" />
        <meta
          name="twitter:description"
          content="The terms governing access to and use of AI CFO Enterprise."
        />
        <meta name="twitter:image" content="https://aicfotechnologies.com/og-image.png?v=1" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 overflow-x-hidden">
        <Navbar />

        <main className="pt-28 pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-500 mb-3">
                Legal
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Terms of Service
              </h1>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                These Terms explain the conditions for accessing and using
                AI CFO Enterprise.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Effective date: 24 November 2026
              </p>
            </div>

            <div className="space-y-8">
              {sections.map((section) => (
                <section
                  key={section.title}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 md:p-8 shadow-sm"
                >
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-4 text-sm md:text-base leading-7 text-gray-600 dark:text-gray-300 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:font-medium">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>

        <Footer />
        <ChatWidget />
      </div>
    </>
  );
}

export default TermsOfService;
