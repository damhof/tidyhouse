import { getWeeklySummary } from '@/lib/summary';
import { SummaryClient } from './SummaryClient';

export default async function SummaryPage() {
  const data = getWeeklySummary();
  return <SummaryClient data={data} />;
}
