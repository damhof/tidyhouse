'use client';

import {
  CookingPot,
  Bath,
  Sofa,
  BedDouble,
  Shirt,
  Home,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'Kitchen': CookingPot,
  'Bathroom': Bath,
  'Living Room': Sofa,
  'Bedroom': BedDouble,
  'Laundry': Shirt,
  'General': Home,
};

export function RoomIcon({ roomName, fallbackEmoji, size = 36, className = '' }: {
  roomName: string;
  fallbackEmoji: string;
  size?: number;
  className?: string;
}) {
  const Icon = iconMap[roomName];
  if (Icon) {
    return <Icon size={size} strokeWidth={1.5} className={className} />;
  }
  return <span style={{ fontSize: size * 0.85 }}>{fallbackEmoji}</span>;
}
