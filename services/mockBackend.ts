import { Candidate, ElectionState, Vote, SocketMessage, ConnectedBooth } from '../types';
import { cryptoService } from './cryptoService';

const INITIAL_CANDIDATES: Candidate[] = [
  { id: 'c1', name: 'Sarah Jenkins', party: 'Progressive Alliance', symbol: '🦅', color: '#3b82f6' },
  { id: 'c2', name: 'Rajiv Kumar', party: 'National Conservatives', symbol: '🦁', color: '#ef4444' },
];
export class MockSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  readyState: number = 0;
  boothId: string | null = null;

  constructor(private server: MockBackendService) {
    setTimeout(() => {
      this.readyState = 1;
      this.server._registerSocket(this);
      if (this.onopen) this.onopen();
    }, 800);
  }

  send(data: string) {
    if (this.readyState !== 1) return;
    const msg = JSON.parse(data);
    this.server._handleClientMessage(this, msg);
  }

  close() {
    this.readyState = 3;
    this.server._removeSocket(this);
    if (this.onclose) this.onclose();
  }

  _receive(msg: SocketMessage) {
    if (this.readyState === 1 && this.onmessage) {
      this.onmessage({ data: JSON.stringify(msg) });
    }
  }
}

class MockBackendService extends EventTarget {
  private votes: Vote[] = [];
  private tally: Record<string, number> = {};
  private candidates: Candidate[] = [];
  private isActive: boolean = false;
  private channel: BroadcastChannel;
  private connectedSockets: MockSocket[] = [];
  private booths: Record<string, ConnectedBooth> = {};
  
  private privateKey: CryptoKey | null = null;
  private publicKey: CryptoKey | null = null;
  private publicKeyJwk: JsonWebKey | null = null;

  constructor() {
    super();
    this.channel = new BroadcastChannel('securevote_evs_sync');
    
    this.channel.onmessage = (event) => {
      if (event.data.type === 'SYNC_STATE') {
        this.loadFromStorage();
        this.dispatchEvent(new Event('update'));
        this._broadcastState();
      } else if (event.data.type === 'SYNC_BOOTHS') {
        this.loadBoothsFromStorage();
        this.dispatchEvent(new Event('update'));
      }
    };

    this.initializeSystem();
  }

  private async initializeSystem() {
    await this.initKeys();
    this.loadFromStorage();
    this.loadBoothsFromStorage();
    
    if (this.candidates.length === 0 && !localStorage.getItem('evs_initialized')) {
      this.candidates = INITIAL_CANDIDATES;
      this.isActive = true;
      this._persist();
      localStorage.setItem('evs_initialized', 'true');
    }
  }

  private async initKeys() {
    const storedPriv = localStorage.getItem('evs_priv_key');
    const storedPub = localStorage.getItem('evs_pub_key');

    if (storedPriv && storedPub) {
      this.privateKey = await cryptoService.importKey(JSON.parse(storedPriv), 'private');
      this.publicKey = await cryptoService.importKey(JSON.parse(storedPub), 'public');
      this.publicKeyJwk = JSON.parse(storedPub);
    } else {
      const keyPair = await cryptoService.generateKeyPair();
      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;
      
      const privJwk = await cryptoService.exportKey(this.privateKey);
      const pubJwk = await cryptoService.exportKey(this.publicKey);
      this.publicKeyJwk = pubJwk;

      localStorage.setItem('evs_priv_key', JSON.stringify(privJwk));
      localStorage.setItem('evs_pub_key', JSON.stringify(pubJwk));
    }
  }

  public connect(): MockSocket {
    return new MockSocket(this);
  }

  public _registerSocket(socket: MockSocket) {
    this.connectedSockets.push(socket);
  }

  public _removeSocket(socket: MockSocket) {
    this.connectedSockets = this.connectedSockets.filter(s => s !== socket);
    if (socket.boothId) {
      this._updateBoothStatus(socket.boothId, 'OFFLINE');
    }
  }

  public _handleClientMessage(socket: MockSocket, msg: SocketMessage) {
    setTimeout(async () => {
      switch (msg.type) {
        case 'AUTH':
          if (msg.payload.boothId) {
            socket.boothId = msg.payload.boothId;
            this._updateBoothStatus(socket.boothId!, 'ONLINE');

            socket._receive({ 
              type: 'AUTH_SUCCESS', 
              payload: { 
                serverTime: Date.now(),
                publicKey: this.publicKeyJwk
              } 
            });

            if (this.isActive) {
              socket._receive({ type: 'ELECTION_STARTED', payload: { candidates: this.candidates } });
            } else {
              socket._receive({ type: 'ELECTION_STOPPED' });
            }
          } else {
            socket._receive({ type: 'AUTH_FAILED', payload: { reason: 'Invalid Booth ID' } });
          }
          break;

        case 'HEARTBEAT':
          if (socket.boothId) {
            this._updateBoothStatus(socket.boothId, 'ONLINE');
            socket._receive({ type: 'HEARTBEAT_ACK' });
          }
          break;

        case 'VOTE':
          try {
            const { encryptedPayload } = msg.payload;
            const boothId = socket.boothId;

            if (!boothId) throw new Error("Unauthenticated Booth");
            if (!this.privateKey) throw new Error("Server Encryption Error");
            
            const decryptedString = await cryptoService.decrypt(encryptedPayload, this.privateKey);
            const [candidateId, salt, timestamp] = decryptedString.split('|');

            if (!this.candidates.find(c => c.id === candidateId)) {
               throw new Error("Invalid Candidate");
            }

            this.updateTally(candidateId);

            const receipt = await this.castVoteEncrypted(encryptedPayload, boothId);
            
            socket._receive({ type: 'VOTE_ACK', payload: receipt });
          } catch (e) {
            console.error(e);
            socket._receive({ type: 'VOTE_ERROR', payload: { message: "Vote Processing Failed" } });
          }
          break;
      }
    }, 200);
  }

  private _broadcastState() {
    const msg: SocketMessage = this.isActive 
      ? { type: 'ELECTION_STARTED', payload: { candidates: this.candidates } }
      : { type: 'ELECTION_STOPPED' };

    this.connectedSockets.forEach(s => s._receive(msg));
  }

  private _updateBoothStatus(id: string, status: 'ONLINE' | 'OFFLINE') {
    this.booths[id] = {
      id,
      status,
      lastHeartbeat: Date.now()
    };
    this._persistBooths();
  }

  private loadFromStorage() {
    const savedVotes = localStorage.getItem('evs_votes');
    const savedTally = localStorage.getItem('evs_tally');
    const savedStatus = localStorage.getItem('evs_active');
    const savedCandidates = localStorage.getItem('evs_candidates');
    
    if (savedVotes) this.votes = JSON.parse(savedVotes);
    if (savedTally) this.tally = JSON.parse(savedTally);
    if (savedStatus) this.isActive = JSON.parse(savedStatus);
    if (savedCandidates) this.candidates = JSON.parse(savedCandidates);
  }

  private loadBoothsFromStorage() {
    const savedBooths = localStorage.getItem('evs_booths');
    if (savedBooths) {
      this.booths = JSON.parse(savedBooths);
    }
  }

  public getElectionState(): ElectionState {
    return {
      isActive: this.isActive,
      totalVotes: this.votes.length,
      candidates: this.candidates,
    };
  }

  public getConnectedBooths(): ConnectedBooth[] {
    return Object.values(this.booths).sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);
  }

  public getCandidates(): Candidate[] {
    return this.candidates;
  }

  public getVotesForAdmin(): Record<string, number> {
    return { ...this.tally };
  }

  public async castDirectVote(candidateId: string): Promise<{ receiptHash: string }> {
    if (!this.candidates.find(c => c.id === candidateId)) {
      throw new Error('Invalid candidate');
    }
    this.updateTally(candidateId);
    const encryptedPayload = `DIRECT|${candidateId}|${crypto.randomUUID()}`;
    return this.castVoteEncrypted(encryptedPayload, 'DIRECT-UI');
  }

  private updateTally(candidateId: string) {
    if (!this.tally[candidateId]) {
      this.tally[candidateId] = 0;
    }
    this.tally[candidateId]++;
  }

  public async castVoteEncrypted(encryptedPayload: string, boothId: string): Promise<{ receiptHash: string }> {
    this.loadFromStorage();
    if (!this.isActive) throw new Error("Election is closed.");

    await new Promise(resolve => setTimeout(resolve, 800));

    const timestamp = Date.now();
    const receiptData = `${encryptedPayload}-${timestamp}`;
    const voteHash = await cryptoService.hash(receiptData);

    const newVote: Vote = {
      id: crypto.randomUUID(),
      encryptedPayload: encryptedPayload,
      timestamp,
      voteHash,
      boothId
    };

    this.votes.push(newVote);
    this._persist();
    return { receiptHash: voteHash };
  }

  public toggleElectionStatus(status: boolean) {
    this.isActive = status;
    this._persist();
  }

  public resetSystem() {
    this.votes = [];
    this.tally = {};
    this.isActive = false;
    this.candidates = []; 
    this.booths = {}; 
    localStorage.removeItem('evs_booths');
    this._persist();
    this._persistBooths(); 
  }

  public addCandidate(candidate: Omit<Candidate, 'id'>) {
    const newCandidate: Candidate = {
      ...candidate,
      id: crypto.randomUUID()
    };
    this.candidates.push(newCandidate);
    this.tally[newCandidate.id] = 0;
    this._persist();
  }

  public removeCandidate(id: string) {
    this.candidates = this.candidates.filter(c => c.id !== id);
    delete this.tally[id];
    this._persist();
  }

  private _persist() {
    localStorage.setItem('evs_votes', JSON.stringify(this.votes));
    localStorage.setItem('evs_tally', JSON.stringify(this.tally));
    localStorage.setItem('evs_active', JSON.stringify(this.isActive));
    localStorage.setItem('evs_candidates', JSON.stringify(this.candidates));
    
    this.dispatchEvent(new Event('update'));
    this._broadcastState();
    this.channel.postMessage({ type: 'SYNC_STATE' });
  }

  private _persistBooths() {
    localStorage.setItem('evs_booths', JSON.stringify(this.booths));
    this.channel.postMessage({ type: 'SYNC_BOOTHS' });
    this.dispatchEvent(new Event('update'));
  }
}

export const backend = new MockBackendService();