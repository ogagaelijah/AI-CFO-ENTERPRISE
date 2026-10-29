// frontend/src/hooks/usePaginatedApi.js
// v1.4.0-prod — Fixes browser history pollution. Uses replace:true so
//               pagination doesn't add new back-button entries.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const readIntParam = (sp, key, fallback) => {
  const raw = sp.get(key);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};

const extractItemsPaginationExtra = (body, itemKey) => {
  if (!body || typeof body !== 'object') {
    return { items: [], pagination: null, extra: {} };
  }

  const dataBag =
    body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? body.data
      : null;

  const items =
    (dataBag && Array.isArray(dataBag[itemKey]) && dataBag[itemKey]) ||
    (dataBag && Array.isArray(dataBag.items) && dataBag.items) ||
    (Array.isArray(body[itemKey]) && body[itemKey]) ||
    (Array.isArray(body.data) && body.data) ||
    [];

  const pagination =
    (dataBag && dataBag.pagination) ||
    body.pagination ||
    null;

  const extra = {};
  const skipKeys = new Set([itemKey, 'items', 'pagination']);

  if (dataBag) {
    for (const k of Object.keys(dataBag)) {
      if (!skipKeys.has(k)) extra[k] = dataBag[k];
    }
  }
  for (const k of Object.keys(body)) {
    if (k === 'data') continue;
    if (skipKeys.has(k)) continue;
    if (k === 'success' || k === 'message') continue;
    extra[k] = body[k];
  }

  return { items, pagination, extra };
};

export default function usePaginatedApi(url, options = {}) {
  const {
    itemKey = 'items',
    params = {},
    initialLimit = 10,
    enabled = true,
    resetPageOnParamsChange = true,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [extra, setExtra] = useState({});
  const [isLoading, setIsLoading] = useState(enabled);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef(null);
  const paramsKey = JSON.stringify(params || {});
  const prevParamsKeyRef = useRef(paramsKey);

  const urlPage = readIntParam(searchParams, 'page', 1);
  const urlLimit = readIntParam(searchParams, 'limit', initialLimit);

  const fetchPage = useCallback(
    async (page, limit, { signal } = {}) => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(url, {
          params: { page, limit, ...params },
          signal,
        });
        const { items: rows, pagination: p, extra: x } =
          extractItemsPaginationExtra(response.data, itemKey);
        setItems(rows);
        setPagination(p);
        setExtra(x);
        setHasLoadedOnce(true);
      } catch (err) {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setError(err?.response?.data?.message || 'Failed to load data');
        setItems([]);
        setPagination(null);
        setExtra({});
        setHasLoadedOnce(true);
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, itemKey, paramsKey]
  );

  useEffect(() => {
    if (!enabled) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchPage(urlPage, urlLimit, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [urlPage, urlLimit, fetchPage, enabled]);

  useEffect(() => {
    if (!resetPageOnParamsChange) return;
    if (prevParamsKeyRef.current === paramsKey) return;
    prevParamsKeyRef.current = paramsKey;
    if (urlPage !== 1) {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          sp.delete('page');
          return sp;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    if (!enabled) return;
    if (isLoading) return;
    if (error) return;
    if (!pagination) return;

    const totalPages = pagination.totalPages;

    if (totalPages === 0 && urlPage > 1) {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          sp.delete('page');
          return sp;
        },
        { replace: true }
      );
      return;
    }

    if (totalPages > 0 && urlPage > totalPages) {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (totalPages === 1) sp.delete('page');
          else sp.set('page', String(totalPages));
          return sp;
        },
        { replace: true }
      );
    }
  }, [enabled, isLoading, error, pagination, urlPage, setSearchParams]);

  const goToPage = useCallback(
    (nextPage) => {
      const safe = Math.max(1, parseInt(nextPage, 10) || 1);
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (safe === 1) sp.delete('page');
          else sp.set('page', String(safe));
          return sp;
        },
        { replace: true } // ★ FIXED: No new history entry
      );
    },
    [setSearchParams]
  );

  const setLimit = useCallback(
    (newLimit) => {
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          if (newLimit === initialLimit) sp.delete('limit');
          else sp.set('limit', String(newLimit));
          sp.delete('page');
          return sp;
        },
        { replace: true } // ★ FIXED: No new history entry
      );
    },
    [setSearchParams, initialLimit]
  );

  const refresh = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchPage(urlPage, urlLimit, { signal: controller.signal });
  }, [fetchPage, urlPage, urlLimit]);

  return {
    items,
    pagination,
    extra,
    isLoading,
    isInitialLoading: isLoading && !hasLoadedOnce,
    error,
    goToPage,
    setLimit,
    currentLimit: urlLimit,
    refresh,
  };
}