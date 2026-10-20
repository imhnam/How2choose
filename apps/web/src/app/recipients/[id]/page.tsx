import RecipientDetail from './recipient-detail';

export default async function RecipientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipientDetail id={id} />;
}
