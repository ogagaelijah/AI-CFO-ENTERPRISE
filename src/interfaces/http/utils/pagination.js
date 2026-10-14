// src/interfaces/http/utils/pagination.js
// v1.0.0 — Shared pagination helpers for list endpoints.
//
// Usage in a route:
//   const { page, limit, offset } = parsePagination(req.query);
//   const rows  = await repo.findByBusinessIdPaginated(businessId, { limit, offset });
//   const total = await repo.count('business_id = $1', [businessId]);
//   res.json({
//     success: true,
//     data: {
//       items: rows,
//       count: rows.length,
//       pagination: buildPaginationMeta({ page, limit, total }),
//     },
//   });

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Parse page and limit from Express req.query.
 * Clamps values to safe ranges. Never throws — always returns valid numbers.
 *
 * @param {Object} query - req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query = {}) {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < MIN_LIMIT) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

/**
 * Build pagination metadata for API responses.
 *
 * @param {{ page: number, limit: number, total: number }} params
 * @returns {{
 *   page: number,
 *   limit: number,
 *   total: number,
 *   totalPages: number,
 *   hasNext: boolean,
 *   hasPrev: boolean
 * }}
 */
function buildPaginationMeta({ page, limit, total }) {
    const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
    const totalPages = limit > 0 ? Math.ceil(safeTotal / limit) : 1;
    return {
        page,
        limit,
        total: safeTotal,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

/**
 * Build a paginated cache key suffix (for endpoints that cache).
 * Example: `:p2:l50`
 *
 * @param {{ page: number, limit: number }} params
 * @returns {string}
 */
function paginationCacheSuffix({ page, limit }) {
    return `:p${page}:l${limit}`;
}

module.exports = {
    parsePagination,
    buildPaginationMeta,
    paginationCacheSuffix,
    DEFAULT_LIMIT,
    MAX_LIMIT,
};