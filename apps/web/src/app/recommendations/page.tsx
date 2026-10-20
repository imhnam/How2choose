import RecommendationPage from './recommendation-page';

export default async function SuggestionsPage({ searchParams }: { searchParams: Promise<{ recipient?: string }> }) {
  const { recipient } = await searchParams;
  return <RecommendationPage initialRecipient={recipient} />;
}
