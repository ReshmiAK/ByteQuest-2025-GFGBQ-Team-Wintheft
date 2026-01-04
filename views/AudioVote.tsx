import React, { useEffect, useRef, useState } from 'react';
import { Card, Button } from '../components/Shared';
import { backend } from '../services/mockBackend';
import type { Candidate } from '../types';

const numberMap: Record<string, number> = {
  '1': 1, 'one': 1, 'won': 1, 'on': 1, '11': 1, '111': 1,
  '2': 2, 'two': 2, 'to': 2, 'too': 2, 'tu': 2, '22': 2,
  '3': 3, 'three': 3, 'tree': 3, 'free': 3, '33': 3,
  '4': 4, 'four': 4, 'for': 4, 'fo': 4, '44': 4,
};

const confirmationWords = ['yes', 'yeah', 'yep', 'yas', 'ya', 'correct', 'right', 'sure', 'ok'];

type Props = {
  onDone: () => void;
};

type Phase = 'idle' | 'listening' | 'confirm' | 'success';

export const AudioVote: React.FC<Props> = ({ onDone }) => {
  const [status, setStatus] = useState<string>('Press "Start Voice Voting" to begin.');
  const [chosen, setChosen] = useState<Candidate | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [supported, setSupported] = useState<boolean>(true);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  const speak = (text: string) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.9;
      synth.cancel();
      synth.speak(utt);
    } catch {
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      setStatus('Your browser does not support speech recognition. Try Chrome on desktop.');
      return;
    }
    recognitionRef.current = SpeechRecognition;

    const syncCandidates = () => {
      setCandidates(backend.getCandidates());
    };
    syncCandidates();
    backend.addEventListener('update', syncCandidates as EventListener);

    return () => {
      backend.removeEventListener('update', syncCandidates as EventListener);
    };
  }, []);

  const listenOnce = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const SpeechRecognition = recognitionRef.current;
      if (!SpeechRecognition) {
        resolve(null);
        return;
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        resolve(transcript);
      };
      rec.onerror = () => {
        resolve(null);
      };
      rec.onnomatch = () => {
        resolve(null);
      };
      rec.onend = () => {
        resolve(null);
      };

      try {
        rec.start();
      } catch {
        resolve(null);
      }
    });
  };

  const findCandidate = (phrase: string | null): Candidate | null => {
    if (!phrase) return null;
    const lower = phrase.toLowerCase();
    let chosenNumber: number | null = null;
    for (const key of Object.keys(numberMap)) {
      if (lower.includes(key)) {
        chosenNumber = numberMap[key];
        break;
      }
    }
    if (!chosenNumber) return null;
    const index = chosenNumber - 1;
    if (index < 0 || index >= candidates.length) return null;
    return candidates[index];
  };

  const includesYes = (phrase: string | null): boolean => {
    if (!phrase) return false;
    return confirmationWords.some((w) => phrase.includes(w));
  };

  const castBackendVote = async (candidate: Candidate) => {
    try {
      const { receiptHash } = await backend.castDirectVote(candidate.id);
      setReceipt(receiptHash);
    } catch (err) {
      console.error(err);
      const msg = 'Error recording vote. Please contact the administrator.';
      setStatus(msg);
      speak(msg);
    }
  };

  const announceOptions = (list: Candidate[]) => {
    if (!list.length) {
      const msg = 'No candidates are configured. Please contact the election officer.';
      setStatus(msg);
      speak(msg);
      return;
    }
    const options = list.slice(0, 4);
    speak('System ready.');
    const gapMs = 1500;
    options.forEach((candidate, idx) => {
      const num = idx + 1;
      setTimeout(
        () => speak(`Say ${num} to vote for ${candidate.name}.`),
        gapMs * (idx + 1)
      );
    });
  };

  const startFlow = async () => {
    if (!supported) return;
    const list = candidates;
    if (!list.length) {
      const msg = 'No candidates are configured. Please contact the administrator.';
      setStatus(msg);
      speak(msg);
      return;
    }
    announceOptions(list);
    setPhase('listening');

    while (true) {
      setStatus('Listening for your number...');
      speak('Please say your number.');
      const cmd = await listenOnce();
      const candidate = findCandidate(cmd);

      if (!candidate) {
        speak("I did not catch that. Say one, two, three, or four.");
        setStatus("Could not understand. Try again.");
        continue;
      }

      setChosen(candidate);
      setPhase('confirm');
      setShowConfirm(true);
      const msg = `You picked ${candidate.name}. Say YES to lock your vote.`;
      setStatus(msg);
      speak(msg);

      const confirmPhrase = await listenOnce();
      if (includesYes(confirmPhrase)) {
        setShowConfirm(false);
        setPhase('success');
        const doneMsg = `Vote confirmed for ${candidate.name}. Thank you.`;
        setStatus(doneMsg);
        speak(doneMsg);
        await castBackendVote(candidate);
        setTimeout(onDone, 3000);
        break;
      } else {
        setShowConfirm(false);
        speak("Cancelled. Let's try again.");
        setStatus('Cancelled. Listening again...');
        setPhase('listening');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-slate-900 text-white border-slate-700">
        <h1 className="text-3xl font-bold mb-2 text-center">Voice Voting</h1>
        <p className="text-slate-400 text-center mb-6">
          This mode uses your microphone to capture your choice.
        </p>

        {!supported && (
          <div className="mb-6 text-center text-red-400 text-sm">{status}</div>
        )}

        {supported && (
          <>
            <div className="mb-6 text-center text-lg min-h-[3rem]">{status}</div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {candidates.slice(0, 4).map((c, idx) => (
                <Card
                  key={c.id}
                  className="bg-slate-800 text-white border-slate-600 flex flex-col items-center justify-center py-4"
                >
                  <div className="text-3xl mb-1">{idx + 1}</div>
                  <div className="text-4xl mb-1" aria-hidden="true">
                    {c.symbol}
                  </div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-slate-300">{c.party}</div>
                </Card>
              ))}
              {candidates.length === 0 && (
                <div className="col-span-2 text-center text-sm text-slate-400">
                  No candidates configured. Please contact the administrator.
                </div>
              )}
            </div>

            {showConfirm && chosen && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 z-20">
                <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
                  <h2 className="text-xl font-semibold mb-3">Confirm Your Choice</h2>
                  <p className="mb-4 text-sm text-slate-300">
                    You selected{' '}
                    <span className="font-bold">{chosen.name}</span>
                    {chosen.symbol && <span className="ml-1">{chosen.symbol}</span>}.<br />
                    Please <span className="font-semibold">say YES</span> now to lock in your
                    vote. If you do not say YES, this vote will be cancelled and you can try again.
                  </p>
                </div>
              </div>
            )}

            {chosen && (
              <div className="mb-2 text-center text-sm text-green-400">
                Current selection:{' '}
                <span className="font-semibold">{chosen.name}</span>
                {chosen.symbol && <span className="ml-1">{chosen.symbol}</span>}
              </div>
            )}
            {receipt && (
              <div className="mb-4 text-center text-xs text-slate-400 break-all">
                Receipt: {receipt}
              </div>
            )}

            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                onClick={() => {
                  setChosen(null);
                  setPhase('idle');
                  startFlow();
                }}
              >
                {phase === 'idle' ? 'Start Voice Voting' : 'Restart Listening'}
              </Button>
              <Button variant="secondary" size="lg" onClick={onDone}>
                Back
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AudioVote;
