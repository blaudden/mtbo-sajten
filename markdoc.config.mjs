import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    BlogListBySlug: {
      render: component('./src/components/markdoc/BlogListBySlug.astro'),
      attributes: {
        title: { type: 'String' },
        slugs: { type: 'Array' },
      },
    },
    YoutubeVideo: {
      render: component('./src/components/markdoc/YoutubeVideo.astro'),
      attributes: {
        videoid: { type: 'String' },
        title: { type: 'String' },
      },
    },
    Carousel: {
        render: component('./src/components/widgets/Carousel.astro'),
        attributes: {
            images: { type: Array },
            id: { type: 'String' },
        }
    },
    LeafletMap: {
      render: component('./src/components/markdoc/LeafletMap.astro'),
      attributes: {
        markers: { type: Array },
        polygons: { type: Array },
        polylines: { type: Array },
        zoom: { type: 'Number' },
        height: { type: 'String' },
      },
    },
    EventBlogList: {
      render: component('./src/components/markdoc/EventBlogList.astro'),
      attributes: {
        title: { type: 'String' },
        category: { type: 'String' },
        excludeSlug: { type: 'String' },
        compact: { type: 'Boolean' },
      },
    },
  },
});
