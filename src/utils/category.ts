/** Pretty category name from the category slug  */
export const getPrettyCategory = (slug: string) : string => {

  if (slug == 'oringen') return 'O-Ringen';
  if (slug == 'svenska-cupen') return 'Svenska Cupen';
  if (slug == 'wmtboc26') return 'WMTBOC 2026';
  return slug.replaceAll('-', ' ');
};
