// src/infrastructure/database/sqlite/repositories/TeamInviteRepository.js
// v1.1.0-prod — Pending team invitations. Adds platform_role for platform staff.

const BaseRepository = require('./BaseRepository');

// ─────────────────────────────────────────────
// TeamInvite Entity
// ─────────────────────────────────────────────
class TeamInvite {
    constructor(data) {
        this.id = data.id || null;
        this.businessId = data.businessId || null;
        this.email = data.email || null;
        this.role = data.role || null;
        this.tokenHash = data.tokenHash || null;
        this.invitedBy = data.invitedBy || null;
        this.expiresAt = data.expiresAt || null;
        this.acceptedAt = data.acceptedAt || null;
        this.createdAt = data.createdAt || new Date();
        this.platformRole = data.platformRole || null; // ★ NEW
    }

    isExpired() {
        if (!this.expiresAt) return true;
        return Date.now() > new Date(this.expiresAt).getTime();
    }

    isAccepted() {
        return Boolean(this.acceptedAt);
    }

    isPending() {
        return !this.isAccepted() && !this.isExpired();
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            email: this.email,
            role: this.role,
            invitedBy: this.invitedBy,
            expiresAt: this.expiresAt,
            acceptedAt: this.acceptedAt,
            createdAt: this.createdAt,
            platformRole: this.platformRole, // ★ NEW
        };
    }
}

// ─────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────
class TeamInviteRepository extends BaseRepository {
    constructor() {
        super('team_invites');
    }

    toEntity(row) {
        if (!row) return null;
        return new TeamInvite({
            id: row.id,
            businessId: row.business_id,
            email: row.email,
            role: row.role,
            tokenHash: row.token_hash,
            invitedBy: row.invited_by,
            expiresAt: row.expires_at,
            acceptedAt: row.accepted_at,
            createdAt: row.created_at,
            platformRole: row.platform_role, // ★ NEW
        });
    }

    async create({ businessId, email, role, tokenHash, invitedBy, expiresAt, platformRole }) {
        const result = await this._query(
            `INSERT INTO team_invites
                (business_id, email, role, token_hash, invited_by, expires_at, platform_role)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [businessId, email.toLowerCase(), role, tokenHash, invitedBy, expiresAt, platformRole || null]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query(
            'SELECT * FROM team_invites WHERE id = $1',
            [id]
        );
        return this.toEntity(result.rows[0] || null);
    }

    async findByTokenHash(tokenHash) {
        const result = await this._query(
            'SELECT * FROM team_invites WHERE token_hash = $1',
            [tokenHash]
        );
        return this.toEntity(result.rows[0] || null);
    }

    async findPendingByBusiness(businessId) {
        const result = await this._query(
            `SELECT * FROM team_invites
             WHERE business_id = $1
               AND accepted_at IS NULL
               AND expires_at > NOW()
             ORDER BY created_at DESC`,
            [businessId]
        );
        return result.rows.map(row => this.toEntity(row));
    }

    async findPendingByBusinessAndEmail(businessId, email) {
        const result = await this._query(
            `SELECT * FROM team_invites
             WHERE business_id = $1
               AND LOWER(email) = LOWER($2)
               AND accepted_at IS NULL
               AND expires_at > NOW()
             LIMIT 1`,
            [businessId, email]
        );
        return this.toEntity(result.rows[0] || null);
    }

    async markAccepted(id) {
        const result = await this._query(
            `UPDATE team_invites
             SET accepted_at = NOW()
             WHERE id = $1 AND accepted_at IS NULL`,
            [id]
        );
        if (result.rowCount === 0) return null;
        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query(
            'DELETE FROM team_invites WHERE id = $1',
            [id]
        );
        return result.rowCount > 0;
    }

    async deletePendingForEmail(businessId, email) {
        const result = await this._query(
            `DELETE FROM team_invites
             WHERE business_id = $1
               AND LOWER(email) = LOWER($2)
               AND accepted_at IS NULL`,
            [businessId, email]
        );
        return result.rowCount;
    }
}

module.exports = TeamInviteRepository;
module.exports.TeamInvite = TeamInvite;