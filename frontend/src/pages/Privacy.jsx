
// frontend/src/pages/Privacy.jsx
// v1.0.0 — Public Privacy Policy page.

import { Helmet } from 'react-helmet-async';

import Navbar from '../components/Landing/Navbar';
import Footer from '../components/Landing/Footer';
import ChatWidget from '../components/Landing/ChatWidget';

const sections = [
  {
    title: '1. Introduction',
    content: (
      <>
        <p>
          AI CFO Enterprise respects your privacy and is committed to
          protecting the personal and business information entrusted to us.
          This Privacy Policy explains how information is collected, used,
          stored, protected, and managed when you visit our website or use
          our services.
        </p>
        <p>
          This policy applies to the AI CFO Enterprise website, applications,
          account services, and related business management and financial
          analytics features.
        </p>
        <p>
          We aim to handle personal data in accordance with applicable data
          protection laws, including the Nigeria Data Protection Act 2023
          where it applies.
        </p>
      </>
    ),
  },
  {
    title: '2. Information we collect',
    content: (
      <>
        <p>Depending on how you use the Service, we may collect:</p>
        <ul>
          <li>
            <strong>Account information:</strong> information such as your
            name, email address, login details, and account profile
            information.
          </li>
          <li>
            <strong>Business information:</strong> business profile details
            and records you enter, such as sales, income, expenses, inventory,
            customers, suppliers, debtors, creditors, and related financial
            information.
          </li>
          <li>
            <strong>Team and access information:</strong> information about
            team members you invite and the permissions assigned to them.
          </li>
          <li>
            <strong>Payment information:</strong> payment status and
            transaction-related information made available to us by our
            payment provider. Your full card details are processed by Paystack
            and are not stored on AI CFO Enterprise servers.
          </li>
          <li>
            <strong>Technical and usage information:</strong> information
            needed to operate, maintain, protect, and improve the Service,
            which may include device, browser, access, and diagnostic
            information.
          </li>
          <li>
            <strong>Communications:</strong> information you provide when
            contacting our support team or communicating with us.
          </li>
        </ul>
        <p>
          Please avoid entering personal information about other people
          unless you have the authority and a lawful reason to do so.
        </p>
      </>
    ),
  },
  {
    title: '3. How we use information',
    content: (
      <>
        <p>We use information for purposes including:</p>
        <ul>
          <li>Creating and managing user and business accounts.</li>
          <li>Providing sales, inventory, financial tracking, analytics, and reporting features.</li>
          <li>Generating forecasts, business insights, and AI-assisted recommendations where available.</li>
          <li>Processing subscriptions and confirming payment status.</li>
          <li>Managing team access and account permissions.</li>
          <li>Responding to support requests and communicating service information.</li>
          <li>Maintaining security, preventing misuse, and troubleshooting technical issues.</li>
          <li>Improving the performance and reliability of the Service.</li>
          <li>Meeting applicable legal and regulatory obligations.</li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Database, storage, and security',
    content: (
      <>
        <p>
          AI CFO Enterprise uses Supabase, a managed database platform based
          on PostgreSQL, to store and manage account and business information.
        </p>
        <p>
          Data is protected using security measures that include encryption
          in transit and at rest. Access to stored information is restricted
          and controlled.
        </p>
        <p>
          We take reasonable steps to protect information against
          unauthorised access, alteration, disclosure, loss, or misuse.
          However, no internet-based service or storage system can be
          guaranteed to be completely secure.
        </p>
      </>
    ),
  },
  {
    title: '5. Who can access your information',
    content: (
      <>
        <p>
          Your business information is accessible to you and any team members
          you explicitly invite, subject to the permissions and access
          controls available within your account.
        </p>
        <p>
          Our support team may access account information for troubleshooting
          only with your permission.
        </p>
        <p>
          We do not sell, rent, or monetise users' financial data.
        </p>
      </>
    ),
  },
  {
    title: '6. Service providers and third parties',
    content: (
      <>
        <p>
          We use third-party service providers where necessary to operate
          the Service. These providers process information in connection
          with the services they provide to us.
        </p>
        <p>
          <strong>Supabase:</strong> provides the managed database
          infrastructure used to store and manage account and business data.
        </p>
        <p>
          <strong>Paystack:</strong> processes subscription payments and
          related payment transactions. Paystack is PCI DSS Level 1
          certified. AI CFO Enterprise does not store your full card details
          on its servers. Payment processing is also subject to Paystack's
          own privacy and service terms.
        </p>
        <p>
          We do not authorise service providers to use your information for
          purposes unrelated to the services they provide, subject to their
          applicable terms and legal obligations.
        </p>
        <p>
          We may also disclose information where required by law, valid legal
          process, or to protect the rights, security, and integrity of users
          and the Service.
        </p>
      </>
    ),
  },
  {
    title: '7. Payments',
    content: (
      <>
        <p>
          Payments made through AI CFO Enterprise are processed by Paystack.
          When you make a payment, you may be redirected to or interact with
          Paystack's payment interface.
        </p>
        <p>
          We may receive transaction information such as payment status,
          transaction references, and subscription-related details needed
          to manage your account. We do not store your full card details on
          our servers.
        </p>
        <p>
          For information about how Paystack handles payment information,
          please review{' '}
          <a
            href="https://paystack.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-500 hover:underline"
          >
            Paystack's Privacy Policy
          </a>.
        </p>
      </>
    ),
  },
  {
    title: '8. Data retention, backups, and account deletion',
    content: (
      <>
        <p>
          We retain account and business information as needed to provide
          the Service, maintain account functionality, meet applicable legal
          obligations, and protect the security of the platform.
        </p>
        <p>
          Our database infrastructure uses Supabase backup capabilities to
          support recovery in the event of data loss or system failure.
          Backup copies may remain subject to the backup provider's
          retention and rotation processes.
        </p>
        <p>
          Users can initiate and carry out account deletion themselves
          through the account controls provided in the Service. Account
          deletion may affect access to associated business information and
          services.
        </p>
        <p>
          Information contained in backups may not be removed at the same
          moment as information in the active database and may remain until
          the relevant backup is rotated or expires. We handle retained
          information in accordance with applicable legal requirements.
        </p>
      </>
    ),
  },
  {
    title: '9. Your privacy rights',
    content: (
      <>
        <p>
          Subject to applicable law, you may have rights in relation to your
          personal data, including the right to:
        </p>
        <ul>
          <li>Request information about whether we process your personal data.</li>
          <li>Request access to personal data we hold about you.</li>
          <li>Request correction of inaccurate or incomplete information.</li>
          <li>Request erasure of personal data where the law provides that right.</li>
          <li>Request restriction of certain processing activities.</li>
          <li>Object to certain processing where applicable.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Lodge a complaint with the relevant data protection authority.</li>
        </ul>
        <p>
          To exercise a privacy right or ask a question about your
          information, contact us at{' '}
          <a
            href="mailto:support@aicfotechnologies.com"
            className="text-amber-500 hover:underline"
          >
            support@aicfotechnologies.com
          </a>.
        </p>
        <p>
          We may need to verify your identity before responding to a request.
          Some information may need to be retained where required or
          permitted by law.
        </p>
      </>
    ),
  },
  {
    title: '10. Cookies and similar technologies',
    content: (
      <p>
        Our website or Service may use essential browser storage, cookies,
        or similar technologies where needed for functions such as account
        access, security, preferences, and service operation. If we introduce
        optional analytics or advertising technologies, we will provide
        appropriate information and choices where required by applicable law.
      </p>
    ),
  },
  {
    title: '11. International data processing',
    content: (
      <p>
        Our service providers may process or store information in locations
        outside your country, depending on their infrastructure and service
        configuration. Where personal data is transferred across borders,
        we aim to ensure that the transfer is handled in accordance with
        applicable data protection requirements and appropriate safeguards.
      </p>
    ),
  },
  {
    title: '12. Children’s privacy',
    content: (
      <p>
        AI CFO Enterprise is a business management service and is not
        intended for children to use independently. We do not knowingly
        collect personal information from children in a manner that
        violates applicable law. If you believe a child has provided
        personal information improperly, please contact us.
      </p>
    ),
  },
  {
    title: '13. Changes to this Privacy Policy',
    content: (
      <p>
        We may update this Privacy Policy when our services, data practices,
        or legal obligations change. Updated versions will be published on
        this page with a revised effective date. We encourage you to review
        this page periodically.
      </p>
    ),
  },
  {
    title: '14. Contact us',
    content: (
      <>
        <p>
          If you have questions, concerns, or requests relating to this
          Privacy Policy or the handling of your personal information,
          contact us:
        </p>
        <p>
          <strong>AI CFO Enterprise</strong>
          <br />
          Email:{' '}
          <a
            href="mailto:support@aicfotechnologies.com"
            className="text-amber-500 hover:underline"
          >
            support@aicfotechnologies.com
          </a>
        </p>
      </>
    ),
  },
];

function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | AI CFO Enterprise</title>
        <meta
          name="description"
          content="Learn how AI CFO Enterprise collects, uses, stores, protects, and manages personal and business information, including Supabase storage and Paystack payments."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://aicfotechnologies.com/privacy" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AI CFO Enterprise" />
        <meta property="og:title" content="Privacy Policy | AI CFO Enterprise" />
        <meta
          property="og:description"
          content="How AI CFO Enterprise handles and protects your personal and business information."
        />
        <meta property="og:url" content="https://aicfotechnologies.com/privacy" />
        <meta property="og:image" content="https://aicfotechnologies.com/og-image.png?v=1" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Privacy Policy | AI CFO Enterprise" />
        <meta
          name="twitter:description"
          content="How AI CFO Enterprise handles and protects your personal and business information."
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
                Privacy Policy
              </h1>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Your business information matters. This policy explains how
                AI CFO Enterprise handles information when you use our
                platform.
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

export default Privacy;
