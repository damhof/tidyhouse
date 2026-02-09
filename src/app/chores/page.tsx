import { Suspense } from 'react';
import { getRoomsWithScores, getDistribution } from '@/lib/chores';
import { ExpandableRoomList } from '@/components/ExpandableRoomList';
import { ChoresPageSkeleton } from '@/components/RoomCardSkeleton';
import { WhatShouldIDo } from '@/components/WhatShouldIDo';
import { FairDistribution } from '@/components/FairDistribution';
import { db } from '@/db';
import { users } from '@/db/schema';

export const dynamic = 'force-dynamic';

async function ChoresContent() {
  const rooms = await getRoomsWithScores();
  const weekDist = await getDistribution(7);
  const monthDist = await getDistribution(30);
  const allUsers = db.select().from(users).all();

  return (
    <>
      <ExpandableRoomList rooms={rooms} users={allUsers} />
      <FairDistribution users={allUsers} weekDist={weekDist} monthDist={monthDist} />
    </>
  );
}

export default function ChoresPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-warm-800 dark:text-warm-100">Chores</h1>
        <p className="text-warm-500 dark:text-warm-400 text-sm mt-1">
          Tap a room to see its chores and mark them done.
        </p>
      </div>

      <Suspense fallback={<ChoresPageSkeleton />}>
        <ChoresContent />
      </Suspense>

      <WhatShouldIDo />
    </div>
  );
}
