// src/application/useCases/auth/GoogleAuthUseCase.js
// v1.0.0 — Verifies Google tokens and handles account linking.

const { OAuth2Client } = require('google-auth-library');

class GoogleAuthUseCase {
    constructor(userRepository, memberRepository, businessRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.businessRepository = businessRepository;
        this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    async execute(credential) {
        // 1. Verify the token with Google's servers
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (error) {
            throw new Error('Invalid Google token. Please try again.');
        }

        const { sub: googleId, email, name: fullName, email_verified } = payload;

        if (!email_verified) {
            throw new Error('Your Google email is not verified.');
        }

        // 2. Check if user already exists by Google ID
        let user = await this.userRepository.findByGoogleId(googleId);

        // 3. If not, check by Email (Account Linking)
        if (!user) {
            user = await this.userRepository.findByEmail(email);
            if (user) {
                // Link the Google ID to the existing account
                await this.userRepository.update(user.id, { googleId, authProvider: 'google' });
                user.googleId = googleId;
            }
        }

        // 4. If user still doesn't exist, they need to onboard
        if (!user) {
            return { needsOnboarding: true, email, fullName, googleId };
        }

        // 5. User exists, resolve their business and log them in
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