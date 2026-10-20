import CatalogClient from './catalog-client';
export const dynamic = 'force-dynamic';
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  return <CatalogClient key={`${params.category ?? ''}:${params.q ?? ''}`} initialCategory={params.category} initialSearch={params.q} />;
}
