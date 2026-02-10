import { getSummaryData } from '@/lib/summary';
import { SummaryClient } from './SummaryClient';

export const dynamic = 'force-dynamic';

export default async function SummaryPage() {
  // Fetch data for all periods upfront for instant switching
  const weekData = getSummaryData('week');
  const monthData = getSummaryData('month');
  const thirtyDaysData = getSummaryData('30days');
  
  const allData = {
    week: weekData,
    month: monthData,
    '30days': thirtyDaysData,
  };
  
  return <SummaryClient initialData={weekData} allData={allData} />;
}
