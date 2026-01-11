/**
 * Types for team generation feature
 */

export type TeamColor = 'red' | 'blue' | 'yellow' | 'sub';
export type PositionType = 'GK' | 'DF' | 'MID' | 'ST';
export type GameOverride = 'auto' | 'game_on' | 'cancelled';

export interface CheckedInPlayer {
  id: string;
  playerId: string;
  name: string;
  age: number;
  mainPosition: PositionType;
  altPosition: PositionType | null;
  rating: number;
  checkinStatus: 'checked_in' | 'checked_out';
}

export interface TeamAssignment {
  playerId: string;
  playerName: string;
  position: PositionType;
  team: TeamColor;
  isManualOverride: boolean;
}

export interface GeneratedTeam {
  color: TeamColor;
  players: TeamAssignment[];
  skillSum: number;
  ageSum: number;
  hasGoalkeeper: boolean;
}

export interface GenerationResult {
  teams: GeneratedTeam[];
  subs: TeamAssignment[];
  warnings: string[];
  generatedAt: Date;
  generatedBy: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedAt: Date;
}

export interface TeamGenerationSettings {
  numberOfTeams: 2 | 3 | 'auto';
  formationTarget: 'auto' | 'balanced';
  objectiveWeights: {
    skillBalance: number;
    ageBalance: number;
    positionBalance: number;
  };
}

export interface GameDayStatus {
  date: Date;
  checkedInCount: number;
  isEligible: boolean;
  override: GameOverride;
  note: string;
}
