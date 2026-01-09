import { config, fields, collection, component } from '@keystatic/core';
import type { LocalConfig } from '@keystatic/core';

// Storage strategy
// Storage strategy
const storage: LocalConfig['storage'] = { kind: 'local' };

// Location of embedded images in Markdoc differ locally vs. online
const embeddedImagePubPath: string =
  process.env.NODE_ENV === 'development' ? 'src/assets/images/posts' : '~/assets/images/posts';

const posts = collection({
  label: 'Posts',
  slugField: 'title',
  path: 'src/content/posts/**/',
  entryLayout: 'content',
  format: { contentField: 'content' },
  schema: {
    title: fields.slug({
      name: {
        label: 'Title',
        description:
          'Artikelns titel. Visas högst upp i artikeln, på alla ställen där artikeln länkas och när den delas. En slug skapas från titeln och blir artikelns sökväg på sajten. För artiklar på engelska så läggs en/ till framför slug.',
        validation: { length: { min: 5, max: 64 } },
      },
    }),
    subtitle: fields.text({
      label: 'Subtitle',
      description: 'Används för att skriv ut en mindre text under titlen, för tex ort+datum',
    }),
    draft: fields.checkbox({
      label: 'Draft',
      description: 'Sätt artikel som draft om den inte ska publiceras ännu',
    }),
    evergreen: fields.checkbox({
      label: 'Evergreen',
      description: 'Sätt artikel som evergreen, den får då inget datum',
    }),
    hideFromMain: fields.checkbox({
      label: 'Hide from main blog',
      description:
        'När aktiverad kommer artikeln att döljas från huvudbloggens lista (/blog). Använd för landningssidor eller event-sidor som ska listas separat.',
    }),
    publishDate: fields.date({
      label: 'Published date',
      validation: { isRequired: true },
      defaultValue: { kind: 'today' },
      description: 'Datumet då artikeln publicerades. Visas högst upp i artikeln.',
    }),
    excerpt: fields.text({
      label: 'Excerpt',
      multiline: true,
      validation: { length: { min: 60, max: 250 } },
      description:
        'Artikelns beskrivning. Visas i sin helhet på bloggsidan, men trunkeras till ca 160 tecken för Google/Facebook och 120 tecken på startsidan. Skriv det viktigaste först!',
    }),
    image: fields.image({
      label: 'Image',
      validation: { isRequired: true },
      directory: 'src/assets/images/posts',
      publicPath: '~/assets/images/posts',
      description:
        'Bild som visas högst upp på sidan. Rekommenderad storlek: 1280x720 pixlar (16:9). Denna bild används även vid delning.',
    }),
    category: fields.select({
      label: 'Category',
      description:
        'Det ämne som artikeln hamnar om, det här påverkar hur artikeln visas på sajten. Dom flesta artiklar har ingen kategori. För att inkludera artikeln i MTBO‑VM 2026-sidan, sätt kategorin till WMTBOC26.',
      options: [
        { label: '', value: '' },
        { label: 'Svenska Cupen', value: 'svenska-cupen' },
        { label: 'O-Ringen', value: 'oringen' },
        { label: 'WMTBOC26', value: 'wmtboc26' },
      ],
      defaultValue: '',
    }),
    tags: fields.array(fields.text({ label: 'Tag' }), {
      label: 'Tag',
      description:
        'Taggar för artikeln, används för att styra var och hur dom visas på sajten. Exempel: "svenska-cupen-2024". ',
      itemLabel: (props) => props.value,
    }),
    author: fields.text({
      label: 'Author',
      description: 'Artikelns författare, visas ännu inte någonstans på sajten men kan vara bra att ha. ',
    }),
    content: fields.document({
      label: 'Content',
      formatting: true,
      dividers: true,
      links: true,
      images: {
        directory: 'src/assets/images/posts',
        publicPath: embeddedImagePubPath,
      },
      componentBlocks: {
        BlogListBySlug: component({
          label: 'BlogListBySlug',
          schema: {
            title: fields.text({
              label: 'Title',
            }),
            slugs: fields.array(fields.text({ label: 'Slug' }), {
              label: 'Slug',
              itemLabel: (props) => props.value,
            }),
          },
          preview: () => null,
        }),
        EventBlogList: component({
          label: 'Event Blog List',
          schema: {
            title: fields.text({ label: 'Title' }),
            category: fields.text({
              label: 'Category Slug',
              description: 'Category slug to filter posts by (e.g. wmtboc26)',
            }),
            excludeSlug: fields.text({
              label: 'Exclude Slug',
              description: 'Optional: post slug to exclude (e.g. wmtboc26)',
            }),
          },
          preview: () => null,
        }),
        YoutubeVideo: component({
          label: 'YouTube Video',
          schema: {
            videoid: fields.text({
              label: 'YouTube Video ID',
              description: 'The ID of YouTube video (not the full URL)',
              validation: {
                length: {
                  min: 1,
                },
              },
            }),
            title: fields.text({
              label: 'Titel',
              description: 'Videons titel (visas ovanpå filmens preview)',
              validation: {
                length: {
                  min: 1,
                },
              },
            }),
          },
          preview: (props) => {
            const videoid = props.fields.videoid.value;
            if (!videoid) {
              return <p>Please provide YouTube video id</p>;
            }
            const title = props.fields.title.value;
            return (
              <div>
                <p>Video id: {videoid}</p>
                <p>Title: {title}</p>
              </div>
            );
          },
        }),
        FacebookPageBox: component({
          label: 'Facebook Page Box',
          schema: {
            pageName: fields.text({ label: 'Page Name' }),
            pageUrl: fields.text({ label: 'Page URL' }),
          },
          preview: (props) => (
            <div>
              <p>Facebook Page: {props.fields.pageName.value}</p>
            </div>
          ),
        }),
        CarouselImageGrid: component({
          label: 'Carousel Image Grid',
          schema: {
            id: fields.text({ label: 'ID' }),
            columns: fields.integer({ label: 'Columns', defaultValue: 3 }),
            images: fields.array(fields.text({ label: 'Image Path' }), {
              label: 'Images',
              itemLabel: (props) => props.value,
            }),
          },
          preview: (props) => (
            <div>
              <p>Carousel Image Grid ({props.fields.images.elements.length} images)</p>
            </div>
          ),
        }),
        RegisterButtons: component({
          label: 'Register Buttons',
          schema: {
            buttons: fields.array(
              fields.object({
                text: fields.text({ label: 'Text' }),
                href: fields.text({ label: 'Link URL' }),
                variant: fields.select({
                  label: 'Variant',
                  options: [
                    { label: 'Primary', value: 'primary' },
                    { label: 'Secondary', value: 'secondary' },
                  ],
                  defaultValue: 'primary',
                }),
                icon: fields.text({ label: 'Icon (optional)' }),
              }),
              {
                label: 'Buttons',
                itemLabel: (props) => props.fields.text.value || 'Button',
              }
            ),
          },
          preview: (props) => (
            <div>
              <p>Register Buttons ({props.fields.buttons.elements.length})</p>
            </div>
          ),
        }),
        FloatedImage: component({
          label: 'Floated Image',
          schema: {
            src: fields.text({ label: 'Image Path (e.g. ~/assets/...)' }),
            alt: fields.text({ label: 'Alt Text' }),
            float: fields.select({
              label: 'Float Direction',
              options: [
                { label: 'Right', value: 'right' },
                { label: 'Left', value: 'left' },
              ],
              defaultValue: 'right',
            }),
            cropPosition: fields.text({
              label: 'Crop Position (CSS object-position)',
              defaultValue: 'center center',
              description: 'e.g. "center top", "left bottom", "50% 20%"',
            }),
            width: fields.text({
              label: 'Max Width (CSS)',
              defaultValue: '300px',
              description: 'e.g. "300px", "50%"',
            }),
          },
          preview: (props) => (
            <div
              style={{
                float: props.fields.float.value as 'left' | 'right',
                maxWidth: props.fields.width.value,
                border: '1px solid #ddd',
                padding: '4px',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.8em' }}>Image: {props.fields.src.value}</p>
              {/* Safe rendering to avoid crash */}
              <p style={{ margin: 0, fontSize: '0.8em' }}>Pos: {props.fields.cropPosition.value}</p>
            </div>
          ),
        }),
        leafLetMap: component({
          // Fix casing if necessary, or keep consistent
          label: 'Leaflet Map',
          schema: {
            markers: fields.array(
              fields.object({
                lat: fields.number({
                  label: 'Latitude',
                  validation: { isRequired: true, min: -90, max: 90 },
                }),
                lng: fields.number({
                  label: 'Longitude',
                  validation: { isRequired: true, min: -180, max: 180 },
                }),
                title: fields.text({
                  label: 'Title',
                  validation: { isRequired: true },
                }),
                url: fields.url({
                  label: 'URL',
                }),
                color: fields.select({
                  label: 'Color',
                  options: [
                    { label: 'Blue (default)', value: 'blue' },
                    { label: 'Red', value: 'red' },
                    { label: 'Green', value: 'green' },
                    { label: 'Orange', value: 'orange' },
                    { label: 'Purple', value: 'purple' },
                    { label: 'Grey', value: 'grey' },
                  ],
                  defaultValue: 'blue',
                }),
                icon: fields.select({
                  label: 'Icon Type',
                  options: [
                    { label: 'Default (●)', value: 'default' },
                    { label: 'Start (▶)', value: 'start' },
                    { label: 'Finish (■)', value: 'finish' },
                    { label: 'Parking (P)', value: 'parking' },
                    { label: 'Info (i)', value: 'info' },
                  ],
                  defaultValue: 'default',
                }),
              }),
              {
                label: 'Markers',
                itemLabel: (props) => props.fields.title.value || 'New Marker',
              }
            ),
            polygons: fields.array(
              fields.object({
                points: fields.text({
                  label: 'Points',
                  description: 'Format: lat,lng; lat,lng (e.g. 59.33,18.07; 59.34,18.08)',
                  multiline: true,
                }),
                color: fields.select({
                  label: 'Color',
                  options: [
                    { label: 'Red (default)', value: 'red' },
                    { label: 'Blue', value: 'blue' },
                    { label: 'Green', value: 'green' },
                    { label: 'Orange', value: 'orange' },
                    { label: 'Purple', value: 'purple' },
                    { label: 'Grey', value: 'grey' },
                  ],
                  defaultValue: 'red',
                }),
                title: fields.text({ label: 'Title' }),
              }),
              {
                label: 'Polygons',
                itemLabel: (props) => props.fields.title.value || 'New Polygon',
              }
            ),
            polylines: fields.array(
              fields.object({
                points: fields.text({
                  label: 'Points',
                  description: 'Format: lat,lng; lat,lng (e.g. 59.33,18.07; 59.34,18.08)',
                  multiline: true,
                }),
                color: fields.select({
                  label: 'Color',
                  options: [
                    { label: 'Green (default)', value: 'green' },
                    { label: 'Blue', value: 'blue' },
                    { label: 'Red', value: 'red' },
                    { label: 'Orange', value: 'orange' },
                    { label: 'Purple', value: 'purple' },
                    { label: 'Grey', value: 'grey' },
                  ],
                  defaultValue: 'green',
                }),
                width: fields.integer({ label: 'Width', defaultValue: 3 }),
                title: fields.text({ label: 'Title' }),
              }),
              {
                label: 'Polylines',
                itemLabel: (props) => props.fields.title.value || 'New Polyline',
              }
            ),
            zoom: fields.integer({
              label: 'Zoom Level',
              defaultValue: 13,
              validation: { min: 1, max: 18 },
            }),
            height: fields.text({
              label: 'Height',
              defaultValue: '400px',
              description: 'CSS height value (e.g., 400px)',
            }),
          },
          preview: (props) => {
            const markerCount = props.fields.markers.elements.length;
            const polygonCount = props.fields.polygons.elements.length;
            const polylineCount = props.fields.polylines.elements.length;
            return (
              <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Leaflet Map</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Markers</span>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 'bold' }}>{markerCount}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Polygons</span>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 'bold' }}>{polygonCount}</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280' }}>Polylines</span>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 'bold' }}>{polylineCount}</span>
                  </div>
                </div>
              </div>
            );
          },
        }),
      },
    }),
    metadata: fields.object({
      canonical: fields.url({
        label: 'Canonical URL',
        description:
          'Fylls i om samma artikel finns publicerad på annat ställe och den artikel som finns på sajten är en kopia, den pekar då på originalet ',
      }),
      lang: fields.select({
        label: 'Language Override',
        description: 'Sidans språkinställning. Auto = baserat på URL.',
        options: [
          { label: 'Auto', value: '' },
          { label: 'Svenska', value: 'sv' },
          { label: 'English', value: 'en' },
        ],
        defaultValue: '',
      }),
    }),
  },
});

export default config({
  storage,
  collections: {
    posts,
  },
  singletons: {},
});
