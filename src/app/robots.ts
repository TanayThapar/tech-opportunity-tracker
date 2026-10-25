import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: 'Feedfetcher-Google',
        allow: '/',
      },
      {
        userAgent: 'Google-Calendar-Importer',
        allow: '/',
      },
    ],
  };
}
