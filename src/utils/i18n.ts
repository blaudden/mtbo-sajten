export const languages = {
  en: 'English',
  sv: 'Svenska',
};

export const defaultLang = 'sv';

export const ui = {
  sv: {
    'nav.home': 'Hem',
    'nav.about': 'Om',
    'nav.twitter': 'Twitter',
  },
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
  },
} as const;

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function getLangFromSlug(slug: string) {
  const lang = slug.split('/')[0];
  if (lang in ui) return lang;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
