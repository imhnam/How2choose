import CatalogClient from './catalog-client';
export const dynamic = 'force-dynamic';
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const params = await searchParams;
  return <CatalogClient initialCategory={params.category} />;
}
