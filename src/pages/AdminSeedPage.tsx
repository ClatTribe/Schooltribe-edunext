import { useState } from 'react';
import { seedDemoData } from '@/scripts/seedDemoData';

export default function AdminSeedPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState('');

  const handleSeed = async () => {
    setStatus('loading');
    try {
      const res = await seedDemoData();
      setResult(res);
      setStatus('done');
    } catch (err) {
      setResult(String(err));
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="glass-card max-w-2xl w-full text-center space-y-6 bg-white border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Admin: Seed Demo Data</h1>
        <p className="text-gray-600">
          This will create 10 demo students with XP, test attempts, streaks, and gamification data in Firestore.
        </p>

        {status === 'idle' && (
          <button
            onClick={handleSeed}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-8 rounded-lg hover:from-orange-400 hover:to-orange-500 transition-all"
          >
            Seed 10 Demo Students
          </button>
        )}

        {status === 'loading' && (
          <div className="space-y-3">
            <div className="h-10 w-10 mx-auto animate-spin rounded-full border-2 border-gray-300 border-t-orange-500" />
            <p className="text-orange-600">Seeding Firestore... This may take 20-30 seconds.</p>
          </div>
        )}

        {(status === 'done' || status === 'error') && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 text-left text-sm font-mono whitespace-pre-wrap ${
              status === 'done' ? 'bg-emerald-50 border border-emerald-300 text-emerald-700' : 'bg-red-50 border border-red-300 text-red-700'
            }`}>
              {result}
            </div>
            <button
              onClick={() => { setStatus('idle'); setResult(''); }}
              className="text-orange-600 underline text-sm"
            >
              Run again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
