
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page Not Found | AI CFO Enterprise</title>
        <meta
          name="description"
          content="The page you are looking for could not be found."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-16">
        <div className="w-full max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-600">
            AI CFO Enterprise
          </p>

          <h1 className="mt-6 text-7xl font-bold text-slate-900">
            404
          </h1>

          <h2 className="mt-4 text-2xl font-bold text-slate-900">
            Page not found
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-600">
            Sorry, the page you are looking for does not exist,
            may have moved, or is no longer available.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/"
              className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Back to Homepage
            </Link>

            <Link
              to="/contact"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-gray-100"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default NotFound;
