import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: (
    <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>
      Recuring Docs
    </span>
  ),
  project: {
    link: "https://github.com/your-org/recuring",
  },
  docsRepositoryBase:
    "https://github.com/your-org/recuring/tree/main/packages/docs",
  footer: {
    text: `© ${new Date().getFullYear()} Recuring. All rights reserved.`,
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – Recuring Docs",
    };
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="Recuring – Recurring Service Management documentation for end-users and admins."
      />
      <link rel="icon" href="/favicon.ico" />
    </>
  ),
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
};

export default config;
