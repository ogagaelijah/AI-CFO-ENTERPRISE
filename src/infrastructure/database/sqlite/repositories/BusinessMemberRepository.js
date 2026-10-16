// src/infrastructure/database/sqlite/repositories/BusinessMemberRepository.js
// v1.0.0-prod — Manages membership of users within businesses.
//               Every query is tenant-scoped by business_id.

const BaseRepository = require('./BaseRepository');

// ─────────────────────────────────────────────
// BusinessMember Entity
// ─────────────────────────────────────────────
class BusinessMember {
    constructor(data) {
        this.id = data.id || null;
        this.businessId = data.businessId || null;
        this.userId = data.userId || null;
        this.role = data.role || null;
        this.status = data.status || 'ACTIVE';
        this.invitedBy = data.invitedBy || null;
        this.invitedAt = data.invitedAt || null;
        this.acceptedAt = data.acceptedAt || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();

        // Populated by joins — not persisted on this table.
        this.userEmail = data.userEmail || null;
        this.userFullName = data.userFullName || null;
        this.userPhone = data.userPhone || null;
    }

    isOwner()       { return this.role === 'OWNER'; }
    isAdmin()       { return this.role === 'ADMIN'; }
    canManageTeam() { return this.role === 'OWNER' || this.role === 'ADMIN'; }
    isActive()      { return this.status === 'ACTIVE'; }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            userId: this.userId,
            role: this.role,
            status: this.status,
            invitedBy: this.invitedBy,
            invitedAt: this.invitedAt,
            acceptedAt: this.acceptedAt,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            userEmail: this.userEmail,
            userFullName: this.userFullName,
            userPhone: this.userPhone,
        };
    }
}

// ─────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────
class BusinessMemberRepository extends BaseRepository {
    constructor() {
        super('business_members');
    }

    toEntity(row) {
        if (!row) return null;
        return new BusinessMember({
            id: row.id,
            businessId: row.business_id,
            userId: row.user_id,
            role: row.role,
            status: row.status,
            invitedBy: row.invited_by,
            invitedAt: row.invited_at,
            acceptedAt: row.accepted_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            userEmail: row.user_email,
            userFullName: row.user_full_name,
            userPhone: row.user_phone,
        });
    }

    /**
     * Create a new membership. Caller is responsible for validating that the
     * (businessId, userId) pair doesn't already exist.
     */
    async create({
        businessId,
        userId,
        role,
        status = 'ACTIVE',
        invitedBy = null,
        invitedAt = null,
        acceptedAt = null,
    }) {
        const result = await this._query(
            `INSERT INTO business_members
                (business_id, user_id, role, status, invited_by, invited_at, accepted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [businessId, userId, role, status, invitedBy, invitedAt, acceptedAt]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query(
            `SELECT m.*, u.email AS user_email, u.full_name AS user_full_name, u.phone_number AS user_phone
             FROM business_members m
             JOIN users u ON u.id = m.user_id
             WHERE m.id = $1`,
            [id]
        );
        return this.toEntity(result.rows[0] || null);
    }

    /**
     * Find a user's membership row for a specific business.
     * Returns null if the user is not a member.
     */
    async findByBusinessAndUser(businessId, userId) {
        const result = await this._query(
            `SELECT m.*, u.email AS user_email, u.full_name AS user_full_name, u.phone_number AS user_phone
             FROM business_members m
             JOIN users u ON u.id = m.user_id
             WHERE m.business_id = $1 AND m.user_id = $2`,
            [businessId, userId]
        );
        return this.toEntity(result.rows[0] || null);
    }

    /**
     * Return the first active business this user belongs to.
     * Used as the "default tenant" when a user has multiple memberships.
     * Order: OWNER first, then by earliest accepted date.
     */
    async findFirstActiveByUser(userId) {
        const result = await this._query(
            `SELECT m.*, u.email AS user_email, u.full_name AS user_full_name, u.phone_number AS user_phone
             FROM business_members m
             JOIN users u ON u.id = m.user_id
             WHERE m.user_id = $1 AND m.status = 'ACTIVE'
             ORDER BY
               CASE WHEN m.role = 'OWNER' THEN 0 ELSE 1 END,
               m.accepted_at ASC NULLS LAST,
               m.created_at ASC
             LIMIT 1`,
            [userId]
        );
        return this.toEntity(result.rows[0] || null);
    }

    /**
     * List all members of a business, newest members first.
     */
    async findByBusinessId(businessId) {
        const result = await this._query(
            `SELECT m.*, u.email AS user_email, u.full_name AS user_full_name, u.phone_number AS user_phone
             FROM business_members m
             JOIN users u ON u.id = m.user_id
             WHERE m.business_id = $1
             ORDER BY
               CASE m.role
                 WHEN 'OWNER' THEN 0
                 WHEN 'ADMIN' THEN 1
                 WHEN 'MANAGER' THEN 2
                 WHEN 'ACCOUNTANT' THEN 3
                 WHEN 'CASHIER' THEN 4
                 ELSE 5
               END,
               m.created_at ASC`,
            [businessId]
        );
        return result.rows.map(row => this.toEntity(row));
    }

    /**
     * Count how many OWNER-role members a business has.
     * Used to prevent demoting/removing the last owner.
     */
    async countOwners(businessId) {
        const result = await this._query(
            `SELECT COUNT(*)::int AS count
             FROM business_members
             WHERE business_id = $1 AND role = 'OWNER' AND status = 'ACTIVE'`,
            [businessId]
        );
        return result.rows[0]?.count || 0;
    }

    async updateRole(id, role) {
        const result = await this._query(
            `UPDATE business_members
             SET role = $1, updated_at = NOW()
             WHERE id = $2`,
            [role, id]
        );
        if (result.rowCount === 0) return null;
        return this.findById(id);
    }

    async updateStatus(id, status) {
        const result = await this._query(
            `UPDATE business_members
             SET status = $1, updated_at = NOW()
             WHERE id = $2`,
            [status, id]
        );
        if (result.rowCount === 0) return null;
        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query(
            'DELETE FROM business_members WHERE id = $1',
            [id]
        );
        return result.rowCount > 0;
    }

    /**
     * True if a user is already an active or suspended member of a business.
     */
    async exists(businessId, userId) {
        const result = await this._query(
            `SELECT 1 FROM business_members
             WHERE business_id = $1 AND user_id = $2 LIMIT 1`,
            [businessId, userId]
        );
        return result.rowCount > 0;
    }
}

module.exports = BusinessMemberRepository;
module.exports.BusinessMember = BusinessMember;