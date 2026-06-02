/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

// Content-Security-Policy.
// NOTE: the ported markup keeps the original inline on* handlers (onclick=…)
// and inline style="" attributes, and the page logic is loaded as inline-driven
// scripts. Inline event-handler attributes cannot be allow-listed via nonce or
// hash, so 'unsafe-inline' is required in script-src/style-src for the site to
// keep working exactly as before. The markdown renderer (the only place that
// turns external/file content into HTML) is sanitised at the source instead, so
// the residual XSS surface is small. object-src/base-uri/frame-ancestors are
// locked down to neutralise the high-impact sinks regardless.
//
// 'unsafe-eval' is added in dev only — Next.js React Fast Refresh requires it.
// It is NOT present in production builds.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'sha256-Q+8tPsjVtiDsjF/Cv8FMOpg2Yg91oKFKDAJat1PPb2g=' 'sha256-qXyNUdqpRWVmPTg+0kYlU86U8fMAN4r3l6CaFmDXqNY='${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
