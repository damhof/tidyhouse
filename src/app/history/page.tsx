import { getHistory, getDistribution } from '@/lib/chores';
import { db } from '@/db';
import { users } from '@/db/schema';
import { HistoryClient } from './HistoryClient';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const history = await getHistory(200);
  const weekDist = await getDistribution(7);
  const monthDist = await getDistribution(30);
  const allUsers = db.select().from(users).all();

  return (
    <HistoryClient
      history={history}
      weekDist={weekDist}
      monthDist={monthDist}
      users={allUsers}
    />
  );
}
