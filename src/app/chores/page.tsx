import { getRoomsWithScores } from '@/lib/chores';
import { ExpandableRoomList } from '@/components/ExpandableRoomList';

export const dynamic = 'force-dynamic';

export default async function ChoresPage() {
  const rooms = await getRoomsWithScores();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Chores</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Tap a room to see its chores and mark them done.</p>
      </div>

      <ExpandableRoomList rooms={rooms} />
    </div>
  );
}
