import React, { useEffect, useState } from 'react';
import { backend } from '../services/mockBackend';
import { ElectionState, PredefinedParties, ConnectedBooth } from '../types';
import { Button, Card, IconCheck } from '../components/Shared';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [state, setState] = useState<ElectionState | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [booths, setBooths] = useState<ConnectedBooth[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [newName, setNewName] = useState('');
  const [newParty, setNewParty] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');

  const [, setTick] = useState(0);

  const fetchData = () => {
    setState(backend.getElectionState());
    setVotes(backend.getVotesForAdmin());
    setBooths(backend.getConnectedBooths());
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const handler = () => fetchData();
      backend.addEventListener('update', handler);
      const timer = setInterval(() => setTick(t => t + 1), 5000);
      
      return () => {
        backend.removeEventListener('update', handler);
        clearInterval(timer);
      };
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '123456') {
      setIsAuthenticated(true);
    } else {
      alert("Invalid password. Try 123456");
    }
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newParty || !newSymbol) return;
    
    backend.addCandidate({
      name: newName,
      party: newParty,
      symbol: newSymbol,
      color: newColor
    });

    setNewName('');
    setNewSymbol('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-slate-800 text-center">Election Authority Login</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input 
                type="password" 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 outline-none transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full py-3 shadow-blue-200">Access Dashboard</Button>
          </form>
        </Card>
      </div>
    );
  }

  const chartData = state?.candidates.map(c => ({
    name: c.name,
    votes: votes[c.id] || 0,
    color: c.color
  })) || [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">A</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SecureVote Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Status:</span>
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${state?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {state?.isActive ? 'Election Live' : 'Configuring'}
            </span>
            <Button variant="secondary" size="md" onClick={onLogout} className="text-xs border-slate-300">Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 shadow-sm">
            <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Total Votes Cast</div>
            <div className="text-5xl font-bold text-blue-600">{state?.totalVotes}</div>
          </Card>
          
          <Card className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 shadow-sm">
             <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Candidates</div>
             <div className="text-5xl font-bold text-blue-600">{state?.candidates.length}</div>
          </Card>

           <Card className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 shadow-sm">
             <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Connected Booths</div>
             <div className="text-5xl font-bold text-blue-600">
               {booths.filter(b => b.status === 'ONLINE' && (Date.now() - b.lastHeartbeat < 15000)).length}
             </div>
             <div className="text-xs text-slate-500 mt-2">Active Terminals</div>
          </Card>

          <Card className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 shadow-sm">
             <div className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-2">Election Control</div>
             <div className="flex flex-col w-full gap-2 mt-2">
               {state?.isActive ? (
                 <Button variant="danger" onClick={() => backend.toggleElectionStatus(false)}>Stop Election</Button>
               ) : (
                 <Button variant="success" onClick={() => backend.toggleElectionStatus(true)} disabled={state?.candidates.length === 0}>
                   Launch Election
                 </Button>
               )}
               <Button 
                 variant="secondary" 
                 onClick={() => {
                   if(confirm("DANGER: This will delete ALL votes and candidates to start a fresh election.")) {
                     backend.resetSystem();
                   }
                 }}
               >
                 Create New Election
               </Button>
             </div>
          </Card>
        </div>

        {state?.isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 h-[500px] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Live Vote Distribution</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Booth Monitor Panel */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                <span>Network Monitor</span>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3">
                {booths.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 italic">No booths connected</div>
                ) : (
                  booths.map(booth => {
                    const secondsAgo = Math.floor((Date.now() - booth.lastHeartbeat) / 1000);
                    const isOnline = booth.status === 'ONLINE' && secondsAgo < 15;
                    
                    return (
                      <div key={booth.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-green-200 shadow-lg' : 'bg-red-400'}`}></div>
                          <div>
                            <div className="font-mono text-sm font-bold text-slate-700">{booth.id}</div>
                            <div className="text-xs text-slate-500">
                              {isOnline ? `Ping: <50ms` : 'Signal Lost'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold ${isOnline ? 'text-green-700' : 'text-red-600'}`}>
                            {isOnline ? 'ACTIVE' : 'OFFLINE'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {secondsAgo}s ago
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {!state?.isActive && (
            <Card className="lg:col-span-4 border border-blue-200 shadow-sm bg-blue-50/50">
              <h3 className="text-lg font-bold mb-4 text-blue-900">Add Candidate</h3>
              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                  <input required className="w-full p-2 border rounded" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Jane Doe" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Party Name</label>
                  <input required list="parties" className="w-full p-2 border rounded" value={newParty} onChange={e => setNewParty(e.target.value)} placeholder="e.g. Liberty Party" />
                  <datalist id="parties">
                    {PredefinedParties.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Symbol (Emoji)</label>
                    <input required className="w-full p-2 border rounded text-center text-xl" maxLength={2} value={newSymbol} onChange={e => setNewSymbol(e.target.value)} placeholder="🦅" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Color</label>
                    <input type="color" className="w-16 h-10 p-1 border rounded cursor-pointer" value={newColor} onChange={e => setNewColor(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-2">Add to Ballot</Button>
              </form>
            </Card>
          )}

          <Card className={`${!state?.isActive ? 'lg:col-span-8' : 'lg:col-span-12'} border border-slate-200 shadow-sm`}>
            <h3 className="text-lg font-bold mb-4">Ballot Candidates</h3>
            {state?.candidates.length === 0 ? (
               <div className="text-center py-12 text-slate-400 italic bg-slate-50 rounded-lg border-2 border-dashed">
                 No candidates registered. Add candidates to start election.
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state?.candidates.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center">
                      <div className="w-12 h-12 flex items-center justify-center text-3xl bg-slate-100 rounded-full mr-4">{c.symbol}</div>
                      <div>
                        <div className="font-bold text-slate-900">{c.name}</div>
                        <div className="text-sm text-slate-500">{c.party}</div>
                      </div>
                    </div>
                    {!state?.isActive && (
                      <button 
                        onClick={() => backend.removeCandidate(c.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </main>
    </div>
  );
};