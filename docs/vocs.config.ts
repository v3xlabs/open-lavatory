import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vocs";

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  title: "openlv",
  titleTemplate: "%s · openlv",
  description:
    "Secure peer-to-peer JSON-RPC connectivity between dApps and wallets",
  rootDir: ".",
  editLink: {
    pattern:
      "https://github.com/v3xlabs/open-lavatory/edit/master/docs/pages/:path",
    text: "Suggest changes to this page",
  },
  sidebar: [
    {
      text: "Getting Started",
      link: "/getting-started",
    },
    {
      text: "How it works",
      link: "/how",
    },
    {
      text: "Try it out",
      link: "/try",
    },
    {
      text: "FAQ",
      link: "/faq",
    },
    {
      text: "Guides",
      items: [
        {
          text: "Introduction",
          link: "/guides/intro",
        },
        {
          text: "Configuration",
          link: "/guides/configuration",
        },
        {
          text: "Theming",
          link: "/guides/theme",
        },
        {
          text: "Mobile Wallets",
          link: "/guides/mobile-wallets",
        },
      ],
    },
    {
      text: "Wallets",
      items: [
        {
          text: "Introduction",
          link: "/wallets",
        },
        {
          text: "Migrating from WalletConnect",
          link: "/wallets/migrate",
        },
      ],
    },
    {
      text: "API",
      items: [
        {
          text: "Introduction",
          link: "/api/intro",
        },
        {
          text: "URI Specification",
          link: "/api/uri",
        },
        {
          text: "Establishing a link",
          link: "/api/session",
        },
        {
          text: "Signaling",
          link: "/api/signaling",
          items: [
            {
              text: "MQTT",
              link: "/api/signaling/mqtt",
            },
            {
              text: "Ntfy",
              link: "/api/signaling/ntfy",
            },
            {
              text: "Gun",
              link: "/api/signaling/gun",
            },
          ],
        },
        {
          text: "Transport",
          link: "/api/transport",
          items: [
            {
              text: "WebRTC",
              link: "/api/transport/webrtc",
            },
          ],
        },
        {
          text: "Connector",
          link: "/api/connector",
        },
        {
          text: "Provider",
          link: "/api/provider",
        },
      ],
    },
  ],
  topNav: [
    {
      text: "GitHub",
      link: "https://github.com/v3xlabs/open-lavatory",
    },
  ],
  socials: [
    {
      icon: "github",
      link: "https://github.com/v3xlabs/open-lavatory",
    },
  ],
  theme: {
    accentColor: {
      light: "#fe7d37",
      dark: "#fe7d37",
    },
  },
  banner: {
    content: "OpenLV is still under active development.",
    dismissable: false,
  },
  iconUrl: {
    dark: "/openlavatory_dark.png",
    light: "/openlavatory.png",
  },
  logoUrl: {
    dark: "/openlv_logo_dark.svg",
    light: "/openlv_logo_light.svg",
  },
  ogImageUrl: "https://openlv.sh/openlv_banner.png",
  basePath: process.env.DOCS_BASE_PATH || "/",
  vite: {
    plugins: [tailwindcss() as unknown as any],
  },
});
