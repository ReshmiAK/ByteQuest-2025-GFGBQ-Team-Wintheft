import React, { useEffect, useRef, useState } from 'react';
import { Card, Button } from '../components/Shared';
import { backend } from '../services/mockBackend';
import { FaceMesh } from '@mediapipe/face_mesh';
import type { Candidate } from '../types';

type Props = {
  onDone: () => void;
};

type ZoneIndex = 0 | 1 | 2 | 3;

export const VisualVote: React.FC<Props> = ({ onDone }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverZone, setHoverZone] = useState<ZoneIndex | null>(null);
  const [selected, setSelected] = useState<ZoneIndex | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<ZoneIndex | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const blinkCounterRef = useRef(0);
  const hasVotedRef = useRef(false);

  useEffect(() => {
    const syncCandidates = () => {
      setCandidates(backend.getCandidates());
    };
    syncCandidates();
    backend.addEventListener('update', syncCandidates as EventListener);

    let stream: MediaStream | null = null;

    const setup = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Unable to access camera. Please grant permission and reload the page.');
        return;
      }

      const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      faceMesh.onResults((results) => {
        if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
          return;
        }
        const landmarks = results.multiFaceLandmarks[0];

        const irisIndices = [468, 469, 470, 471];
        let ix = 0;
        let iy = 0;
        irisIndices.forEach((idx) => {
          ix += landmarks[idx].x;
          iy += landmarks[idx].y;
        });
        ix /= irisIndices.length;
        iy /= irisIndices.length;

        const container = overlayRef.current?.getBoundingClientRect();
        if (!container) return;

        const px = container.width * ix;
        const py = container.height * iy;
        setPointer({ x: px, y: py });

        const zone: ZoneIndex | null = (() => {
          const midX = container.width / 2;
          const midY = container.height / 2;
          if (px < midX && py < midY) return 0;
          if (px >= midX && py < midY) return 1;
          if (px < midX && py >= midY) return 2;
          return 3;
        })();

        setHoverZone(zone);
        setSelected(zone);
        const top = landmarks[159];
        const bottom = landmarks[145];
        const blinkDist = Math.hypot(top.x - bottom.x, top.y - bottom.y);
        const BLINK_THRESHOLD = 0.01;

        if (blinkDist < BLINK_THRESHOLD) {
          blinkCounterRef.current += 1;
        } else {
          blinkCounterRef.current = 0;
        }

        if (!hasVotedRef.current && zone && blinkCounterRef.current > 10) {
          hasVotedRef.current = true;
          setPendingChoice(zone);
          setShowConfirm(true);
        }
      });

      faceMeshRef.current = faceMesh;

      const loop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          requestAnimationFrame(loop);
          return;
        }
        try {
          await faceMesh.send({ image: videoRef.current });
        } catch {
        }
        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    };

    void setup();

    return () => {
      backend.removeEventListener('update', syncCandidates as EventListener);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, []);

  const castVote = async (zone: ZoneIndex) => {
    try {
      const candidate = candidates[zone];
      if (!candidate) return;
      const { receiptHash } = await backend.castDirectVote(candidate.id);
      setReceipt(receiptHash);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmVote = async () => {
    if (!pendingChoice) return;
    try {
      setShowConfirm(false);
      setConfirmed(true);
      await castVote(pendingChoice);
      setTimeout(onDone, 3000);
    } finally {
      hasVotedRef.current = true;
    }
  };

  const handleCancelVote = () => {
    setShowConfirm(false);
    setPendingChoice(null);
    setConfirmed(false);
    setReceipt(null);
    hasVotedRef.current = false;
    blinkCounterRef.current = 0;
  };

  const renderCard = (index: ZoneIndex) => {
    const candidate = candidates[index];
    const isHover = hoverZone === index;
    const isSelected = selected === index;
    return (
      <Card
        key={index}
        onClick={() => setSelected(index)}
        className={`cursor-pointer transition-transform ${
          isSelected ? 'ring-2 ring-blue-500 scale-[1.02]' : ''
        } ${isHover ? 'bg-slate-700' : ''}`}
      >
        <div className="flex flex-col items-center justify-center py-6">
          <div className="text-5xl mb-3" aria-hidden="true">
            {candidate?.symbol ?? '❓'}
          </div>
          <div className="font-bold text-lg mb-1">
            {candidate ? candidate.name : 'Not configured'}
          </div>
          {candidate && (
            <div className="text-xs text-slate-300">{candidate.party}</div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-5xl w-full bg-slate-900 text-white border-slate-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="space-y-4 flex flex-col">
            <h1 className="text-3xl font-bold">Visual Voting</h1>
            <p className="text-slate-400 text-sm">
              Keep your face in view of the camera. A pointer follows your eye movement across
              the four symbols. Look at a symbol and hold your eyes closed to confirm your
              vote.
            </p>

            {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

            <div
              ref={overlayRef}
              className="relative grid grid-cols-2 grid-rows-2 gap-4 flex-1 mt-2"
            >
              {renderCard(0)}
              {renderCard(1)}
              {renderCard(2)}
              {renderCard(3)}

              {pointer && (
                <div
                  className="pointer-events-none absolute w-5 h-5 rounded-full border-2 border-yellow-300 bg-yellow-300/60 shadow-[0_0_10px_rgba(250,204,21,0.8)]"
                  style={{
                    transform: `translate(${pointer.x - 10}px, ${pointer.y - 10}px)`,
                  }}
                />
              )}
            </div>

            {showConfirm && pendingChoice && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 z-20">
                <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
                  <h2 className="text-xl font-semibold mb-3">Confirm Your Choice</h2>
                  <p className="mb-4 text-sm text-slate-300">
                    You have selected <span className="font-bold">{pendingChoice}</span>. Close this
                    dialog by choosing an option below.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={handleCancelVote}
                    >
                      Change Selection
                    </Button>
                    <Button size="md" variant="success" onClick={handleConfirmVote}>
                      Confirm Vote
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {confirmed && selected && (
              <div className="mt-2 text-green-400 text-sm font-semibold">
                Vote recorded for {selected}. Thank you.
              </div>
            )}
            {receipt && (
              <div className="mt-1 text-xs text-slate-400 break-all">
                Receipt: {receipt}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button variant="secondary" size="md" onClick={onDone}>
                Back
              </Button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden bg-black min-h-[260px] flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VisualVote;
