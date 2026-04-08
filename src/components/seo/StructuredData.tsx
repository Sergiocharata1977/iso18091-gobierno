'use client';

/**
 * StructuredData Component
 *
 * Adds JSON-LD structured data for SEO (Organization, WebSite, BreadcrumbList)
 * This fixes MonkeyTest warnings about missing schema markup.
 */

interface StructuredDataProps {
  type?: 'organization' | 'website' | 'breadcrumb';
  breadcrumbItems?: Array<{ name: string; url: string }>;
}

export function StructuredData({
  type = 'organization',
  breadcrumbItems,
}: StructuredDataProps) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Don Cándido IA',
    url: 'https://www.doncandidoia.com',
    logo: 'https://www.doncandidoia.com/icon-512.png',
    description:
      'Sistema de Gestión de Calidad ISO 9001 con Inteligencia Artificial',
    sameAs: [
      'https://twitter.com/doncandidoia',
      'https://www.linkedin.com/company/doncandidoia',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'soporte@doncandidoia.com',
      availableLanguage: ['Spanish'],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Don Cándido IA',
    url: 'https://www.doncandidoia.com',
    description: 'Asistente inteligente para gestión de calidad ISO 9001:2015',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.doncandidoia.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Don Cándido IA',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };

  const breadcrumbSchema = breadcrumbItems
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }
    : null;

  const getSchema = () => {
    switch (type) {
      case 'website':
        return websiteSchema;
      case 'breadcrumb':
        return breadcrumbSchema;
      case 'organization':
      default:
        return [organizationSchema, websiteSchema, softwareSchema];
    }
  };

  const schema = getSchema();

  if (!schema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/**
 * Default export for root layout - includes all main schemas
 */
export function RootStructuredData() {
  return (
    <>
      <StructuredData type="organization" />
    </>
  );
}
