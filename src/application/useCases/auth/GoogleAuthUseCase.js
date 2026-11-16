// src/application/useCases/auth/GoogleAuthUseCase.js
// v1.2.0 — Filters undefined audiences, logs failures with the token's real aud, marks linked Google users as verified.
// v1.1.0 — Accepts both Web and Android Client IDs for audience verification.

const { OAuth2Client } = require('google-auth-library');

class GoogleAuthUseCase {
    constructor(userRepository, memberRepository, businessRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.businessRepository = businessRepository;

        // Drop undefined/empty values so a missing env var can't weaken or break the check
        this.audiences = [
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_ANDROID_CLIENT_ID,
        ].filter(Boolean);

        if (this.audiences.length === 0) {
            console.error('GoogleAuthUseCase: no GOOGLE_CLIENT_ID configured. Google login will fail.');
        }

        this.googleClient = new OAuth2Client();
    }

    async execute(credential) {
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: credential,
                audience: this.audiences,
            });
            payload = ticket.getPayload();
        } catch (error) {
            // Decode (without trusting) the token so the log shows which audience it was issued for
            let tokenAud = 'unreadable';
            try {
                tokenAud = JSON.parse(
                    Buffer.from(String(credential).split('.')[1], 'base64').toString()
                ).aud;
            } catch { /* ignore */ }

            console.error('Google verify error:', error.message, '| token aud:', tokenAud, '| accepted:', this.audiences);
            throw new Error('Invalid Google token. Please try again.');
        }

        const { sub: googleId, email, name, email_verified } = payload;
        const fullName = name || email;

        if (!email_verified) {
            throw new Error('Your Google email is not verified.');
        }

        let user = await this.userRepository.findByGoogleId(googleId);

        if (!user) {
            user = await this.userRepository.findByEmail(email);
            if (user) {
                // Google has verified this email, so mark it verified too.
                // Otherwise the mobile app sends the user to the Verify Email screen.
                await this.userRepository.update(user.id, {
                    googleId,
                    authProvider: user.authProvider || 'google',
                    emailVerified: true,
                });
                user.googleId = googleId;
                user.emailVerified = true;
            }
        }

        if (!user) {
            return { needsOnboarding: true, email, fullName, googleId };
        }

        const membership = await this.memberRepository.findFirstActiveByUser(user.id);
        const business = membership
            ? await this.businessRepository.findById(membership.businessId)
            : await this.businessRepository.findByUserIdFirst(user.id);

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