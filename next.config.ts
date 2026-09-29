import type { NextConfig } from "next";

// Proxy Firebase Auth's handler through our own origin so sign-in works on
// Safari / iPad, where storage partitioning isolates *.firebaseapp.com and the
// login handler can't read back its sessionStorage ("missing initial state").
// Serving /__/auth/** from our domain (with authDomain set to our host) makes
// the whole flow first-party. See:
// https://firebase.google.com/docs/auth/web/redirect-best-practices
const FIREBASE_AUTH_HOST = "txarecruiting.firebaseapp.com";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Dev only: lets a browser on 127.0.0.1 load Next's client scripts (the preview
  // pane sometimes can't open localhost). No effect on production builds.
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `https://${FIREBASE_AUTH_HOST}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${FIREBASE_AUTH_HOST}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
