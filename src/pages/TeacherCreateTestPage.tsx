import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, setDoc, Timestamp } from 'firebase/firestore';
import { geminiStructuredModel } from '@/lib/gemini';
import { getChapters } from '@/constants';

interface Student {
  uid: string;
  name: string;
  email: string;
  class: string;
  avatar?: string;
}

interface Question {
  question: string;
  options: { a: string; b: string; c: string; d: string };
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  chapter: string;
  topic: string;
}

type Subject = 'science' | 'maths';
type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export default function TeacherCreateTestPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Step control
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Test Config
  const [testName, setTestName] = useState('');
  const [subject, setSubject] = useState<Subject>('science');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);

  // Step 2: Assign Students
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 3: Create & Submit
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [testCode, setTestCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const chapters = getChapters(profile?.board || 'CBSE', profile?.class || 10, subject);

  // Fetch students on mount
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'student')
        );
        const snapshot = await getDocs(q);
        const studentsList: Student[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          name: doc.data().displayName || doc.data().name || 'Unknown',
          email: doc.data().email || '',
          class: doc.data().class || 'N/A',
          avatar: doc.data().avatar,
        }));
        setStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStudents();
    }
  }, [user]);

  // Validate step 1
  const isStep1Valid = testName.trim() && selectedChapters.length > 0;

  // Validate step 2
  const isStep2Valid = selectedStudents.size > 0;

  // Filter students by search query
  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle chapter toggle
  const toggleChapter = (chapterName: string) => {
    setSelectedChapters((prev) =>
      prev.includes(chapterName)
        ? prev.filter((c) => c !== chapterName)
        : [...prev, chapterName]
    );
  };

  // Handle student selection
  const toggleStudent = (uid: string) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents(new Set());
    } else {
      const allUids = new Set(filteredStudents.map((s) => s.uid));
      setSelectedStudents(allUids);
    }
  };

  // Generate questions using Gemini
  const generateQuestions = async (): Promise<Question[]> => {
    const board = profile?.board || 'CBSE';
    const classLevel = profile?.class || 10;
    const prompt = `Generate ${questionCount} ${board} Class ${classLevel} ${subject.toUpperCase()} multiple-choice questions for chapters: ${selectedChapters.join(', ')}.

Difficulty level: ${difficulty === 'mixed' ? 'Mix of easy, medium, and hard' : difficulty}.

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "questions": [
    {
      "question": "Question text",
      "options": {"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D"},
      "correctAnswer": "a",
      "explanation": "Detailed explanation",
      "difficulty": "easy|medium|hard",
      "chapter": "Chapter name",
      "topic": "Topic name"
    }
  ]
}`;

    try {
      const response = await geminiStructuredModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const jsonText = response.response.text();
      // Use multi-strategy JSON parsing to handle Gemini's inconsistent responses
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        // Try stripping markdown code blocks
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsed = JSON.parse(codeBlockMatch[1]);
        } else {
          const jsonObjMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonObjMatch) {
            parsed = JSON.parse(jsonObjMatch[0]);
          } else {
            throw new Error('Could not parse Gemini response as JSON');
          }
        }
      }
      return (parsed.questions as Question[]) || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      throw new Error('Failed to generate questions. Please try again.');
    }
  };

  // Handle test creation
  const handleCreateTest = async () => {
    if (!user) return;

    try {
      setIsGenerating(true);

      // Generate questions
      const questions = await generateQuestions();

      if (!questions || questions.length === 0) {
        throw new Error('No questions generated');
      }

      // Create test document
      const testId = `test_${Date.now()}`;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const testData = {
        id: testId,
        teacherId: user.uid,
        testName,
        subject,
        chapters: selectedChapters,
        difficulty,
        questionCount,
        timeLimit,
        questions,
        assignedStudents: Array.from(selectedStudents),
        createdAt: Timestamp.now(),
        status: 'active',
        testCode: code,
      };

      await setDoc(doc(db, 'teacherTests', testId), testData);

      setTestCode(code);
      setShowSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/teacher');
      }, 3000);
    } catch (error) {
      console.error('Error creating test:', error);
      setError('Failed to create test: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white flex items-center justify-center p-4">
        <div className="glass-card glass-card-hover max-w-md w-full animate-fade-in-up text-center p-8 bg-white border border-gray-200">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 border border-emerald-300">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Created Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your test has been generated and assigned to {selectedStudents.size} student(s).
          </p>

          <div className="bg-gray-100 rounded-lg p-4 mb-6 border border-gray-300">
            <p className="text-xs text-gray-500 mb-1">Test Code</p>
            <p className="text-2xl font-mono font-bold text-orange-600">{testCode}</p>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Share this code with students to access the test.
          </p>

          <Link
            to="/teacher"
            className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Tests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <Link
            to="/teacher"
            className="text-orange-600 hover:text-orange-700 text-sm font-medium mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">Create New Test</h1>
          <p className="text-gray-600 mt-2">Generate and assign a test to your students</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 glass-card p-6 animate-fade-in-up bg-white border border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step <= currentStep
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      step < currentStep ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-600">
            <span>Test Config</span>
            <span>Assign Students</span>
            <span>Review & Create</span>
          </div>
        </div>

        {/* Step 1: Test Config */}
        {currentStep === 1 && (
          <div className="glass-card p-8 animate-fade-in-up stagger-children bg-white border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 1: Test Configuration</h2>

            {/* Test Name */}
            <div className="mb-6 stagger-item">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Test Name
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g., Weekly Science Quiz - Chapter 1-3"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-all"
              />
            </div>

            {/* Subject Selector */}
            <div className="mb-6 stagger-item">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Subject</label>
              <div className="flex gap-4">
                {(['science', 'maths'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setSubject(s);
                      setSelectedChapters([]);
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      subject === s
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Chapter Multi-Select */}
            <div className="mb-6 stagger-item">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Chapters</label>
              <div className="flex flex-wrap gap-2">
                {chapters.map((ch) => (
                  <button
                    key={ch.name}
                    onClick={() => toggleChapter(ch.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedChapters.includes(ch.name)
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-orange-400'
                    }`}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
              {selectedChapters.length > 0 && (
                <p className="mt-2 text-xs text-orange-600">
                  {selectedChapters.length} chapter(s) selected
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div className="mb-6 stagger-item">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Difficulty</label>
              <div className="grid grid-cols-4 gap-2">
                {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty"
                      value={d}
                      checked={difficulty === d}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{d}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div className="mb-6 stagger-item">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Number of Questions: <span className="text-orange-600">{questionCount}</span>
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Time Limit */}
            <div className="mb-8 stagger-item">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Time Limit</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    onClick={() => setTimeLimit(time)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      timeLimit === time
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:border-orange-400'
                    }`}
                  >
                    {time}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Assign Students */}
        {currentStep === 2 && (
          <div className="glass-card p-8 animate-fade-in-up stagger-children bg-white border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Assign Students</h2>

            {/* Select All Checkbox */}
            <div className="mb-6 stagger-item p-4 bg-gray-50 rounded-lg border border-gray-300">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="font-semibold text-gray-700">Select All</span>
                <span className="text-orange-600 ml-auto font-bold">
                  {selectedStudents.size} / {students.length}
                </span>
              </label>
            </div>

            {/* Search Input */}
            <div className="mb-6 stagger-item">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-all"
              />
            </div>

            {/* Students List */}
            <div className="space-y-2 stagger-item max-h-96 overflow-y-auto">
              {loading ? (
                <p className="text-gray-600 py-8 text-center">Loading students...</p>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <label
                    key={student.uid}
                    className="flex items-center gap-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-300 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.uid)}
                      onChange={() => toggleStudent(student.uid)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">
                        {getInitials(student.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-600">{student.email}</p>
                    </div>
                    <span className="text-xs text-gray-600 px-2 py-1 bg-white rounded border border-gray-300">
                      {student.class}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-gray-600 py-8 text-center">No students found</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {currentStep === 3 && (
          <div className="glass-card p-8 animate-fade-in-up stagger-children bg-white border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 3: Review & Create</h2>

            {/* Summary Card */}
            <div className="space-y-4 stagger-item mb-8 p-6 bg-gray-50 rounded-lg border border-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Test Name</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{testName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Subject</p>
                  <p className="text-lg font-semibold text-orange-600 mt-1">
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Chapters</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedChapters.map((ch) => (
                      <span key={ch} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Difficulty</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">{difficulty}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Questions</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{questionCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Time Limit</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{timeLimit} minutes</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Assigned Students</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{selectedStudents.size}</p>
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateTest}
              disabled={isGenerating}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                isGenerating
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating & Creating Test...
                </span>
              ) : (
                'Generate & Assign Test'
              )}
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-700 text-sm font-medium ml-4">Dismiss</button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between gap-4 animate-fade-in-up">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              currentStep === 1
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
            }`}
          >
            Previous
          </button>

          <button
            onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
            disabled={
              (currentStep === 1 && !isStep1Valid) ||
              (currentStep === 2 && !isStep2Valid) ||
              currentStep === 3
            }
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              currentStep === 3 ||
              (currentStep === 1 && !isStep1Valid) ||
              (currentStep === 2 && !isStep2Valid)
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
