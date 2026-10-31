// mobile/src/screens/InventoryScreen.js
// v2.5.0-prod — Summary cards + low-stock banner now come from ONE source:
// GET /inventory/summary (live SQL aggregate over the whole business, uncached).
// Dashboard call removed. Pagination read from the real response shape
// (res.data.pagination), working Next/Prev with page clamping, server-side search,
// per-view cache so revisiting a page/size is instant, stale-response protection.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZES = [10, 25, 50, 75, 100];
const SEARCH_DEBOUNCE_MS = 400;
const CACHE_MAX_ENTRIES = 40;

// ───────────── Helpers ─────────────
const pickNum = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '' && !isNaN(Number(obj[k]))) return Number(obj[k]);
  }
  return undefined;
};

const fmt = (n) => (n === undefined || n === null ? '…' : Number(n).toLocaleString());

// Backend shape: { success, data: [items], summary, pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
const extractList = (resData) => {
  const raw = resData?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(resData)) return resData;
  return [];
};

const readPagination = (resData, requestedLimit, listLength) => {
  const p = resData?.pagination || resData?.data?.pagination || null;
  const total = pickNum(p, ['total', 'totalItems', 'total_items', 'count']);
  const effectiveLimit = pickNum(p, ['limit', 'perPage', 'per_page', 'pageSize']) || requestedLimit || 10;
  let totalPages = pickNum(p, ['totalPages', 'total_pages', 'pages', 'pageCount']);
  if (totalPages === undefined && total !== undefined) totalPages = Math.ceil(total / effectiveLimit);
  return {
    total: total !== undefined ? total : listLength,
    totalPages: Math.max(1, totalPages || 1),
  };
};

// Normalises the /inventory/summary payload
const normalizeSummary = (s) => {
  if (!s) return null;
  return {
    items: pickNum(s, ['total_items', 'totalItems', 'count']),
    qty: pickNum(s, ['total_quantity', 'totalQuantity', 'total_qty']),
    value: pickNum(s, ['total_selling_value', 'totalSellingValue', 'total_value', 'totalValue']),
    profit: pickNum(s, ['total_profit', 'potential_profit', 'totalProfit']),
  };
};

const isComplete = (n) => !!n && [n.items, n.qty, n.value, n.profit].every(v => v !== undefined);

export const InventoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { isReadOnly } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Refs so the focus listener always sees the latest values
  const pageRef = useRef(1);
  const limitRef = useRef(10);
  const searchRef = useRef('');
  const reqIdRef = useRef(0);
  const cacheRef = useRef(new Map());
  pageRef.current = page;
  limitRef.current = limit;
  searchRef.current = debouncedSearch;

  // ───────────── Global summary (never depends on page / limit / search) ─────────────
  const fetchSummary = async () => {
    let invSummary = null;
    try {
      const r = await api.get(`/inventory/summary?_t=${Date.now()}`);
      invSummary = r.data?.data || null;
    } catch (e) {
      console.log('Could not load /inventory/summary', e.message);
    }

    const fromInventory = normalizeSummary(invSummary);
    if (isComplete(fromInventory)) {
      setSummaryData({
        ...fromInventory,
        lowStock: pickNum(invSummary, ['low_stock_count', 'lowStockCount']) || 0,
        lowStockItems: Array.isArray(invSummary.lowStockItems) ? invSummary.lowStockItems : [],
      });
      return;
    }

    console.log('Inventory summary incomplete, keys received:', invSummary ? Object.keys(invSummary) : null);

    // Backup: sum across ALL pages (never just the current page, never filtered by search)
    try {
      let p = 1, tp = 1, items = 0, qty = 0, value = 0, profit = 0;
      const low = [];
      do {
        const r = await api.get(`/inventory?page=${p}&limit=100`);
        const arr = extractList(r.data);
        arr.forEach(i => {
          const q = Number(i.quantity) || 0;
          const sp = Number(i.selling_price) || 0;
          const cp = Number(i.cost_price) || 0;
          const rl = i.reorder_level !== undefined && i.reorder_level !== null ? Number(i.reorder_level) : 5;
          items += 1;
          qty += q;
          value += q * sp;
          profit += q * (sp - cp);
          if (q <= rl) low.push({ id: i.id, item_name: i.item_name, quantity: q });
        });
        tp = readPagination(r.data, 100, arr.length).totalPages;
        p++;
      } while (p <= tp && p <= 50);

      low.sort((a, b) => a.quantity - b.quantity);
      setSummaryData({ items, qty, value, profit, lowStock: low.length, lowStockItems: low.slice(0, 20) });
    } catch (e) {
      console.log('Fallback summary failed', e.message);
    }
  };

  // ───────────── Paginated + searched list ─────────────
  const applyList = (entry) => {
    setInventory(entry.list);
    setTotalPages(entry.totalPages);
    setTotalItems(entry.total);
  };

  const fetchInventory = async (pageNum = 1, currentLimit = 10, query = '') => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      let url = `/inventory?page=${pageNum}&limit=${currentLimit}`;
      if (query) url += `&search=${encodeURIComponent(query)}`;

      const res = await api.get(url);
      if (reqId !== reqIdRef.current) return; // a newer request replaced this one

      const list = extractList(res.data);
      const pg = readPagination(res.data, currentLimit, list.length);
      const entry = { list, total: pg.total, totalPages: pg.totalPages };

      // Remember this view so coming back to it is instant
      const cache = cacheRef.current;
      if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
      cache.set(`${pageNum}|${currentLimit}|${query}`, entry);

      applyList(entry);

      // If we are beyond the last page (e.g. items were deleted), jump back to the last real page
      if (pageNum > pg.totalPages) {
        setPage(pg.totalPages);
      }
    } catch (error) {
      if (reqId !== reqIdRef.current) return;
      console.error(error);
    } finally {
      if (reqId === reqIdRef.current) {
        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Debounce the search box, and jump back to page 1 when the term changes
  useEffect(() => {
    const t = setTimeout(() => {
      const q = searchQuery.trim();
      if (q !== debouncedSearch) {
        setDebouncedSearch(q);
        setPage(1);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery, debouncedSearch]);

  // Page / limit / search changes only refetch the list (summary is untouched).
  // If we've seen this exact view before, show it immediately and refresh quietly behind it.
  useEffect(() => {
    const cached = cacheRef.current.get(`${page}|${limit}|${debouncedSearch}`);
    if (cached) applyList(cached);
    fetchInventory(page, limit, debouncedSearch);
  }, [page, limit, debouncedSearch]);

  // Summary loads on mount and whenever the screen regains focus (e.g. after add/edit)
  useEffect(() => {
    fetchSummary();
    const unsubscribe = navigation.addListener('focus', () => {
      cacheRef.current.clear(); // data may have changed while we were away
      fetchInventory(pageRef.current, limitRef.current, searchRef.current);
      fetchSummary();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    cacheRef.current.clear();
    fetchInventory(page, limit, debouncedSearch);
    fetchSummary();
  };

  const handleLimitChange = (newLimit) => {
    if (newLimit === limit) return;
    setLimit(newLimit);
    setPage(1);
  };

  const handleNextPage = () => {
    setPage(prev => (prev < totalPages ? prev + 1 : prev));
  };

  const handlePrevPage = () => {
    setPage(prev => (prev > 1 ? prev - 1 : prev));
  };

  // Safety net: filters the visible page by name instantly while the server search is on its way
  // (and keeps working if the backend ever ignores `search`).
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return inventory;
    const lowerQuery = searchQuery.trim().toLowerCase();
    return inventory.filter(item => item.item_name?.toLowerCase().includes(lowerQuery));
  }, [inventory, searchQuery]);

  const renderPaginationControls = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.border, marginTop: 8 }}>
      <TouchableOpacity onPress={handlePrevPage} disabled={page <= 1} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, opacity: page <= 1 ? 0.3 : 1 }}>
        <Ionicons name="chevron-back" size={20} color={theme.primary} />
        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Prev</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '600' }}>
        Page {page} of {totalPages} ({totalItems} {debouncedSearch ? 'found' : 'total'})
      </Text>

      <TouchableOpacity onPress={handleNextPage} disabled={page >= totalPages} style={{ flexDirection: 'row', alignItems: 'center', padding: 8, opacity: page >= totalPages ? 0.3 : 1 }}>
        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Next</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );

  // Full-screen spinner only on the very first load, so the search box never unmounts while typing
  if (initialLoading) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  // Summary cards always come from the global summary, never from the current page
  const displayTotalItems = summaryData ? summaryData.items : '…';
  const displayTotalQty = summaryData ? summaryData.qty : '…';
  const displayTotalValue = summaryData ? summaryData.value : undefined;
  const displayProfit = summaryData ? summaryData.profit : undefined;
  const displayLowStockCount = summaryData?.lowStock !== undefined ? summaryData.lowStock : 0;
  const displayLowStockItems = summaryData?.lowStockItems || [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>Inventory</Text>
        <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Stock on hand and valuation</Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 8, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, marginBottom: 12 }}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: theme.text }}
            placeholder="Search all inventory..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        style={{ flex: 1, paddingHorizontal: 16 }}
        data={filteredInventory}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListFooterComponent={renderPaginationControls}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            {displayLowStockCount > 0 && (
              <View style={{ backgroundColor: theme.isDark ? '#3f2a00' : '#fffbeb', borderColor: theme.warning, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="warning" size={18} color={theme.warning} />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.warning, marginLeft: 6 }}>
                    {displayLowStockCount} items below reorder level
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>Consider reordering soon to avoid stockouts.</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {displayLowStockItems.slice(0, 10).map((item, idx) => (
                    <View key={item.id || idx} style={{ backgroundColor: theme.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ fontSize: 12, color: theme.warning, fontWeight: '600' }}>{item.item_name} ({item.quantity})</Text>
                    </View>
                  ))}
                  {displayLowStockItems.length > 10 && (
                    <Text style={{ fontSize: 12, color: theme.textMuted, alignSelf: 'center' }}>+{displayLowStockItems.length - 10} more</Text>
                  )}
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#1e293b' : '#eef2ff', borderColor: theme.primary + '40' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#818cf8' : '#4f46e5', fontWeight: '600' }}>Total Items</Text>
                  <Ionicons name="cube-outline" size={18} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.primary, marginTop: 8 }}>{displayTotalItems}</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#1e1b4b' : '#f5f3ff', borderColor: '#8b5cf640' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#a78bfa' : '#7c3aed', fontWeight: '600' }}>Total Qty</Text>
                  <Ionicons name="layers-outline" size={18} color="#8b5cf6" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#8b5cf6', marginTop: 8 }}>{displayTotalQty}</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#064e3b' : '#ecfdf5', borderColor: '#10b98140' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#34d399' : '#059669', fontWeight: '600' }}>Total Value</Text>
                  <Ionicons name="cash-outline" size={18} color="#10b981" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10b981', marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                  ₦{fmt(displayTotalValue)}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.isDark ? '#3b0764' : '#faf5ff', borderColor: '#d8b4fe40' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, color: theme.isDark ? '#d8b4fe' : '#9333ea', fontWeight: '600' }}>Potential Profit</Text>
                  <Ionicons name="trending-up" size={18} color="#d8b4fe" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d8b4fe', marginTop: 8 }} numberOfLines={1} adjustsFontSizeToFit>
                  ₦{fmt(displayProfit)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0 }]}>
                  {debouncedSearch ? 'Search Results' : 'All Items'}
                </Text>
                {loading && <ActivityIndicator size="small" color={theme.primary} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, color: theme.textMuted }}>Show:</Text>
                {PAGE_SIZES.map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardBg }, limit === size && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => handleLimitChange(size)}
                  >
                    <Text style={[{ fontSize: 11, fontWeight: 'bold', color: theme.textMuted }, limit === size && { color: '#fff' }]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 20, color: theme.textMuted }}>
            {loading ? 'Loading...' : searchQuery ? 'No items match your search.' : 'No items in inventory'}
          </Text>
        }
        renderItem={({ item }) => {
          const itemValue = Number(item.quantity) * Number(item.selling_price);
          const packs = item.packs || [];

          return (
            <TouchableOpacity
              style={[styles.invCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => navigation.navigate('AddEditInventory', { item })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{item.item_name}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  {item.quantity} {item.base_unit || 'Pieces'} @ ₦{Number(item.selling_price).toLocaleString()}
                </Text>

                {packs.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {packs.slice(0, 3).map((p, idx) => (
                      <View key={p.id || idx} style={{ backgroundColor: '#2563EB15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#2563EB', fontWeight: '600' }}>
                          {p.pack_name} x{p.multiplier} — ₦{Number(p.selling_price).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                    {packs.length > 3 && (
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: theme.textMuted }}>+{packs.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.success }}>₦{itemValue.toLocaleString()}</Text>
                  <Text style={{ fontSize: 10, color: theme.textMuted }}>Total Value</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} style={{ alignSelf: 'center' }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {!isReadOnly && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('AddEditInventory')}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  invCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1 },
  statCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
});