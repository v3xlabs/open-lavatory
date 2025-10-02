import { defineConfig } from 'vocs'

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  title: 'openlv',
  titleTemplate: '%s · openlv',
  description: 'Secure peer-to-peer JSON-RPC connectivity between dApps and wallets',
  rootDir: '.',
  editLink: {
    pattern: 'https://github.com/v3xlabs/open-lavatory/edit/master/docs/pages/:path',
    text: 'Suggest changes to this page',
  },
  sidebar: [
    {
      text: 'Getting Started',
      link: '/getting-started',
    },
    {
        text: 'How it works',
        link: '/how',
    },
    {
        text: 'FAQ',
        link: '/faq',
    },
    {
      text: 'Guides',
      items: [
        {
          text: 'Introduction',
          link: '/guides/intro'
        },
        {
          text: 'Pairing',
          link: '/guides/accounts'
        },
        {
          text: 'Other',
          link: '/guides/other'
        },
      ]
    },
    {
      text: 'API Reference',
      items: [
        {
          text: 'Introduction',
          link: '/api/intro'
        },
        {
          text: 'Signaling',
          link: '/api/signaling'
        },
        {
          text: 'Connectivity',
          link: '/api/connectivity'
        },
      ]
    },
  ],
  topNav: [
    {
      text: 'GitHub',
      link: 'https://github.com/v3xlabs/open-lavatory',
    }
  ],
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/v3xlabs/open-lavatory',
    }
  ],
  theme: {
    accentColor: '#D01C15',
  },
  banner: {
    content: 'OpenLV is still under active development.',
    dismissable: false,
  },
  iconUrl: {
    dark: '/openlavatory_dark.png',
    light: '/openlavatory.png',
  },
  logoUrl: {
    dark: '/openlavatory_dark.png',
    light: '/openlavatory.png',
  },
  basePath: '/open-lavatory',
})
