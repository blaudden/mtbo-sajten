import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Blog',
      href: getBlogPermalink(),
    },
    {
      text: 'Tävlingar',
      links: [
        { text: 'Tävlingskalender', href: getPermalink('/events') },
        { text: 'Tävlingsprogram 2027', href: getPermalink('/mtbo-program') },
        { text: 'Framtidens program', href: getPermalink('/framtidens-program') },
        { text: 'SM i MTBO 2027', href: getPermalink('/svenska-maesterskapen-mtbo') },
        { text: 'MTBO Camp Skåne 2027', href: getPermalink('/events/mtbo-camp-skane-2027') },
        { text: 'O-Ringen Stockholm 2027', href: getPermalink('/mtbo-oringen') },
        { text: 'WRE i Sverige', href: getPermalink('/mtbo-wre-i-sverige') },
        { text: 'Eventor', href: getPermalink('/eventor') },
      ],
    },
    {
      text: 'Svenska Cupen',
      links: [
        { text: 'Om Svenska Cupen', href: getPermalink('/svenska-cupen') },
        { text: 'Svenska Cupen 2027', href: getPermalink('/svenska-cupen-mtbo') },
        { text: 'Seedningsordning', href: getPermalink('/svenska-cupen/seedning') },
      ],
    },
    {
      text: 'Om sajten',
      href: getPermalink('about', 'page'),
    },
  ],
};

export const footerData = {
  links: [
    {
      title: 'Info',
      links: [
        { text: 'Om Svenska Cupen', href: getPermalink('/svenska-cupen') },
        { text: 'O-Ringen', href: getPermalink('/oringen') },
        { text: 'Eventor', href: getPermalink('/eventor') },
      ],
    },
    {
      title: 'Tävlingar',
      links: [
        { text: 'Tävlingskalender', href: getPermalink('/events') },
        { text: 'Tävlingsprogram 2027', href: getPermalink('/mtbo-program') },
        { text: 'Svenska Cupen 2027', href: getPermalink('/svenska-cupen-mtbo') },
        { text: 'SM i MTBO 2027', href: getPermalink('/svenska-maesterskapen-mtbo') },
        { text: 'O-Ringen Stockholm 2027', href: getPermalink('/mtbo-oringen') },
        { text: 'Säsongen 2026', href: getPermalink('/mtbo-sasongen-2026-sammanfattning') },
        { text: 'WMTBOC 2026', href: getPermalink('/wmtboc26') },
      ],
    },
    {
      title: 'För arrangörer',
      links: [
        { text: 'Framtidens program', href: getPermalink('/framtidens-program') },
        { text: 'WRE i Sverige', href: getPermalink('/mtbo-wre-i-sverige') },
      ],
    },
    {
      title: 'Läger',
      links: [{ text: 'MTBO Rikslägret', href: getPermalink('/mtbo-rikslaeger-2024') }],
    },
    {
      title: 'På sajten',
      links: [{ text: 'Blog', href: getBlogPermalink() }],
    },
    {
      title: 'Om',
      links: [
        { text: 'Om sajten', href: getPermalink('about', 'page') },
        { text: 'Integritetspolicy', href: getPermalink('privacy-policy') },
      ],
    },
    {
      title: 'Kontakt',
      links: [{ text: 'Maila oss', href: 'mailto:mountainbikeorientering@gmail.com' }],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://instagram.com/mountainbikeorientering' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://www.facebook.com/mountainbikeorientering' },
    { ariaLabel: 'YouTube', icon: 'tabler:brand-youtube', href: 'https://www.youtube.com/@mountainbikeorientering' },

    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/blaudden/mtbo-sajten' },
  ],
  footNote: `© <a class="text-primary hover:underline dark:text-muted" href="https://www.mountainbikeorientering.se/">mountainbikeorientering.se</a> 2023-2026`,
};
