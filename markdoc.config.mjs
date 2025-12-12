import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';
import Markdoc from '@markdoc/markdoc';
const { Tag } = Markdoc;

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
      },
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
    CarouselImageGrid: {
      render: component('./src/components/markdoc/CarouselImageGrid.astro'),
      attributes: {
        images: { type: Array },
        id: { type: 'String' },
        columns: { type: 'Number' },
      },
    },
    FacebookPageBox: {
      render: component('./src/components/markdoc/FacebookPageBox.astro'),
      attributes: {
        pageName: { type: 'String' },
        pageUrl: { type: 'String' },
      },
    },
    RegisterButtons: {
      render: component('./src/components/markdoc/RegisterButtons.astro'),
      attributes: {
        buttons: { type: Array },
      },
    },
    FloatedImage: {
      render: component('./src/components/markdoc/FloatedImage.astro'),
      attributes: {
        src: { type: 'String' },
        alt: { type: 'String' },
        float: { type: 'String' },
        width: { type: 'String' },
        cropPosition: { type: 'String' },
      },
    },
  },
  nodes: {
    link: {
      render: component('./src/components/markdoc/SmartLink.astro'),
      attributes: {
        href: { type: 'String' },
        title: { type: 'String' },
      },
    },
    item: {
      transform(node, config) {
        // console.error('MARKDOC TRANSFORM ITEM CALLED');
        const attributes = node.transformAttributes(config);
        const children = node.transformChildren(config);

        // Astro/Markdoc often wraps list content in an 'inline' node
        let contentChildren = node.children;
        if (contentChildren.length === 1 && contentChildren[0].type === 'inline') {
          contentChildren = contentChildren[0].children;
        }

        // Check if the content contains ONLY a single link
        // We filter out empty text nodes / whitespace
        const validChildren = contentChildren.filter((child) => {
          // Keep if it's not a text node, OR if it's a text node with actual content
          return typeof child !== 'string' || child.trim().length > 0;
        });

        const isPureLink = validChildren.length === 1 && validChildren[0].type === 'link';

        // Debug Log
        // if (validChildren.length > 0) {
        //      const childTypes = validChildren.map(c => typeof c === 'string' ? `"${c.trim()}"` : c.type);
        //      console.error(`MARKDOC ITEM: Pure=${isPureLink} Children=[${childTypes.join(', ')}]`);
        // }

        if (isPureLink) {
          attributes['class'] = 'smart-list-item';
        }

        return new Tag('li', attributes, children);
      },
    },
  },
});
