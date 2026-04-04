import { geminiStructuredModel } from '@/lib/gemini';
import { getDocument, setDocument } from '@/services/firestoreService';
import { getChapters } from '@/constants';
import type { BoardType, ClassLevel, SubjectType } from '@/constants';

// Types
export type Subject = SubjectType;

export interface CachedQuestion {
  id: string;
  question: string;
  options: { a: string; b: string; c: string; d: string };
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  chapter: string;
  subject: string;
  topic: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

interface QuestionsCacheDocument {
  subject: Subject;
  chapter: string;
  chapterNumber: number;
  questions: CachedQuestion[];
  generatedAt: number;
  type: 'chapter';
}

interface DailyQuestionsCacheDocument {
  date: string;
  questions: CachedQuestion[];
  generatedAt: number;
  subject: 'mixed';
}

interface YouTubeVideosCacheDocument {
  subject: Subject;
  chapter: string;
  chapterNumber: number;
  videos: YouTubeVideo[];
  fetchedAt: number;
}

// Utility functions
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const isStale = (timestamp: number, maxAgeDays: number): boolean => {
  const now = Date.now();
  const ageMs = now - timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
};

const generateQuestionId = (subject: string, chapterNumber: number, index: number): string => {
  return `${subject}_${chapterNumber}_${index}_${Date.now()}`;
};

const getChaptersList = (subject: Subject, board: BoardType = 'CBSE', classLevel: ClassLevel = 10) => {
  return getChapters(board, classLevel, subject);
};

/**
 * Safely parse Gemini JSON response with multiple fallback strategies
 */
function safeParseGeminiJSON(responseText: string): any {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(responseText);
  } catch {
    // continue to fallbacks
  }

  // Strategy 2: Strip markdown code fences and parse
  const fenceMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch {
      // continue
    }
  }

  // Strategy 3: Find the outermost JSON object using brace matching
  const startIdx = responseText.indexOf('{');
  if (startIdx !== -1) {
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < responseText.length; i++) {
      if (responseText[i] === '{') depth++;
      else if (responseText[i] === '}') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      try {
        return JSON.parse(responseText.slice(startIdx, endIdx + 1));
      } catch {
        // continue
      }
    }
  }

  // Strategy 4: Try to find a JSON array directly
  const arrayStart = responseText.indexOf('[');
  if (arrayStart !== -1) {
    let depth = 0;
    let endIdx = -1;
    for (let i = arrayStart; i < responseText.length; i++) {
      if (responseText[i] === '[') depth++;
      else if (responseText[i] === ']') {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      try {
        const arr = JSON.parse(responseText.slice(arrayStart, endIdx + 1));
        return { questions: arr };
      } catch {
        // continue
      }
    }
  }

  console.error('Gemini response could not be parsed. First 300 chars:', responseText.slice(0, 300));
  throw new Error('Failed to parse Gemini response as JSON. Check browser console for details.');
}

// Core Functions

/**
 * Get cached questions for a specific chapter, or generate and cache them if not found/stale
 */
export async function getChapterQuestions(
  subject: Subject,
  chapterNumber: number,
  chapterName: string,
  board: BoardType = 'CBSE',
  classLevel: ClassLevel = 10
): Promise<CachedQuestion[]> {
  try {
    // Include board/class in cache key to avoid cross-board collisions
    const docId = `${board}_${classLevel}_${subject}_${chapterNumber}`;

    // Check Firestore cache
    const cachedDoc = await getDocument<QuestionsCacheDocument>('questions', docId);

    if (cachedDoc && !isStale(cachedDoc.generatedAt, 30)) {
      return cachedDoc.questions;
    }

    // Generate new questions via Gemini
    const generatedQuestions = await generateChapterQuestions(
      subject,
      chapterNumber,
      chapterName,
      board,
      classLevel
    );

    // Save to Firestore
    const cacheDocument: QuestionsCacheDocument = {
      subject,
      chapter: chapterName,
      chapterNumber,
      questions: generatedQuestions,
      generatedAt: Date.now(),
      type: 'chapter',
    };

    await setDocument('questions', docId, cacheDocument);

    return generatedQuestions;
  } catch (error) {
    console.error(
      `Error getting chapter questions for ${subject} chapter ${chapterNumber}:`,
      error
    );
    throw error;
  }
}

/**
 * Generate MCQs for a chapter via Gemini
 */
async function generateChapterQuestions(
  subject: Subject,
  chapterNumber: number,
  chapterName: string,
  board: string = 'CBSE',
  classLevel: number = 10
): Promise<CachedQuestion[]> {
  const prompt = `Generate exactly 30 multiple choice questions for ${board} Class ${classLevel} ${subject.toUpperCase()} syllabus.
Chapter: ${chapterNumber} - ${chapterName}

IMPORTANT: Generate exactly:
- 10 EASY questions (basic recall, definitions, simple concepts)
- 10 MEDIUM questions (application-based, moderate reasoning)
- 10 HARD questions (higher-order thinking, multi-step, tricky options)

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "question text here",
      "options": {
        "a": "option A text",
        "b": "option B text",
        "c": "option C text",
        "d": "option D text"
      },
      "correctAnswer": "a|b|c|d",
      "explanation": "explanation text",
      "difficulty": "easy|medium|hard",
      "topic": "specific topic name"
    }
  ]
}

Requirements:
- Ensure questions are ${board}-aligned and appropriate for Class ${classLevel}
- EXACTLY 10 easy + 10 medium + 10 hard = 30 questions total
- Provide clear explanations for correct answers
- Include topic tags for organization
- Options should be plausible but distinct`;

  try {
    const response = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const responseText = response.response.text();

    // Parse JSON response with multiple fallback strategies
    const parsedData = safeParseGeminiJSON(responseText);

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error('Invalid response structure: missing questions array');
    }

    // Transform to CachedQuestion format
    const cachedQuestions: CachedQuestion[] = parsedData.questions.map(
      (q: any, index: number) => ({
        id: generateQuestionId(subject, chapterNumber, index),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium',
        chapter: chapterName,
        subject,
        topic: q.topic || 'General',
      })
    );

    return cachedQuestions;
  } catch (error) {
    console.error('Error generating chapter questions via Gemini:', error);
    throw error;
  }
}

/**
 * Get daily mixed questions for Sudden Death mode
 */
export async function getDailyQuestions(
  date?: string,
  board: BoardType = 'CBSE',
  classLevel: ClassLevel = 10
): Promise<CachedQuestion[]> {
  try {
    const targetDate = date || getTodayDate();
    // Include board/class in cache key
    const docId = `${board}_${classLevel}_${targetDate}`;

    // Check Firestore cache
    const cachedDoc = await getDocument<DailyQuestionsCacheDocument>('dailyQuestions', docId);

    if (cachedDoc) {
      return cachedDoc.questions;
    }

    // Generate new daily questions
    const generatedQuestions = await generateDailyQuestions(board, classLevel);

    // Save to Firestore
    const cacheDocument: DailyQuestionsCacheDocument = {
      date: targetDate,
      questions: generatedQuestions,
      generatedAt: Date.now(),
      subject: 'mixed',
    };

    await setDocument('dailyQuestions', docId, cacheDocument);

    return generatedQuestions;
  } catch (error) {
    console.error('Error getting daily questions:', error);
    throw error;
  }
}

/**
 * Generate mixed daily questions (5 Science + 5 Maths + 5 alternating)
 */
async function generateDailyQuestions(board: BoardType = 'CBSE', classLevel: ClassLevel = 10): Promise<CachedQuestion[]> {
  try {
    // Get available chapters; for ICSE, science might be split into physics/chemistry/biology
    let scienceChapters = getChaptersList('science', board, classLevel);
    if (scienceChapters.length === 0) {
      // ICSE fallback: combine physics, chemistry, biology
      scienceChapters = [
        ...getChaptersList('physics', board, classLevel),
        ...getChaptersList('chemistry', board, classLevel),
        ...getChaptersList('biology', board, classLevel),
      ];
    }
    const mathsChapters = getChaptersList('maths', board, classLevel);

    if (scienceChapters.length === 0 || mathsChapters.length === 0) {
      throw new Error(`No chapters found for ${board} Class ${classLevel}. Cannot generate daily questions.`);
    }

    // Pick random chapters
    const randomScienceChapter =
      scienceChapters[Math.floor(Math.random() * scienceChapters.length)];
    const randomMathsChapter =
      mathsChapters[Math.floor(Math.random() * mathsChapters.length)];

    const prompt = `Generate 15 multiple choice questions for ${board} Class ${classLevel} mixed subjects for a daily challenge.
- 5 questions from SCIENCE Chapter ${randomScienceChapter.number} (${randomScienceChapter.name})
- 5 questions from MATHS Chapter ${randomMathsChapter.number} (${randomMathsChapter.name})
- 5 questions mixing both subjects

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "question text here",
      "options": {
        "a": "option A text",
        "b": "option B text",
        "c": "option C text",
        "d": "option D text"
      },
      "correctAnswer": "a|b|c|d",
      "explanation": "explanation text",
      "difficulty": "easy|medium|hard",
      "subject": "science|maths",
      "topic": "specific topic name"
    }
  ]
}

Requirements:
- Ensure questions are NCERT-aligned for ${board} Class ${classLevel}
- Include subject field for each question
- Vary difficulty levels
- Questions should be diverse and interesting for a daily challenge`;

    const response = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const responseText = response.response.text();

    // Parse JSON response with multiple fallback strategies
    const parsedData = safeParseGeminiJSON(responseText);

    if (!parsedData.questions || !Array.isArray(parsedData.questions)) {
      throw new Error('Invalid response structure: missing questions array');
    }

    // Transform to CachedQuestion format
    const cachedQuestions: CachedQuestion[] = parsedData.questions.map(
      (q: any, index: number) => ({
        id: `daily_${getTodayDate()}_${index}_${Date.now()}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium',
        chapter: q.subject === 'science' ? randomScienceChapter.name : randomMathsChapter.name,
        subject: q.subject as Subject,
        topic: q.topic || 'General',
      })
    );

    return cachedQuestions;
  } catch (error) {
    console.error('Error generating daily questions via Gemini:', error);
    throw error;
  }
}

/**
 * Get shuffled daily questions for Sudden Death mode
 */
export async function getSuddenDeathQuestions(
  board: BoardType = 'CBSE',
  classLevel: ClassLevel = 10
): Promise<CachedQuestion[]> {
  try {
    const questions = await getDailyQuestions(undefined, board, classLevel);

    // Shuffle array
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  } catch (error) {
    console.error('Error getting Sudden Death questions:', error);
    throw error;
  }
}

/**
 * Get cached YouTube videos for a chapter, or fetch via API if not found
 */
export async function getYouTubeVideosForChapter(
  subject: Subject,
  chapterNumber: number,
  chapterName: string,
  board: BoardType = 'CBSE',
  classLevel: ClassLevel = 10
): Promise<YouTubeVideo[]> {
  try {
    const docId = `${board}_${classLevel}_${subject}_${chapterNumber}`;

    // Check Firestore cache
    const cachedDoc = await getDocument<YouTubeVideosCacheDocument>('youtubeVideos', docId);

    if (cachedDoc) {
      return cachedDoc.videos;
    }

    // Generate search queries and fetch videos
    const videos = await fetchAndCacheYouTubeVideos(subject, chapterNumber, chapterName);

    // Save to Firestore
    const cacheDocument: YouTubeVideosCacheDocument = {
      subject,
      chapter: chapterName,
      chapterNumber,
      videos,
      fetchedAt: Date.now(),
    };

    await setDocument('youtubeVideos', docId, cacheDocument);

    return videos;
  } catch (error) {
    console.error(
      `Error getting YouTube videos for ${subject} chapter ${chapterNumber}:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch YouTube videos using Gemini-suggested queries and YouTube API
 */
async function fetchAndCacheYouTubeVideos(
  subject: Subject,
  chapterNumber: number,
  chapterName: string,
  board: string = 'CBSE',
  classLevel: number = 10
): Promise<YouTubeVideo[]> {
  try {
    // Use Gemini to generate search queries
    const queryPrompt = `Suggest 3 YouTube search queries for ${board} Class ${classLevel} ${subject} Chapter ${chapterNumber}: "${chapterName}".
These should be specific, educational, and likely to return good tutorial/lecture videos.
Return as JSON: { "queries": ["query1", "query2", "query3"] }`;

    const queryResponse = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: queryPrompt }] }],
    });
    const queryText = queryResponse.response.text();

    let searchQueries: string[] = [];
    try {
      const queryData = JSON.parse(queryText);
      searchQueries = queryData.queries || [chapterName];
    } catch {
      const jsonMatch = queryText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        const queryData = JSON.parse(jsonMatch[1]);
        searchQueries = queryData.queries || [chapterName];
      } else {
        searchQueries = [chapterName];
      }
    }

    // Fetch videos from YouTube API
    const allVideos: YouTubeVideo[] = [];
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyASihqx48z4Gl5fhUT9iS5zm0vx8XJpfM0';

    for (const query of searchQueries) {
      try {
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.append('part', 'snippet');
        searchUrl.searchParams.append('q', query);
        searchUrl.searchParams.append('type', 'video');
        searchUrl.searchParams.append('maxResults', '5');
        searchUrl.searchParams.append('key', apiKey);

        const response = await fetch(searchUrl.toString());
        if (!response.ok) {
          console.warn(`YouTube API request failed for query "${query}":`, response.statusText);
          continue;
        }

        const data = await response.json();

        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            if (item.id?.videoId) {
              allVideos.push({
                videoId: item.id.videoId,
                title: item.snippet?.title || 'Unknown',
                channelTitle: item.snippet?.channelTitle || 'Unknown Channel',
                thumbnailUrl:
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.default?.url ||
                  '',
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error fetching videos for query "${query}":`, error);
      }
    }

    // Remove duplicates and limit to 5
    const uniqueVideos = Array.from(
      new Map(allVideos.map((v) => [v.videoId, v])).values()
    ).slice(0, 5);

    return uniqueVideos.length > 0
      ? uniqueVideos
      : [
          {
            videoId: '',
            title: 'No videos found',
            channelTitle: '',
            thumbnailUrl: '',
          },
        ];
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    throw error;
  }
}

/**
 * Force-generate and cache daily questions for today (for scheduled calls)
 */
export async function generateAndCacheDailyQuestions(): Promise<void> {
  try {
    const today = getTodayDate();
    const docId = today;

    // Generate questions regardless of cache
    const generatedQuestions = await generateDailyQuestions();

    // Save to Firestore
    const cacheDocument: DailyQuestionsCacheDocument = {
      date: today,
      questions: generatedQuestions,
      generatedAt: Date.now(),
      subject: 'mixed',
    };

    await setDocument('dailyQuestions', docId, cacheDocument);

    console.log(`Daily questions generated and cached for ${today}`);
  } catch (error) {
    console.error('Error generating and caching daily questions:', error);
    throw error;
  }
}
