'use client';

/**
 * Soccer Field Lineup Builder
 * Visual drag-and-drop interface for positioning players on a soccer field
 */

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Player {
  id: string;
  player_id: string;
  full_name: string;
  main_position: string;
  team_color: string;
  rating?: number;
}

interface SoccerFieldProps {
  teamColor: 'red' | 'blue' | 'yellow';
  players: Player[];
  onPlayerMove?: (playerId: string, position: string) => void;
  isLocked?: boolean;
  showPositions?: boolean;
}

// Position definitions for a 4-3-3 formation layout
const fieldPositions = [
  { id: 'GK', label: 'GK', x: 50, y: 90, forPosition: 'GK' },
  { id: 'LB', label: 'LB', x: 15, y: 70, forPosition: 'DF' },
  { id: 'CB1', label: 'CB', x: 35, y: 75, forPosition: 'DF' },
  { id: 'CB2', label: 'CB', x: 65, y: 75, forPosition: 'DF' },
  { id: 'RB', label: 'RB', x: 85, y: 70, forPosition: 'DF' },
  { id: 'LM', label: 'LM', x: 20, y: 45, forPosition: 'MID' },
  { id: 'CM', label: 'CM', x: 50, y: 50, forPosition: 'MID' },
  { id: 'RM', label: 'RM', x: 80, y: 45, forPosition: 'MID' },
  { id: 'LW', label: 'LW', x: 20, y: 20, forPosition: 'ST' },
  { id: 'ST', label: 'ST', x: 50, y: 15, forPosition: 'ST' },
  { id: 'RW', label: 'RW', x: 80, y: 20, forPosition: 'ST' },
];

const teamColorStyles = {
  red: {
    primary: 'bg-red-500',
    secondary: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
    field: 'from-red-900/20 to-red-800/10',
  },
  blue: {
    primary: 'bg-blue-500',
    secondary: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    field: 'from-blue-900/20 to-blue-800/10',
  },
  yellow: {
    primary: 'bg-yellow-500',
    secondary: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-300 dark:border-yellow-700',
    field: 'from-yellow-900/20 to-yellow-800/10',
  },
};

function DraggablePlayer({
  player,
  position,
  teamColor,
  isLocked,
}: {
  player: Player;
  position: { x: number; y: number };
  teamColor: 'red' | 'blue' | 'yellow';
  isLocked?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.player_id,
    disabled: isLocked,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const colors = teamColorStyles[teamColor];

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: style?.transform || 'translate(-50%, -50%)',
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'absolute flex flex-col items-center cursor-grab active:cursor-grabbing z-10',
        isDragging && 'opacity-50 scale-110',
        isLocked && 'cursor-default'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg border-2 border-white',
          colors.primary
        )}
      >
        {player.full_name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)}
      </div>
      <span className="mt-1 text-[10px] sm:text-xs font-medium text-white bg-black/60 px-1.5 py-0.5 rounded max-w-[60px] sm:max-w-[80px] truncate">
        {player.full_name.split(' ')[0]}
      </span>
      {player.rating && (
        <span className="text-[8px] sm:text-[10px] text-amber-400">
          {'★'.repeat(player.rating)}
        </span>
      )}
    </div>
  );
}

function DropZone({
  position,
  isOver,
  hasPlayer,
}: {
  position: { id: string; label: string; x: number; y: number };
  isOver: boolean;
  hasPlayer: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: position.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      className={cn(
        'absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed transition-all',
        hasPlayer
          ? 'border-transparent'
          : isOver
          ? 'border-white bg-white/20 scale-110'
          : 'border-white/40 bg-white/5'
      )}
    >
      {!hasPlayer && (
        <span className="absolute inset-0 flex items-center justify-center text-white/60 text-xs font-medium">
          {position.label}
        </span>
      )}
    </div>
  );
}

export function SoccerField({
  teamColor,
  players,
  onPlayerMove,
  isLocked = false,
  showPositions = true,
}: SoccerFieldProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playerPositions, setPlayerPositions] = useState<Record<string, string>>(() => {
    // Auto-assign players to positions based on their main_position
    const positions: Record<string, string> = {};
    const availablePositions = [...fieldPositions];

    players.forEach((player) => {
      const preferredPositions = availablePositions.filter(
        (pos) => pos.forPosition === player.main_position
      );
      const position = preferredPositions.length > 0
        ? preferredPositions[0]
        : availablePositions[0];

      if (position) {
        positions[player.player_id] = position.id;
        const idx = availablePositions.findIndex((p) => p.id === position.id);
        if (idx !== -1) availablePositions.splice(idx, 1);
      }
    });

    return positions;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const playerId = active.id as string;
    const newPositionId = over.id as string;

    // Check if another player is in this position
    const existingPlayerId = Object.entries(playerPositions).find(
      ([, posId]) => posId === newPositionId
    )?.[0];

    if (existingPlayerId && existingPlayerId !== playerId) {
      // Swap positions
      const oldPositionId = playerPositions[playerId];
      setPlayerPositions((prev) => ({
        ...prev,
        [playerId]: newPositionId,
        [existingPlayerId]: oldPositionId,
      }));
    } else {
      setPlayerPositions((prev) => ({
        ...prev,
        [playerId]: newPositionId,
      }));
    }

    onPlayerMove?.(playerId, newPositionId);
  };

  const activePlayer = activeId ? players.find((p) => p.player_id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] max-w-md mx-auto">
        {/* Soccer Field SVG */}
        <svg
          viewBox="0 0 100 130"
          className="absolute inset-0 w-full h-full"
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
        >
          {/* Field background */}
          <rect x="0" y="0" width="100" height="130" fill="#2d5a27" rx="4" />

          {/* Field gradient overlay */}
          <defs>
            <linearGradient id="fieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3a7a32" />
              <stop offset="50%" stopColor="#2d5a27" />
              <stop offset="100%" stopColor="#3a7a32" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="130" fill="url(#fieldGradient)" rx="4" />

          {/* Field outline */}
          <rect x="5" y="5" width="90" height="120" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />

          {/* Center circle */}
          <circle cx="50" cy="65" r="12" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <circle cx="50" cy="65" r="1" fill="white" opacity="0.8" />

          {/* Center line */}
          <line x1="5" y1="65" x2="95" y2="65" stroke="white" strokeWidth="0.5" opacity="0.8" />

          {/* Top penalty area */}
          <rect x="20" y="5" width="60" height="20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <rect x="30" y="5" width="40" height="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <circle cx="50" cy="17" r="0.8" fill="white" opacity="0.8" />
          <path d="M 35 25 A 12 12 0 0 0 65 25" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />

          {/* Bottom penalty area */}
          <rect x="20" y="105" width="60" height="20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <rect x="30" y="117" width="40" height="8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <circle cx="50" cy="113" r="0.8" fill="white" opacity="0.8" />
          <path d="M 35 105 A 12 12 0 0 1 65 105" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />

          {/* Corner arcs */}
          <path d="M 5 8 A 3 3 0 0 0 8 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <path d="M 92 5 A 3 3 0 0 0 95 8" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <path d="M 5 122 A 3 3 0 0 1 8 125" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
          <path d="M 92 125 A 3 3 0 0 1 95 122" fill="none" stroke="white" strokeWidth="0.5" opacity="0.8" />
        </svg>

        {/* Drop zones */}
        {showPositions &&
          fieldPositions.map((pos) => (
            <DropZone
              key={pos.id}
              position={pos}
              isOver={false}
              hasPlayer={Object.values(playerPositions).includes(pos.id)}
            />
          ))}

        {/* Players */}
        {players.map((player) => {
          const positionId = playerPositions[player.player_id];
          const position = fieldPositions.find((p) => p.id === positionId);
          if (!position) return null;

          return (
            <DraggablePlayer
              key={player.player_id}
              player={player}
              position={{ x: position.x, y: position.y }}
              teamColor={teamColor}
              isLocked={isLocked}
            />
          );
        })}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePlayer && (
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-xl border-2 border-white',
                teamColorStyles[teamColor].primary
              )}
            >
              {activePlayer.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <span className="mt-1 text-xs font-medium text-white bg-black/60 px-1.5 py-0.5 rounded">
              {activePlayer.full_name.split(' ')[0]}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Simplified team list view for subs
export function SubstitutesList({
  players,
  teamColor,
}: {
  players: Player[];
  teamColor: 'red' | 'blue' | 'yellow';
}) {
  const colors = teamColorStyles[teamColor];

  return (
    <div className={cn('p-3 rounded-lg border', colors.secondary, colors.border)}>
      <h4 className={cn('text-sm font-medium mb-2', colors.text)}>
        Substitutes ({players.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <Badge
            key={player.player_id}
            variant="secondary"
            className={cn('py-1 px-2', colors.secondary)}
          >
            <span className={cn('text-xs', colors.text)}>{player.full_name}</span>
            {player.rating && (
              <span className="ml-1 text-amber-500 text-[10px]">
                {'★'.repeat(player.rating)}
              </span>
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
