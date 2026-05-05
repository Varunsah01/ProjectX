const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  defaultShowCopyCode: true,
});

module.exports = withNextra({
  reactStrictMode: true,
  // CommonJS interop for swagger-ui-react and its deps
  transpilePackages: [
    "swagger-ui-react",
    "swagger-client",
    "react-syntax-highlighter",
  ],
});
