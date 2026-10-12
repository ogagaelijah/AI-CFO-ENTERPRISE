// frontend/src/components/Landing/ResourcesSection.jsx
// v1.0.0 — Videos + Blog + Guides. Filter tabs, responsive grid, placeholder mode.
//           Mounts between FAQ and Footer on the landing page.

import { useState } from 'react';
import { Play, FileText, BookOpen, Clock, ExternalLink } from 'lucide-react';
import { RESOURCES, PLACEHOLDER_MODE } from '../../data/resources';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'blog', label: 'Blog' },
  { key: 'guide', label: 'Guides' },
];

const TYPE_META = {
  video: { label: 'Video', Icon: Play, badgeClass: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-gold-400' },
  blog: { label: 'Blog', Icon: FileText, badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  guide: { label: 'Guide', Icon: BookOpen, badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
};

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

function ResourceCard({ resource }) {
  const meta = TYPE_META[resource.type] || TYPE_META.blog;
  const { Icon } = meta;
  const isClickable = !resource.isPlaceholder && resource.url && resource.url !== '#';

  const Wrapper = isClickable ? 'a' : 'div';
  const wrapperProps = isClickable
    ? { href: resource.url, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`card group flex flex-col overflow-hidden text-left transition ${
        isClickable ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : 'opacity-90'
      }`}
    >
      {/* Thumbnail / placeholder */}
      <div className="relative w-full aspect-video bg-primary-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
        {resource.thumbnail ? (
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <Icon className="w-12 h-12 text-primary-500 dark:text-gold-400/60" strokeWidth={1.5} />
        )}

        {resource.duration && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-medium text-white bg-black/70 rounded">
            {resource.duration}
          </span>
        )}

        {resource.isPlaceholder && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold text-amber-800 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-200 rounded">
            Coming soon
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${meta.badgeClass}`}>
            <Icon className="w-3 h-3" />
            {meta.label}
          </span>
          {resource.date && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(resource.date)}</span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
          {resource.title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
          {resource.description}
        </p>

        {isClickable && (
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-gold-400 group-hover:gap-2 transition-all">
            {resource.type === 'video' ? 'Watch' : 'Read'}
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default function ResourcesSection() {
  const [filter, setFilter] = useState('all');

  const visible = filter === 'all'
    ? RESOURCES
    : RESOURCES.filter((r) => r.type === filter);

  return (
    <section id="resources" className="py-20 px-4 bg-white dark:bg-slate-800 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Resources
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Learn how to grow your business with AI CFO — videos, blog posts, and practical guides.
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-900 rounded-full p-1">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = f.key === 'all'
                ? RESOURCES.length
                : RESOURCES.filter((r) => r.type === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {f.label}
                  <span className="ml-1.5 text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            Nothing here yet — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((resource, i) => (
              <ResourceCard key={`${resource.type}-${i}`} resource={resource} />
            ))}
          </div>
        )}

        {/* Footer note */}
        {PLACEHOLDER_MODE && (
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              More content is on the way. Subscribe to be the first to know.
            </p>
            <a
              href="https://youtube.com/@CFOTECHNOLOGIES"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 dark:bg-gold-500 dark:text-slate-900 dark:hover:bg-gold-600 rounded-lg transition shadow-sm"
            >
              <Play className="w-4 h-4" />
              Subscribe on YouTube
            </a>
          </div>
        )}
      </div>
    </section>
  );
}