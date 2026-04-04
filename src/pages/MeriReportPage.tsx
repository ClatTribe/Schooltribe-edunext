import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { geminiStructuredModel } from '@/lib/gemini';
import { getDocument, setDocument } from '@/services/firestoreService';

interface WeeklyReport {
  weeklyGrade: string;
  gradeColor: string;
  personalMessage: string;
  subjectAnalysis: {
    subject: string;
    accuracy: number;
    grade: string;
    trend: 'improving' | 'stable' | 'declining';
    weakAreas: string[];
    strongAreas: string[];
    advice: string;
  }[];
  strengths: string[];
  areasToImprove: string[];
  errorPatterns: string[];
  timeAnalysis: string;
  nextWeekPlan: string[];
  motivationalQuote: string;
}

export default function MeriReportPage() {
  const { user, profile } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG FIX: Don't mutate the Date object — create a new one for monday
  const getWeekStartDate = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday = 1
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  /**
   * Safely parse Gemini JSON — handles markdown fences, raw JSON, etc.
   */
  const safeParseJSON = (text: string): unknown => {
    try { return JSON.parse(text); } catch { /* continue */ }

    const stripped = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    try { return JSON.parse(stripped); } catch { /* continue */ }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
    }

    throw new Error('Failed to parse AI response as JSON');
  };

  /**
   * Normalize a parsed report — ensure ALL fields and nested arrays exist
   * so the UI never renders empty headings with no content.
   */
  const normalizeReport = (raw: Record<string, unknown>): WeeklyReport => {
    // Handle subjectAnalysis — Gemini might name it differently
    let rawSubjects = raw.subjectAnalysis || raw.subject_analysis || raw.subjects || [];
    if (!Array.isArray(rawSubjects)) rawSubjects = [];

    const subjectAnalysis = (rawSubjects as Record<string, unknown>[]).map((s) => ({
      subject: (s.subject as string) || (s.name as string) || 'Subject',
      accuracy: typeof s.accuracy === 'number' ? s.accuracy : 50,
      grade: (s.grade as string) || 'B',
      trend: (['improving', 'stable', 'declining'].includes(s.trend as string)
        ? s.trend
        : 'stable') as 'improving' | 'stable' | 'declining',
      weakAreas: Array.isArray(s.weakAreas) ? s.weakAreas.map(String)
        : Array.isArray(s.weak_areas) ? (s.weak_areas as string[]).map(String)
        : [],
      strongAreas: Array.isArray(s.strongAreas) ? s.strongAreas.map(String)
        : Array.isArray(s.strong_areas) ? (s.strong_areas as string[]).map(String)
        : [],
      advice: (s.advice as string) || (s.recommendation as string) || '',
    }));

    // Handle possible snake_case or camelCase variants from Gemini
    const toStringArray = (val: unknown, ...fallbacks: unknown[]): string[] => {
      const candidates = [val, ...fallbacks];
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c.map(String);
      }
      return [];
    };

    return {
      weeklyGrade: (raw.weeklyGrade as string) || (raw.weekly_grade as string) || 'B',
      gradeColor: (raw.gradeColor as string) || (raw.grade_color as string) || '#f59e0b',
      personalMessage: (raw.personalMessage as string) || (raw.personal_message as string) || (raw.message as string) || 'Keep going, you are doing great!',
      subjectAnalysis,
      strengths: toStringArray(raw.strengths, raw.key_strengths),
      areasToImprove: toStringArray(raw.areasToImprove, raw.areas_to_improve, raw.improvements),
      errorPatterns: toStringArray(raw.errorPatterns, raw.error_patterns, raw.common_errors),
      timeAnalysis: (raw.timeAnalysis as string) || (raw.time_analysis as string) || 'Keep a consistent study schedule for best results.',
      nextWeekPlan: toStringArray(raw.nextWeekPlan, raw.next_week_plan, raw.nextWeekFocus),
      motivationalQuote: (raw.motivationalQuote as string) || (raw.motivational_quote as string) || (raw.quote as string) || 'Believe in yourself!',
    };
  };

  const generateReport = async () => {
    if (!user?.uid) return;

    try {
      setError(null);
      const weekStartDate = getWeekStartDate();
      const docId = `${user.uid}_${weekStartDate}`;
      const board = profile?.board || 'CBSE';
      const classLevel = profile?.class || 10;
      const subjects = profile?.subjects?.join(', ') || 'Science, Maths';

      const prompt = `Generate a weekly performance report for a ${board} Class ${classLevel} student.
Student Name: ${user.displayName || 'Student'}
Subjects: ${subjects}
Week Starting: ${weekStartDate}

Create a detailed performance analysis. Return ONLY valid JSON with this EXACT structure:
{
  "weeklyGrade": "A/A+/B+/B/C/D",
  "gradeColor": "#hex color for the grade",
  "personalMessage": "A warm, motivational personal message in simple Hinglish (2-3 sentences)",
  "subjectAnalysis": [
    {
      "subject": "Science",
      "accuracy": 72,
      "grade": "B+",
      "trend": "improving",
      "weakAreas": ["Acids Bases and Salts", "Chemical Reactions"],
      "strongAreas": ["Light Reflection", "Electricity"],
      "advice": "Personalized AI advice in Hinglish"
    },
    {
      "subject": "Maths",
      "accuracy": 65,
      "grade": "B",
      "trend": "stable",
      "weakAreas": ["Trigonometry", "Statistics"],
      "strongAreas": ["Quadratic Equations", "Real Numbers"],
      "advice": "Personalized AI advice in Hinglish"
    }
  ],
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areasToImprove": ["Area 1", "Area 2", "Area 3"],
  "errorPatterns": ["Pattern 1", "Pattern 2", "Pattern 3"],
  "timeAnalysis": "Analysis of study time patterns in 2-3 sentences",
  "nextWeekPlan": ["Focus area 1", "Focus area 2", "Focus area 3", "Focus area 4"],
  "motivationalQuote": "An inspiring quote"
}

IMPORTANT:
- subjectAnalysis MUST have at least 2 entries (one per subject)
- ALL arrays must have at least 3 items
- weakAreas and strongAreas must each have 2-3 specific NCERT chapter/topic names
- Even if data is limited, generate realistic and helpful analysis`;

      const response = await geminiStructuredModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = response.response.text();

      const parsed = safeParseJSON(text) as Record<string, unknown>;
      const safeReport = normalizeReport(parsed);

      setReport(safeReport);

      await setDocument('reports', docId, {
        ...safeReport,
        generatedAt: new Date().toISOString(),
        weekStartDate,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate report';
      console.error('Error generating report:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const loadReport = async () => {
    if (!user?.uid) return;

    try {
      const weekStartDate = getWeekStartDate();
      const docId = `${user.uid}_${weekStartDate}`;
      const cachedReport = await getDocument('reports', docId);

      if (cachedReport) {
        // Normalize cached data through the same pipeline
        const safeReport = normalizeReport(cachedReport as Record<string, unknown>);
        setReport(safeReport);
        setLoading(false);
      } else {
        setRegenerating(true);
        await generateReport();
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setError('Failed to load report. Try regenerating.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    await generateReport();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-500">Generating your weekly report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 mb-4 font-semibold">Failed to generate report</p>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 transition"
          >
            {regenerating ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Unable to generate report</p>
          <button
            onClick={handleRegenerate}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const trendIcons = {
    improving: '📈',
    stable: '➡️',
    declining: '📉',
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Meri Report 📊</h1>
            <p className="text-gray-500">Weekly AI-powered performance diagnosis</p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition transform hover:scale-105"
          >
            {regenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>

        {/* Grade Hero Card */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-shrink-0">
              <svg width="200" height="200" viewBox="0 0 200 200" className="animate-float">
                <defs>
                  <linearGradient id="gradeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={report.gradeColor} />
                    <stop offset="100%" stopColor={report.gradeColor} stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="90" fill="url(#gradeGradient)" opacity="0.2" />
                <circle cx="100" cy="100" r="80" fill="none" stroke={report.gradeColor} strokeWidth="2" opacity="0.4" />
                <text
                  x="100"
                  y="115"
                  textAnchor="middle"
                  fontSize="80"
                  fontWeight="bold"
                  fill={report.gradeColor}
                  fontFamily="system-ui"
                >
                  {report.weeklyGrade}
                </text>
              </svg>
            </div>

            <div className="flex-1">
              <p className="text-xl text-orange-500 font-semibold mb-4">Your This Week's Grade</p>
              <p className="text-2xl md:text-3xl text-gray-900 font-bold mb-6 leading-relaxed">
                {report.personalMessage}
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className="px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-sm">Performance Report</span>
                <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-full text-sm">
                  {new Date(getWeekStartDate()).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' '}-{' '}
                  {new Date(Date.now()).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {report.subjectAnalysis.map((subject, idx) => (
            <div key={idx} className="glass-card animate-fade-in-up" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{subject.subject}</h3>
                  <p className="text-gray-500 mt-1">Grade & Analysis</p>
                </div>
                <div className="text-center">
                  <div
                    className="text-3xl font-bold rounded-full w-16 h-16 flex items-center justify-center"
                    style={{ backgroundColor: `${subject.grade === 'A+' ? '#10b981' : subject.grade.startsWith('A') ? '#06b6d4' : subject.grade.startsWith('B') ? '#f59e0b' : '#ef4444'}20` }}
                  >
                    <span style={{ color: subject.grade === 'A+' ? '#10b981' : subject.grade.startsWith('A') ? '#06b6d4' : subject.grade.startsWith('B') ? '#f59e0b' : '#ef4444' }}>
                      {subject.grade}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{trendIcons[subject.trend]}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Accuracy</span>
                  <span className="text-sm font-bold text-orange-500">{subject.accuracy}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${subject.accuracy}%`,
                      backgroundColor: subject.accuracy > 70 ? '#10b981' : subject.accuracy > 40 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-600 font-semibold mb-3 uppercase">Strong Areas</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {subject.strongAreas.map((area, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">
                      ✓ {area}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-gray-600 font-semibold mb-3 uppercase">Weak Areas</p>
                <div className="flex flex-wrap gap-2">
                  {subject.weakAreas.map((area, i) => (
                    <span key={i} className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
                      ⚠ {area}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 italic">{subject.advice}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Strengths Card */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.4s', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
          <h3 className="text-2xl font-bold text-green-600 mb-6 flex items-center gap-2">
            <span className="text-3xl">✨</span> Your Strengths
          </h3>
          <div className="space-y-3">
            {report.strengths.map((strength, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                <span className="text-gray-700">{strength}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas to Improve Card */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.5s', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <h3 className="text-2xl font-bold text-red-600 mb-6 flex items-center gap-2">
            <span className="text-3xl">🎯</span> Areas to Improve
          </h3>
          <div className="space-y-3">
            {report.areasToImprove.map((area, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-red-600 text-lg flex-shrink-0">→</span>
                <span className="text-gray-700">{area}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Patterns Card */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <h3 className="text-2xl font-bold text-orange-500 mb-6 flex items-center gap-2">
            <span className="text-3xl">🔍</span> Error Patterns
          </h3>
          <p className="text-gray-700 leading-relaxed">{report.errorPatterns.join(' • ')}</p>
        </div>

        {/* Time Analysis Card */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
          <h3 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
            <span className="text-3xl">⏱️</span> Time Analysis
          </h3>
          <p className="text-gray-700 leading-relaxed">{report.timeAnalysis}</p>
        </div>

        {/* Next Week Plan */}
        <div className="glass-card animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-3xl">📅</span> Next Week Focus Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.nextWeekPlan.map((plan, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex gap-3">
                  <span className="text-orange-500 font-bold text-lg flex-shrink-0">{idx + 1}</span>
                  <span className="text-gray-700">{plan}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Quote */}
        <div
          className="glass-card animate-fade-in-up text-center py-12"
          style={{
            animationDelay: '0.9s',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <p className="text-3xl md:text-4xl font-bold text-orange-500 mb-4 leading-relaxed">
            {report.motivationalQuote}
          </p>
          <p className="text-orange-600 text-sm font-semibold">— Your AI Mentor</p>
        </div>

        {/* Footer spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}
