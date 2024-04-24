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
        { text: 'Svenska Cupen 2024', href: getPermalink('/svenska-cupen-mtbo-2024') },
        { text: 'SM Ulricehamn 2024', href: getPermalink('/svenska-maesterskapen-mtbo-2024') },
        { text: 'O-Ringen 2024', href: getPermalink('/mtbo-oringen-smalandskusten-2024') },
        { text: 'Eventor', href: getPermalink('/eventor') }
      ],
    },
    {
      text: 'Om', href: getPermalink('about', 'page')
    }
  ],
};

export const footerData = {
  links: [
    {
      title: 'Tävlingar',
      links: [
        { text: 'Svenska Cupen', href: getPermalink('/svenska-cupen') },
        { text: 'SM 2024', href: getPermalink('/svenska-maesterskapen-mtbo-2024') },
        { text: 'O-Ringen', href: getPermalink('/oringen') },
        { text: 'Eventor', href: getPermalink('/eventor') }
      ],
    },
    {
      title: 'Läger',
      links: [
        { text: 'MTBO Rikslägret', href: getPermalink('/mtbo-rikslaeger-2024') },
      ],
    },
    {
      title: 'På sajten',
      links: [
        { text: 'Blog', href: getBlogPermalink() },
        { text: 'Om', href: getPermalink('about', 'page') },
      ]
    },
  ],
  secondaryLinks: [

  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: 'https://twitter.com/Mtborientering' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://instagram.com/mountainbikeorientering' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://www.facebook.com/mountainbikeorientering' },
    { ariaLabel: 'YouTube', icon: 'tabler:brand-youtube', href: 'https://www.youtube.com/@mountainbikeorientering' },

    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/blaudden/mtbo-sajten' },
  ],
  footNote: `© <a class="text-primary hover:underline dark:text-gray-200" href="https://www.mountainbikeorientering.se/">mountainbikeorientering.se</a> 2023`


};
