import { Suspense } from 'react';
import { getRoomsWithScores } from '@/lib/chores';
import { ExpandableRoomList } from '@/components/ExpandableRoomList';
import { ChoresPageSkeleton } from '@/components/RoomCardSkeleton';
import { WhatShouldIDo } from '@/components/WhatShouldIDo';

export const dynamic = 'force-dynamic';

async function ChoresContent() {
  const rooms = await getRoomsWithScores();

  return <ExpandableRoomList rooms={rooms} />;
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
