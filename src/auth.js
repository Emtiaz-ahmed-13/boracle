import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { sql } from '@/lib/pgdb';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Remove the MongoDB adapter since we're using JWT strategy
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!profile.email?.endsWith('@g.bracu.ac.bd')) {
        console.log("Non-BRACU email attempted:", profile.email);
        return false;
      }
      return true;
    },

    async jwt({ token, user, account, profile }) {
      // Initial sign-in
      if (account && profile) {
        console.log("JWT callback - initial sign-in:", { email: profile.email });
        
        try {
          
          // Check if user profile already exists by email
          let userProfile = await sql`SELECT * FROM userinfo WHERE email = ${profile.email}`;

          if (userProfile.length === 0) {
            // Create new user profile if none exists
            userProfile = await sql`
              INSERT INTO userinfo (userName, email, userRole)
              VALUES (${profile.name}, ${profile.email}, 'student')
              RETURNING *;
            `;
            console.log("Created new UserInfo:", userProfile);
            console.log(`Created new UserInfo for: ${profile.email}`);
          }
          
          token.id = profile.sub;
          token.email = profile.email;
          token.name = profile.name;
          token.userrole = userProfile[0].userrole; // Keep consistent with database column name
          token.createdat = userProfile[0].createdat;
          
        } catch (error) {
          console.error("Error in JWT callback:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Transfer from token to session
      if (session?.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.userrole = token.userrole || 'student'; // Keep consistent with database

      }
      
      // For existing sessions, refresh data from database
      if (!session.user.userrole) {
        try {
          
          // Find user profile by email
          const userProfile = await sql`SELECT * FROM userinfo WHERE email = ${session.user.email}`;
          console.log("Found user profile:", userProfile[0]);

          if (userProfile.length > 0) {
            // Update session with latest data
            session.user.userrole = userProfile[0].userrole || "student";

          }
        } catch (error) {
          console.error("Error refreshing session data:", error);
        }
      }
      
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 1 * 24 * 60 * 60, // 1 days
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development"
})