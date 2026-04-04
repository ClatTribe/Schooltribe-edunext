// ===== User & Auth Types =====
export type UserRole = 'student' | 'parent' | 'teacher' | 'admin';
export type Board = 'CBSE' | 'ICSE';
export type ClassLevel = 8 | 9 | 10;
export type Subject = 'science' | 'maths' | 'physics' | 'chemistry' | 'biology' | 'ai';

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName: string;
  phone: string;
  email?: string;
  board: Board;
  class: ClassLevel;
  subjects: Subject[];
  onboardingComplete: boolean;
  linkedParentUids?: string[];       // student: parents linked to this student
  linkedStudentUids?: string[];      // parent: children linked to this parent
  linkedTeacherUid?: string;         // student: assigned teacher UID
  assignedStudentUids?: string[];    // teacher: students assigned to this teacher
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkCode {
  code: string;
  studentUid: string;
  expiresAt: Date;
}

// ===== Question Bank Types =====
export type QuestionType = 'mcq' | 'vsa' | 'sa' | 'la' | 'case-based' | 'assertion-reason';

export type CBSESection = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Question {
  id: string;
  board: Board;
  class: ClassLevel;
  subject: Subject;
  chapter: string;
  chapterNumber: number;
  type: QuestionType;
  section: CBSESection;
  marks: number;
  question: string;
  options?: string[]; // For MCQs
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdAt: Date;
}

export interface TestAttempt {
  id: string;
  userId: string;
  subject: Subject;
  chapters: string[];
  totalMarks: number;
  scoredMarks: number;
  totalQuestions: number;
  answers: AnswerRecord[];
  timeSpent: number; // seconds
  startedAt: Date;
  completedAt: Date;
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeTaken: number; // seconds
  markedForReview: boolean;
}

// ===== Video Types =====
export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  subject: Subject;
  chapter: string;
  chapterNumber: number;
  duration: number; // seconds
  thumbnail?: string;
  order: number;
}

export interface WatchProgress {
  userId: string;
  videoId: string;
  lastPosition: number; // seconds
  totalWatched: number; // seconds
  completed: boolean; // ≥90% watched
  updatedAt: Date;
}

// ===== Gamification Types =====
export interface GamificationProfile {
  userId: string;
  xp: number;
  level: number; // floor(xp/100) + 1
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  shieldActive: boolean; // protects one miss per 7-day streak
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

export type XPAction =
  | 'video_watched'      // 10 XP
  | 'correct_answer'     // 5 XP
  | 'test_completed'     // 50 XP
  | 'daily_login';       // 5 XP

export const XP_VALUES: Record<XPAction, number> = {
  video_watched: 10,
  correct_answer: 5,
  test_completed: 50,
  daily_login: 5,
};

// ===== Chat / AI Doubt Solver Types =====
export interface Conversation {
  id: string;
  userId: string;
  subject: Subject;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  createdAt: Date;
}

// ===== Parent Dashboard Types =====
export interface WeeklyReport {
  id: string;
  studentUid: string;
  parentUid: string;
  weekStarting: string; // YYYY-MM-DD
  totalStudyTime: number; // minutes
  testsCompleted: number;
  averageScore: number;
  subjectBreakdown: Partial<Record<Subject, SubjectStats>>;
  streak: number;
  createdAt: Date;
}

export interface SubjectStats {
  studyTime: number;
  testsCompleted: number;
  averageScore: number;
  chaptersActive: string[];
}

// ===== Common Types =====
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
