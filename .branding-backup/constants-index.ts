import { getChapters, BOARD_SUBJECTS, SUBJECT_LABELS } from './chapters';
import type { ChapterInfo, BoardType, ClassLevel, SubjectType } from './chapters';

export const APP_NAME = 'Vidyaa';
export const APP_DESCRIPTION = 'Board Exam Prep — CBSE & ICSE, Class 8 to 10';

// Re-export chapter system for convenience
export { getChapters, BOARD_SUBJECTS, SUBJECT_LABELS };
export type { ChapterInfo, BoardType, ClassLevel, SubjectType };

// Board options for onboarding
export const BOARDS: { value: BoardType; label: string; icon: string; desc: string }[] = [
  { value: 'CBSE', label: 'CBSE', icon: '📘', desc: 'Central Board of Secondary Education' },
  { value: 'ICSE', label: 'ICSE', icon: '📗', desc: 'Indian Certificate of Secondary Education' },
];

// Class options
export const CLASS_OPTIONS: { value: ClassLevel; label: string }[] = [
  { value: 8, label: 'Class 8' },
  { value: 9, label: 'Class 9' },
  { value: 10, label: 'Class 10' },
];

// ===== Backward-compatible exports (used by many existing pages) =====
// These default to CBSE Class 10 for backward compatibility

export const SCIENCE_CHAPTERS = getChapters('CBSE', 10, 'science');
export const MATHS_CHAPTERS = getChapters('CBSE', 10, 'maths');

export const CHAPTERS: Record<string, ChapterInfo[]> = {
  science: SCIENCE_CHAPTERS,
  maths: MATHS_CHAPTERS,
};

// CBSE Exam structure: 5 sections (Class 10 specific)
export const CBSE_SECTIONS = {
  A: { name: 'Section A', questionType: 'MCQ', count: 20, marksEach: 1, total: 20 },
  B: { name: 'Section B', questionType: 'VSA', count: 5, marksEach: 2, total: 10 },
  C: { name: 'Section C', questionType: 'SA', count: 6, marksEach: 3, total: 18 },
  D: { name: 'Section D', questionType: 'LA', count: 4, marksEach: 5, total: 20 },
  E: { name: 'Section E', questionType: 'Case-Based', count: 3, marksEach: 4, total: 12 },
} as const;

export const TOTAL_MARKS = 80;

// XP values
export const XP_PER_VIDEO = 10;
export const XP_PER_CORRECT = 5;
export const XP_PER_TEST = 50;
export const XP_PER_LOGIN = 5;

// Rate limits
export const AI_MESSAGES_PER_DAY = 50;

/**
 * Helper: Get chapters for a user profile's board/class/subject
 */
export function getChaptersForProfile(
  board: BoardType | string,
  classLevel: ClassLevel | number,
  subject: SubjectType | string,
): ChapterInfo[] {
  return getChapters(
    board as BoardType,
    classLevel as ClassLevel,
    subject as SubjectType,
  );
}

/**
 * Helper: Get subjects for a user profile's board
 */
export function getSubjectsForBoard(board: BoardType | string): SubjectType[] {
  return BOARD_SUBJECTS[board as BoardType] || BOARD_SUBJECTS.CBSE;
}
