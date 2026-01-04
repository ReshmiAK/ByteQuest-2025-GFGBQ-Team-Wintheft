export type Party = string;

export const PredefinedParties = [
  'Progressive Alliance',
  'National Conservatives',
  'Green Earth Party',
  'Liberty Front',
  'Independent'
];

export interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  color: string;
}

export interface Vote {
  id: string;
  encryptedPayload: string;
  timestamp: number;
  voteHash: string;
  boothId: string;
}

export interface VoterSettings {
  highContrast: boolean;
  largeText: boolean;
  audioGuide: boolean;
  language: 'en' | 'hi';
}

export interface ElectionState {
  isActive: boolean;
  totalVotes: number;
  candidates: Candidate[];
}

export type ViewMode = 'SPLASH' | 'ADMIN' | 'BOOTH';

export interface AdminUser {
  username: string;
  role: 'admin';
}

export type ConnectionStatus = 'CONNECTING' | 'AUTHENTICATING' | 'ONLINE' | 'LOCKED' | 'OFFLINE' | 'RECONNECTING';

export type SocketMessageType = 
  | 'AUTH' 
  | 'AUTH_SUCCESS' 
  | 'AUTH_FAILED'
  | 'HEARTBEAT' 
  | 'HEARTBEAT_ACK'
  | 'ELECTION_STARTED' 
  | 'ELECTION_STOPPED' 
  | 'LOCK_BOOTH'
  | 'VOTE' 
  | 'VOTE_ACK' 
  | 'VOTE_ERROR';

export interface SocketMessage {
  type: SocketMessageType;
  payload?: any;
}

export interface ConnectedBooth {
  id: string;
  status: 'ONLINE' | 'OFFLINE';
  lastHeartbeat: number;
}