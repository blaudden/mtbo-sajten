import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    BlogListBySlug: {
      render: component('./src/components/markdoc/BlogListBySlug.astro'),
      attributes: {
        title: { type: 'String' },
        slugs: { type: 'Array' }
      },
    },
    YoutubeVideo : {
      render: component('./src/components/markdoc/YoutubeVideo.astro'),
      attributes: {
        videoid: { type: 'String' },
        title: { type: 'String' },
      },
    }
  },
});
