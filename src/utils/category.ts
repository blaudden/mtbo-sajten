/** Pretty category name from the category slug  */
export const getPrettyCategory = (slug: string) : string => {

  if (slug == 'oringen') return 'O-Ringen';
  if (slug == 'svenska-cupen') return 'Svenska Cupen';
  return slug.replaceAll('-', ' ');
};
