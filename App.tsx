import React, { useState } from 'react';
import { ViewMode } from './types';
import { AdminDashboard } from './views/AdminDashboard';
import { Card } from './components/Shared';
import AudioVote from './views/AudioVote';
import VisualVote from './views/VisualVote';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('SPLASH');
  const [mode, setMode] = useState<'CHOICE' | 'AUDIO' | 'VISUAL'>('CHOICE');

  const renderSplash = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-xl w-full p-8 text-center bg-white border border-slate-200 shadow-2xl">
        <div className="mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-xl shadow-blue-500/20 mb-6">
            🗳️
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">SecureVote EVS</h1>
          <p className="text-slate-600">Enterprise Grade Electronic Voting System</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => {
              setView('BOOTH');
              setMode('CHOICE');
            }}
            className="w-full group relative flex items-center p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left bg-slate-50"
          >
            <div className="bg-white p-3 rounded-lg text-blue-600 mr-4 shadow-sm group-hover:bg-blue-500 group-hover:text-white transition-colors border border-slate-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
            </div>
            <div>
              <div className="font-bold text-slate-900">Launch Polling Booth</div>
              <div className="text-sm text-slate-500">Voter Interface (Kiosk Mode)</div>
            </div>
          </button>

          <button 
            onClick={() => setView('ADMIN')}
            className="w-full group relative flex items-center p-4 border-2 border-slate-100 rounded-xl hover:border-slate-800 hover:bg-slate-50 transition-all text-left bg-slate-50"
          >
             <div className="bg-white p-3 rounded-lg text-slate-600 mr-4 shadow-sm group-hover:bg-slate-800 group-hover:text-white transition-colors border border-slate-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <div>
              <div className="font-bold text-slate-900">Admin Console</div>
              <div className="text-sm text-slate-500">Election Control & Analytics</div>
            </div>
          </button>
        </div>
        
        <div className="mt-8 text-xs text-slate-400">
          v1.0.0 • Local Secure Environment • TypeScript
        </div>
      </Card>
    </div>
  );

  return (
    <>
      {view === 'SPLASH' && renderSplash()}
      {view === 'BOOTH' && (
        mode === 'CHOICE' ? (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full p-8 text-center bg-white border border-slate-200 shadow-2xl">
              <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                System Online
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-8">Official Polling Booth</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <button
                  onClick={() => setMode('AUDIO')}
                  className="rounded-xl bg-blue-600 text-white py-6 px-4 font-semibold text-lg shadow-lg hover:bg-blue-700 transition flex flex-col items-center"
                >
                  <span className="text-2xl mb-2">🔊</span>
                  <span>Start with Audio</span>
                  <span className="text-xs opacity-80 mt-1">Audio ke saath shuru karein</span>
                </button>
                <button
                  onClick={() => setMode('VISUAL')}
                  className="rounded-xl bg-white text-slate-900 border border-slate-200 py-6 px-4 font-semibold text-lg shadow-sm hover:border-slate-400 transition flex flex-col items-center"
                >
                  <span className="text-2xl mb-2">👁️</span>
                  <span>Start (Visual Only)</span>
                  <span className="text-xs text-slate-500 mt-1">Sirf dekhkar shuru karein</span>
                </button>
              </div>
              <button
                onClick={() => setView('SPLASH')}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Back to main menu
              </button>
            </Card>
          </div>
        ) : mode === 'AUDIO' ? (
          <AudioVote
            onDone={() => {
              setMode('CHOICE');
              setView('SPLASH');
            }}
          />
        ) : (
          <VisualVote
            onDone={() => {
              setMode('CHOICE');
              setView('SPLASH');
            }}
          />
        )
      )}
      {view === 'ADMIN' && <AdminDashboard onLogout={() => setView('SPLASH')} />}
    </>
  );
};

export default App;