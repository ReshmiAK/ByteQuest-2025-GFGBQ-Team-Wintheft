import React, { useState, useEffect, useRef } from 'react';
import { backend, MockSocket } from '../services/mockBackend';
import { cryptoService } from '../services/cryptoService';
import { tts } from '../services/ttsService';
import { Candidate, VoterSettings, ConnectionStatus, SocketMessage } from '../types';
import { Button, Card, IconCheck, IconSpeaker, IconEye } from '../components/Shared';

interface PollingBoothProps {
  onExit: () => void;
}

type Step = 'WELCOME' | 'AUTH' | 'ASSISTANCE' | 'VOTE' | 'CONFIRM' | 'RECEIPT';

export const PollingBooth: React.FC<PollingBoothProps> = ({ onExit }) => {
  const [step, setStep] = useState<Step>('WELCOME');
  const [settings, setSettings] = useState<VoterSettings>({
    highContrast: false,
    largeText: false,
    audioGuide: false,
    language: 'en'
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [voterId, setVoterId] = useState('');
  const [receipt, setReceipt] = useState<string>('');

  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [socket, setSocket] = useState<MockSocket | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [serverPublicKey, setServerPublicKey] = useState<CryptoKey | null>(null);

  const heartbeatRef = useRef<number | null>(null);
  const boothIdRef = useRef<string>(`BOOTH-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
  useEffect(() => {
    let ws: MockSocket;

    const connect = () => {
      setStatus('CONNECTING');
      ws = backend.connect();
      setSocket(ws);

      ws.onopen = () => {
        setStatus('AUTHENTICATING');
        ws.send(JSON.stringify({
          type: 'AUTH',
          payload: {
            boothId: boothIdRef.current,
            secret: 'x-secure-token'
          }
        }));
      };

      ws.onmessage = async (event) => {
        const msg: SocketMessage = JSON.parse(event.data);
        await handleSocketMessage(msg);
      };

      ws.onclose = () => {
        setStatus('OFFLINE');
        stopHeartbeat();
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      stopHeartbeat();
    };
  }, []);

  const startHeartbeat = (ws: MockSocket) => {
    stopHeartbeat();
    heartbeatRef.current = window.setInterval(() => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'HEARTBEAT' }));
      }
    }, 5000);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  const handleSocketMessage = async (msg: SocketMessage) => {
    switch (msg.type) {
      case 'AUTH_SUCCESS':
        if (msg.payload.publicKey) {
          const key = await cryptoService.importKey(msg.payload.publicKey, 'public');
          setServerPublicKey(key);
        }
        if (socket) startHeartbeat(socket);
        break;

      case 'AUTH_FAILED':
        alert("Booth Authentication Failed. Contact Admin.");
        break;

      case 'HEARTBEAT_ACK':
        setLastHeartbeat(Date.now());
        break;

      case 'ELECTION_STARTED':
        setCandidates(msg.payload.candidates);
        setStatus('ONLINE');
        break;

      case 'ELECTION_STOPPED':
        setStatus('LOCKED');
        break;

      case 'LOCK_BOOTH':
        setStatus('LOCKED');
        break;

      case 'VOTE_ACK':
        setReceipt(msg.payload.receiptHash);
        setStep('RECEIPT');
        if (settings.audioGuide) tts.speak("Vote submitted securely. Your receipt is on the screen.");
        break;

      case 'VOTE_ERROR':
        alert(msg.payload.message || "Error casting vote");
        setStep('VOTE');
        break;
    }
  };
  useEffect(() => {
    if (socket && (status === 'ONLINE' || status === 'LOCKED')) {
      startHeartbeat(socket);
    }
  }, [socket, status]);


  const submitEncryptedVote = async () => {
    if (!socket || status !== 'ONLINE' || !selectedCandidate || !serverPublicKey) {
      alert("System not ready or secure connection missing.");
      return;
    }

    try {
      if (settings.audioGuide) tts.speak("Encrypting and submitting your vote. Please wait.");
      const salt = crypto.randomUUID();
      const timestamp = Date.now();
      const rawData = `${selectedCandidate.id}|${salt}|${timestamp}`;
      const encryptedPayload = await cryptoService.encrypt(rawData, serverPublicKey);
      socket.send(JSON.stringify({
        type: 'VOTE',
        payload: { encryptedPayload }
      }));

    } catch (e) {
      console.error("Encryption failed", e);
      alert("Secure encryption failed. Please try again.");
    }
  };
  const resetBooth = () => {
    setStep('WELCOME');
    setVoterId('');
    setReceipt('');
    setSelectedCandidate(null);
    setSettings(prev => ({ ...prev, audioGuide: false }));
    tts.cancel();
  };
  useEffect(() => {
    let timer: number;
    if (step === 'RECEIPT') {
      timer = window.setTimeout(() => {
        resetBooth();
      }, 5000);
    }
    return () => window.clearTimeout(timer);
  }, [step]);

  // Audio Guide Effect
  useEffect(() => {
    tts.setEnabled(settings.audioGuide);
    if (step === 'WELCOME' && settings.audioGuide && status === 'ONLINE') {
      tts.speakDual(
        "Welcome to the Electronic Voting System. Press the Start button to begin.",
        "Matdaan pranali mein aapka swagat hai. Shuru karne ke liye Start button dabayein."
      );
    }
  }, [step, settings.audioGuide, status]);

    }`;

  const headingClass = `font-bold mb-6 ${settings.largeText ? 'text-5xl' : 'text-3xl'}`;
  const textClass = `mb-4 ${settings.largeText ? 'text-2xl' : 'text-lg'}`;

  if (status === 'CONNECTING' || status === 'AUTHENTICATING') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-mono">Connecting to Secure Server...</h2>
        <p className="text-sm text-slate-500 mt-2">{status}...</p>
        {!serverPublicKey && status === 'AUTHENTICATING' && (
          <p className="text-xs text-blue-400 mt-4 animate-pulse">Exchanging Cryptographic Keys...</p>
        )}
      </div>
    );
  if (status === 'OFFLINE') {
    return (
      <div className="min-h-screen bg-red-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-bold mb-4">Connection Lost</h1>
        <p className="mb-8">Attempting to reconnect...</p>
        <Button onClick={() => window.location.reload()} variant="secondary">Force Reload</Button>
      </div>
    );
  }

  if (status === 'LOCKED') {
    return (
      <div className="min-h-screen bg-slate-800 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-4xl font-bold mb-4">Booth Locked</h1>
        <p className="text-xl text-slate-400">Waiting for Election Administrator...</p>
        <div className="mt-8 flex gap-4">
          <div className="px-4 py-2 bg-slate-700 rounded text-xs font-mono">ID: {boothIdRef.current}</div>
          <div className="px-4 py-2 bg-slate-700 rounded text-xs font-mono">
            Ping: {Date.now() - lastHeartbeat}ms
          </div>
        </div>
        <Button variant="secondary" className="mt-8" onClick={onExit}>Exit App</Button>
      </div>
    );
  }

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center animate-fade-in">
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        System Online
      </div>
      <h1 className={`${headingClass} mb-12`}>
        {settings.language === 'en' ? 'Official Polling Booth' : 'Adhikarik Matdaan Kendra'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mb-12">
        <Button
          size="xl"
          highContrast={settings.highContrast}
          onClick={() => {
            setSettings(prev => ({ ...prev, audioGuide: true }));
            tts.setEnabled(true);
            setTimeout(() => {
              tts.speakDual("Starting System. Please verify your identity.", "System shuru ho raha hai. Kripya apni pehchan satyapit karein.");
              setStep('AUTH');
            }, 500);
          }}
        >
          <div className="flex flex-col items-center">
            <IconSpeaker />
            <span className="mt-2">Start with Audio</span>
            <span className="text-sm opacity-80 mt-1">Audio ke saath shuru karein</span>
          </div>
        </Button>

        <Button
          size="xl"
          variant="secondary"
          highContrast={settings.highContrast}
          onClick={() => {
            tts.setEnabled(false);
            setStep('AUTH');
          }}
        >
          <div className="flex flex-col items-center">
            <IconEye />
            <span className="mt-2">Start (Visual Only)</span>
            <span className="text-sm opacity-80 mt-1">Sirf dekhkar shuru karein</span>
          </div>
        </Button>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="flex flex-col items-center justify-center flex-1 p-8 max-w-2xl mx-auto w-full">
      <h2 className={headingClass}>Voter Authentication</h2>
      <p className={textClass}>Enter your Voter Token or scan QR code.</p>

      <input
        type="text"
        value={voterId}
        onChange={(e) => setVoterId(e.target.value)}
        placeholder="Enter Token (e.g. 1234)"
        className={`
          w-full p-6 text-3xl font-mono text-center tracking-widest rounded-lg border-4 mb-8 focus:outline-none
          ${settings.highContrast
            ? 'bg-black border-yellow-400 text-yellow-400 placeholder-yellow-400/50 focus:ring-4 focus:ring-yellow-300'
            : 'bg-white border-blue-200 text-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-200'}
        `}
        aria-label="Voter Token Input"
        autoFocus
      />

      <Button
        size="xl"
        highContrast={settings.highContrast}
        disabled={voterId.length < 3}
        onClick={() => {
          if (settings.audioGuide) tts.speak("Authentication successful. Please choose your display preferences.");
          setStep('ASSISTANCE');
        }}
      >
        Verify Identity
      </Button>
    </div>
  );

  const renderAssistance = () => (
    <div className="flex flex-col flex-1 p-8 max-w-4xl mx-auto w-full">
      <h2 className={headingClass}>Assistance Options</h2>
      <p className={textClass}>Customize your voting experience.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[
          { key: 'highContrast', label: 'High Contrast Mode', desc: 'Yellow on Black', icon: <IconEye /> },
          { key: 'largeText', label: 'Large Text', desc: 'Increase font size', icon: <span className="text-2xl font-bold">Aa</span> },
          { key: 'audioGuide', label: 'Audio Instructions', desc: 'Read out screen content', icon: <IconSpeaker /> },
        ].map((opt) => (
          <Card
            key={opt.key}
            highContrast={settings.highContrast}
            onClick={() => {
              setSettings(prev => ({ ...prev, [opt.key]: !prev[opt.key as keyof VoterSettings] }));
              if (opt.key === 'audioGuide' && !settings.audioGuide) {
                setTimeout(() => tts.speak("Audio Guide Enabled"), 100);
              }
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-current/10">{opt.icon}</div>
              <div>
                <div className="font-bold text-xl">{opt.label}</div>
                <div className="opacity-70">{opt.desc}</div>
              </div>
            </div>
            {settings[opt.key as keyof VoterSettings] && <div className="p-2 bg-green-500 rounded-full text-white"><IconCheck /></div>}
          </Card>
        ))}
      </div>

      <div className="flex justify-end mt-auto">
        <Button
          size="xl"
          highContrast={settings.highContrast}
          onClick={() => {
            if (settings.audioGuide) tts.speak("Proceeding to ballot. Select a candidate.");
            setStep('VOTE');
          }}
        >
          Continue to Vote &rarr;
        </Button>
      </div>
    </div>
  );

  const renderVote = () => (
    <div className="flex flex-col flex-1 p-6 w-full max-w-6xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h2 className={headingClass}>Official Ballot</h2>
        <div className={`px-4 py-2 rounded font-mono ${settings.highContrast ? 'bg-yellow-900 text-yellow-400' : 'bg-blue-100 text-blue-800'}`}>
          ID: {voterId}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto pb-20">
        {candidates.map(candidate => (
          <Card
            key={candidate.id}
            highContrast={settings.highContrast}
            tabIndex={0}
            className={`
              relative overflow-hidden group border-4
              ${selectedCandidate?.id === candidate.id
                ? (settings.highContrast ? 'border-yellow-400 bg-gray-900' : 'border-blue-600 bg-blue-50')
                : 'border-transparent'}
            `}
            onClick={() => {
              setSelectedCandidate(candidate);
              if (settings.audioGuide) tts.speak(`Selected ${candidate.name} from ${candidate.party}. Press Confirm to proceed.`);
            }}
          >
            <div className="flex items-center gap-6">
              <div className="text-6xl p-4 bg-gray-100 rounded-lg shadow-inner" aria-hidden="true">
                {candidate.symbol}
              </div>
              <div className="flex-1">
                <h3 className={`font-bold ${settings.largeText ? 'text-3xl' : 'text-2xl'}`}>{candidate.name}</h3>
                <p className={`opacity-80 ${settings.largeText ? 'text-xl' : 'text-lg'}`}>{candidate.party}</p>
              </div>
              {selectedCandidate?.id === candidate.id && (
                <div className="absolute top-4 right-4 text-green-600">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                </div>
              )}
            </div>
            {/* Color stripe */}
            <div className="absolute bottom-0 left-0 w-full h-3" style={{ backgroundColor: candidate.color }}></div>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full p-6 bg-inherit border-t border-current/10 flex justify-between items-center z-10">
        <Button
          variant="secondary"
          size="lg"
          highContrast={settings.highContrast}
          onClick={() => setStep('ASSISTANCE')}
        >
          Back
        </Button>
        <Button
          size="xl"
          highContrast={settings.highContrast}
          disabled={!selectedCandidate}
          onClick={() => setStep('CONFIRM')}
        >
          Review Selection
        </Button>
      </div>
    </div>
  );

  const renderConfirm = () => (
    <div className="flex flex-col items-center justify-center flex-1 p-8 max-w-3xl mx-auto w-full text-center">
      <h2 className={`${headingClass} mb-2`}>Confirm Your Vote</h2>
      <p className={`${textClass} mb-12 opacity-80`}>Please review your choice carefully. This action cannot be undone.</p>

      {selectedCandidate && (
        <Card highContrast={settings.highContrast} className="w-full mb-12 transform scale-105 border-4 border-current">
          <div className="flex flex-col items-center p-8">
            <span className="text-8xl mb-6">{selectedCandidate.symbol}</span>
            <h3 className="text-4xl font-bold mb-2">{selectedCandidate.name}</h3>
            <p className="text-2xl opacity-75">{selectedCandidate.party}</p>
          </div>
        </Card>
      )}

      <div className="flex gap-6 w-full">
        <Button
          variant="secondary"
          size="xl"
          className="flex-1"
          highContrast={settings.highContrast}
          onClick={() => setStep('VOTE')}
        >
          Change Selection
        </Button>
        <Button
          size="xl"
          variant="success"
          className="flex-1"
          highContrast={settings.highContrast}
          disabled={step === 'RECEIPT'}
          onClick={submitEncryptedVote}
        >
          CONFIRM VOTE
        </Button>
      </div>
    </div>
  );

  const renderReceipt = () => (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center max-w-2xl mx-auto">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>

      <h2 className={headingClass}>Vote Cast Successfully!</h2>
      <p className={textClass}>Your vote has been encrypted and stored anonymously.</p>

      <div className={`w-full p-6 rounded-lg font-mono text-sm break-all my-8 border-2 border-dashed ${settings.highContrast ? 'border-yellow-400 bg-gray-900' : 'border-gray-300 bg-gray-50'}`}>
        <div className="text-xs uppercase tracking-widest opacity-50 mb-2">Digital Receipt Hash</div>
        {receipt}
      </div>

      <p className="text-sm opacity-60 mb-12">System will reset automatically in 5 seconds.</p>

      <Button
        size="lg"
        highContrast={settings.highContrast}
        onClick={resetBooth}
      >
        Vote Next Voter
      </Button>
    </div>
  );

  return (
    <main className={containerClass} role="main" aria-live="polite">
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        {status === 'ONLINE' && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-mono opacity-50">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            WS-SECURE
          </div>
        )}
        <button
          onClick={() => setSettings(s => ({ ...s, highContrast: !s.highContrast }))}
          className={`p-2 rounded-full border-2 ${settings.highContrast ? 'border-yellow-400 bg-black text-yellow-400' : 'border-gray-800 bg-white text-gray-800'}`}
          aria-label="Toggle High Contrast"
        >
          <IconEye />
        </button>
      </div>

      {step === 'WELCOME' && renderWelcome()}
      {step === 'AUTH' && renderAuth()}
      {step === 'ASSISTANCE' && renderAssistance()}
      {step === 'VOTE' && renderVote()}
      {step === 'CONFIRM' && renderConfirm()}
      {step === 'RECEIPT' && renderReceipt()}
    </main>
  );
};