import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Svenska Cupen',
      href: getPermalink('/svenska-cupen'),
    },
    {
      text: 'Blog',
      href: getBlogPermalink(),
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
        { text: 'O-Ringen', href: getPermalink('/oringen') },
        { text: 'Eventor', href: getPermalink('/eventor') }
      ],
    },
  ],
  secondaryLinks: [

  ],
  socialLinks: [
    //    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    //    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://www.facebook.com/mountainbikeorientering' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/blaudden/mtbo-sajten' },
  ],
  footNote: `© <a class="text-primary hover:underline dark:text-gray-200" href="https://mountainbikeorientering.se/">mountainbikeorientering.se</a> 2023`


};
