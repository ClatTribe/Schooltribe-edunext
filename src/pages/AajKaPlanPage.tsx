import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { geminiStructuredModel } from '@/lib/gemini';
import { getDocument, setDocument } from '@/services/firestoreService';

interface StudyBlock {
  id: string;
  time: string;
  duration: string;
  title: string;
  description: string;
  type: 'revision' | 'practice' | 'test' | 'break' | 'video';
  icon: string;
  topics: string[];
  completed: boolean;
}

interface DailyPlan {
  date: string;
  dayOfWeek: string;
  personalGreeting: string;
  blocks: StudyBlock[];
  totalBlocks: number;
  completedBlocks: number;
}

const blockTypeIcons: Record<string, string> = {
  revision: '✨',
  practice: '✏️',
  test: '📝',
  break: '☕',
  video: '🎥',
};

export default function AajKaPlanPage() {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getDayOfWeek = () => {
    return new Date().toLocaleDateString('en-IN', { weekday: 'long' });
  };

  /**
   * Safely parse Gemini JSON response — handles markdown fences, raw JSON, etc.
   */
  const safeParseJSON = (text: string): unknown => {
    // 1. Direct parse
    try { return JSON.parse(text); } catch { /* continue */ }

    // 2. Strip markdown code fences
    const stripped = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    try { return JSON.parse(stripped); } catch { /* continue */ }

    // 3. Extract outermost { ... }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
    }

    throw new Error('Failed to parse AI response as JSON');
  };

  /**
   * Normalize a parsed plan — ensure all fields exist with safe defaults
   * so the UI never renders empty blocks.
   */
  const normalizePlan = (raw: Record<string, unknown>, today: string, dayOfWeek: string): DailyPlan => {
    const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : [];

    const blocks: StudyBlock[] = rawBlocks.map((b: Record<string, unknown>, idx: number) => ({
      id: (b.id as string) || `block_${idx}`,
      time: (b.time as string) || '',
      duration: (b.duration as string) || '30 min',
      title: (b.title as string) || `Study Block ${idx + 1}`,
      description: (b.description as string) || '',
      type: (['revision', 'practice', 'test', 'break', 'video'].includes(b.type as string)
        ? b.type
        : 'revision') as StudyBlock['type'],
      icon: (b.icon as string) || blockTypeIcons[(b.type as string) || 'revision'] || '📖',
      topics: Array.isArray(b.topics) ? b.topics.map(String) : [],
      completed: Boolean(b.completed),
    }));

    return {
      date: today,
      dayOfWeek,
      personalGreeting: (raw.personalGreeting as string) || `Hey ${user?.displayName || 'Student'}! Aaj full focus mode on hai! 💪`,
      blocks,
      totalBlocks: blocks.length,
      completedBlocks: blocks.filter((b) => b.completed).length,
    };
  };

  const generatePlan = async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      const today = getTodayDate();
      const dayOfWeek = getDayOfWeek();
      const board = profile?.board || 'CBSE';
      const classLevel = profile?.class || 10;
      const subjects = profile?.subjects?.join(', ') || 'Science, Maths';

      const prompt = `Generate a personalized daily study plan for a ${board} Class ${classLevel} student for today (${dayOfWeek}, ${today}).

Student Name: ${user.displayName || 'Student'}
Subjects: ${subjects}

Create a realistic study schedule with 5-6 study blocks throughout the day (morning, afternoon, evening). Each block should include:
- "id": unique string like "block_1", "block_2", etc.
- "time": Time slot (e.g., "6:00 - 6:30 AM")
- "duration": Duration (e.g., "30 min")
- "title": catchy, motivating title
- "description": Description in simple Hinglish (what to study/do)
- "type": one of "revision", "practice", "test", "break", or "video"
- "icon": appropriate emoji for the type
- "topics": array of 2-3 relevant topics/subjects as tags
- "completed": false (initially)

Mix activity types throughout the day - don't put all revisions together. Include at least one break block.

Also provide:
- "personalGreeting": A warm, personalized Hinglish greeting for the student
- "totalBlocks": Total number of blocks
- "completedBlocks": 0 (initially)
- "date": "${today}"
- "dayOfWeek": "${dayOfWeek}"

Return ONLY valid JSON with the structure:
{
  "personalGreeting": "string",
  "blocks": [ { "id": "block_1", "time": "...", "duration": "...", "title": "...", "description": "...", "type": "...", "icon": "...", "topics": ["..."], "completed": false } ],
  "totalBlocks": 6,
  "completedBlocks": 0,
  "date": "${today}",
  "dayOfWeek": "${dayOfWeek}"
}`;

      const response = await geminiStructuredModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = response.response.text();

      const parsed = safeParseJSON(text) as Record<string, unknown>;
      const safePlan = normalizePlan(parsed, today, dayOfWeek);

      if (safePlan.blocks.length === 0) {
        throw new Error('AI returned a plan with no study blocks. Please try again.');
      }

      const docId = `${user.uid}_${today}`;
      await setDocument('dailyPlans', docId, {
        ...safePlan,
        generatedAt: new Date().toISOString(),
      });

      setPlan(safePlan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate plan';
      console.error('Error generating plan:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const loadPlan = async () => {
    if (!user?.uid) return;

    try {
      const today = getTodayDate();
      const dayOfWeek = getDayOfWeek();
      const docId = `${user.uid}_${today}`;
      const cachedPlan = await getDocument('dailyPlans', docId);

      if (cachedPlan) {
        // Normalize cached data to ensure all fields/arrays exist
        const safePlan = normalizePlan(cachedPlan as Record<string, unknown>, today, dayOfWeek);
        setPlan(safePlan);
        setLoading(false);
      } else {
        setGenerating(true);
        await generatePlan();
      }
    } catch (err) {
      console.error('Error loading plan:', err);
      setError('Failed to load plan. Try generating a new one.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleBlockToggle = async (blockId: string) => {
    if (!plan) return;

    try {
      const updatedBlocks = plan.blocks.map((block) =>
        block.id === blockId ? { ...block, completed: !block.completed } : block
      );

      const completedCount = updatedBlocks.filter((b) => b.completed).length;
      const updatedPlan = {
        ...plan,
        blocks: updatedBlocks,
        completedBlocks: completedCount,
      };

      setPlan(updatedPlan);

      // Update Firestore
      if (user?.uid) {
        const docId = `${user.uid}_${getTodayDate()}`;
        await setDocument('dailyPlans', docId, updatedPlan);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update block';
      console.error('Error toggling block:', err);
      setError(errorMessage);
    }
  };

  const handleGenerateNewPlan = async () => {
    setGenerating(true);
    await generatePlan();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-500">Creating your daily plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 mb-4 font-semibold">Failed to generate plan</p>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <button
            onClick={handleGenerateNewPlan}
            disabled={generating}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition"
          >
            {generating ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Unable to generate plan</p>
          <button
            onClick={handleGenerateNewPlan}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage = (plan.completedBlocks / plan.totalBlocks) * 100;
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Aaj Ka Plan 📋</h1>
            <p className="text-gray-500">
              {getDayOfWeek()}, {dateStr}
            </p>
          </div>
          <button
            onClick={handleGenerateNewPlan}
            disabled={generating}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition transform hover:scale-105 flex items-center gap-2"
          >
            <span>✨</span>
            {generating ? 'Generating...' : 'New Plan'}
          </button>
        </div>

        {/* Greeting Card */}
        <div
          className="glass-card animate-fade-in-up"
          style={{
            animationDelay: '0.1s',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <p className="text-2xl md:text-3xl font-bold text-orange-600">{plan.personalGreeting}</p>
        </div>

        {/* Progress Bar */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">TODAY'S PROGRESS</h3>
            <span className="text-lg font-bold text-orange-500">
              {plan.completedBlocks}/{plan.totalBlocks}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {plan.completedBlocks === 0
              ? 'Start your day strong! 💪'
              : plan.completedBlocks === plan.totalBlocks
              ? 'Excellent! All done for today! 🎉'
              : `Keep going! ${plan.totalBlocks - plan.completedBlocks} block${plan.totalBlocks - plan.completedBlocks !== 1 ? 's' : ''} remaining`}
          </p>
        </div>

        {/* Study Blocks Timeline */}
        <div className="space-y-4">
          {plan.blocks.map((block, idx) => {
            const isCurrentOrNext = idx === 0 || (idx > 0 && plan.blocks[idx - 1].completed && !block.completed);
            const isCompleted = block.completed;

            return (
              <div
                key={block.id}
                className={`glass-card animate-fade-in-up transition-all duration-300 cursor-pointer hover:border-orange-400/50 ${
                  isCurrentOrNext ? 'border-2 border-orange-400' : ''
                } ${isCompleted ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${0.2 + idx * 0.05}s` }}
                onClick={() => handleBlockToggle(block.id)}
              >
                <div className="flex gap-4 items-start">
                  {/* Checkbox Circle */}
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500/30 border-green-500'
                          : isCurrentOrNext
                          ? 'border-orange-400 bg-orange-400/10'
                          : 'border-gray-300 bg-gray-100'
                      }`}
                    >
                      {isCompleted && <span className="text-green-600 text-lg">✓</span>}
                      {!isCompleted && isCurrentOrNext && <span className="text-orange-500 text-lg">●</span>}
                    </div>
                  </div>

                  {/* Block Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{blockTypeIcons[block.type]}</span>
                        <div>
                          <h4
                            className={`font-bold text-lg transition-all ${
                              isCompleted
                                ? 'text-gray-500 line-through'
                                : isCurrentOrNext
                                ? 'text-orange-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {block.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {block.time} • {block.duration}
                          </p>
                        </div>
                      </div>
                      {isCurrentOrNext && !isCompleted && (
                        <div className="flex-shrink-0 animate-pulse">
                          <div className="live-dot" />
                        </div>
                      )}
                    </div>

                    <p
                      className={`text-sm mb-4 leading-relaxed ${
                        isCompleted ? 'text-gray-500' : 'text-gray-700'
                      }`}
                    >
                      {block.description}
                    </p>

                    {/* Topics Tags */}
                    <div className="flex flex-wrap gap-2">
                      {block.topics.map((topic, i) => (
                        <span
                          key={i}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            isCompleted
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-orange-100 text-orange-600'
                          }`}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Motivational Footer */}
        {plan.completedBlocks === plan.totalBlocks && (
          <div
            className="glass-card animate-fade-in-up text-center py-8 border-2 border-green-400/30"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)' }}
          >
            <p className="text-2xl font-bold text-green-600 mb-2">🎉 Perfect! All done for today!</p>
            <p className="text-gray-700">You've completed all your study blocks. Great job!</p>
          </div>
        )}

        {/* Footer spacing */}
        <div className="h-12" />
      </div>

      <style>{`
        .live-dot {
          width: 8px;
          height: 8px;
          background-color: #f97316;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
        }

        @keyframes pulse-dot {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2), 0 0 0 4px rgba(249, 115, 22, 0.1);
          }
          50% {
            box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.4), 0 0 0 6px rgba(249, 115, 22, 0.15);
          }
        }

        .live-dot {
          animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
