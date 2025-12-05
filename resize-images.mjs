import { functionOptimizeImages } from 'images-folder-optimizer';

functionOptimizeImages({
  stringOriginFolder: 'src/assets/images/',
  stringDestinationFolder: 'src/assets/images',
  arrayOriginFormats: ['jpg'],
  arrayDestinationFormats: ['jpg'],
  objectResizeOptions: {
    width: 1024,
    fit: 'contain',
    withoutEnlargement: true,
  },
}).then((results) => {
  console.table(results);
});
