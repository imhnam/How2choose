import ProductDetail from './product-detail';
export const dynamic = 'force-dynamic';
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
