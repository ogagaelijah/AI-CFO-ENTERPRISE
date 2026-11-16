// src/application/useCases/auth/GoogleAuthUseCase.js
// v1.1.0 — Accepts both Web and Android Client IDs for audience verification.

const { OAuth2Client } = require('google-auth-library');

class GoogleAuthUseCase {
    constructor(userRepository, memberRepository, businessRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.businessRepository = businessRepository;
        this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async execute(credential) {
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: credential,
                // ★ FIX: Accept both Web (for browser) and Android (for mobile) audiences
                audience: [
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_ANDROID_CLIENT_ID 
                ], 
            });
            payload = ticket.getPayload();
        } catch (error) {
            console.error('Google verify error:', error.message);
            throw new Error('Invalid Google token. Please try again.');
        }

        const { sub: googleId, email, name: fullName, email_verified } = payload;

        if (!email_verified) {
            throw new Error('Your Google email is not verified.');
        }

        let user = await this.userRepository.findByGoogleId(googleId);

        if (!user) {
            user = await this.userRepository.findByEmail(email);
            if (user) {
                await this.userRepository.update(user.id, { googleId, authProvider: 'google' });
                user.googleId = googleId;
            }
        }

        if (!user) {
            return { needsOnboarding: true, email, fullName, googleId };
        }

        const membership = await this.memberRepository.findFirstActiveByUser(user.id);
        let business = membership ? await this.businessRepository.findById(membership.businessId) : await this.businessRepository.findByUserIdFirst(user.id);
        
        const isPlatformStaff = Boolean(user.platformRole);
        if (!business && !isPlatformStaff) {
            throw new Error('No business associated with this account.');
        }

        return {
            needsOnboarding: false,
            user,
            business,
            role: membership?.role || (isPlatformStaff ? 'PLATFORM_STAFF' : 'OWNER'),
        };
    }
}

module.exports = GoogleAuthUseCase;