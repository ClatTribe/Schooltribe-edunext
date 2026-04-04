import { geminiStructuredModel } from '@/lib/gemini';
import { getDocument, setDocument } from '@/services/firestoreService';

// Types for all service functions
export interface FlashCard {
  front: string;
  back: string;
}

export interface FlashCardsResponse {
  flashcards: FlashCard[];
}

export interface NotesSection {
  heading: string;
  content: string;
}

export interface NotesResponse {
  title: string;
  sections: NotesSection[];
}

export interface InfographicKeyPoint {
  icon: string;
  title: string;
  detail: string;
}

export interface InfographicResponse {
  title: string;
  keyPoints: InfographicKeyPoint[];
  funFact: string;
  mnemonics: string[];
}

export interface Slide {
  slideNumber: number;
  heading: string;
  bullets: string[];
  note: string;
}

export interface SlideDeckResponse {
  title: string;
  slides: Slide[];
}

export interface YouTubeVideo {
  title: string;
  youtubeId: string;
  channelName: string;
  description: string;
}

export interface YouTubeVideosResponse {
  videos: YouTubeVideo[];
}

// In-memory cache (fast, lost on refresh)
const contentCache = new Map<string, unknown>();

const getCacheKey = (subject: string, chapter: string, type: string): string => {
  return `${subject.toLowerCase()}:${chapter.toLowerCase()}:${type}`;
};

// Firestore doc ID — sanitize colons/spaces for Firestore
const toFirestoreId = (key: string): string => key.replace(/[:/\s]+/g, '_');

const getFromCache = async (subject: string, chapter: string, type: string): Promise<unknown | null> => {
  const key = getCacheKey(subject, chapter, type);

  // 1. Check memory
  const memCached = contentCache.get(key);
  if (memCached) return memCached;

  // 2. Check Firestore
  try {
    const docId = toFirestoreId(key);
    const doc = await getDocument<{ data: unknown }>('contentCache', docId);
    if (doc?.data) {
      contentCache.set(key, doc.data); // warm memory cache
      return doc.data;
    }
  } catch {
    // Firestore read failed — proceed without cache
  }

  return null;
};

const setInCache = (subject: string, chapter: string, type: string, data: unknown): void => {
  const key = getCacheKey(subject, chapter, type);
  contentCache.set(key, data);

  // Persist to Firestore (fire and forget)
  const docId = toFirestoreId(key);
  setDocument('contentCache', docId, { data, subject, chapter, type }).catch((err) => {
    console.warn('[Vidyaa] Failed to persist content cache to Firestore:', err);
  });
};

/**
 * Safely parse JSON from Gemini response text.
 * Handles: raw JSON, markdown-wrapped JSON, and partial JSON extraction.
 */
function safeParseJSON<T>(text: string): T {
  // 1. Try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // continue to fallbacks
  }

  // 2. Try extracting from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]) as T;
    } catch {
      // continue
    }
  }

  // 3. Try finding a JSON object in the text
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]) as T;
    } catch {
      // continue
    }
  }

  // 4. Try finding a JSON array
  const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      return JSON.parse(jsonArrayMatch[0]) as T;
    } catch {
      // continue
    }
  }

  throw new Error('Failed to parse Gemini response as JSON. Raw text: ' + text.slice(0, 200));
}

/**
 * Generate flash cards for a chapter
 * Returns 8-10 flash cards with front and back content
 */
export async function generateFlashCards(subject: string, chapter: string, board: string = 'CBSE', classLevel: number = 10): Promise<FlashCard[]> {
  try {
    const cached = await getFromCache(subject, chapter, 'flashcards');
    if (cached) return cached as FlashCard[];

    const prompt = `You are an expert ${board} Class ${classLevel} educator. Create flashcards for the chapter "${chapter}" in ${subject}.

Generate 8-10 flashcards that cover the key concepts, definitions, formulas, and important points from the NCERT ${subject} textbook for ${board} Class ${classLevel}.

Each flashcard should have:
- "front": A question, definition, formula name, or concept to remember
- "back": The answer, definition, formula, or explanation

Return ONLY a valid JSON object with the following structure:
{
  "flashcards": [
    {"front": "string", "back": "string"},
    ...
  ]
}

Focus on NCERT-aligned content. Make flashcards suitable for quick revision and memorization.`;

    const result = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();
    const parsedResponse = safeParseJSON<FlashCardsResponse>(responseText);
    const flashcards = parsedResponse.flashcards;

    setInCache(subject, chapter, 'flashcards', flashcards);
    return flashcards;
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw new Error(`Failed to generate flashcards for ${subject} - ${chapter}`);
  }
}

/**
 * Generate structured notes for a chapter
 * Returns detailed NCERT-aligned notes with sections
 */
export async function generateNotes(subject: string, chapter: string, board: string = 'CBSE', classLevel: number = 10): Promise<NotesResponse> {
  try {
    const cached = await getFromCache(subject, chapter, 'notes');
    if (cached) return cached as NotesResponse;

    const prompt = `You are an expert ${board} Class ${classLevel} educator. Create comprehensive study notes for the chapter "${chapter}" in ${subject}.

Generate detailed NCERT-aligned notes that cover:
- Overview of the chapter
- Key concepts and definitions
- Important formulas (if applicable)
- Step-by-step explanations
- Important points to remember

Organize the notes into 4-6 logical sections with clear headings.

Return ONLY a valid JSON object with the following structure:
{
  "title": "Chapter title",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Detailed content for this section"
    },
    ...
  ]
}

Make sure the content is clear, concise, and suitable for ${board} Class ${classLevel} students. Use simple English and NCERT terminology.`;

    const result = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();
    const parsedResponse = safeParseJSON<NotesResponse>(responseText);

    setInCache(subject, chapter, 'notes', parsedResponse);
    return parsedResponse;
  } catch (error) {
    console.error('Error generating notes:', error);
    throw new Error(`Failed to generate notes for ${subject} - ${chapter}`);
  }
}

/**
 * Generate infographic content for a chapter
 * Returns visual-friendly content with key points, fun facts, and mnemonics
 */
export async function generateInfographic(subject: string, chapter: string, board: string = 'CBSE', classLevel: number = 10): Promise<InfographicResponse> {
  try {
    const cached = await getFromCache(subject, chapter, 'infographic');
    if (cached) return cached as InfographicResponse;

    const prompt = `You are an expert ${board} Class ${classLevel} educator and infographic designer. Create visual-friendly content for the chapter "${chapter}" in ${subject}.

Generate infographic-suitable content that includes:
- A catchy title for the infographic
- 5-7 key points with icons, titles, and details
- A fun fact related to the chapter
- 2-3 memorable mnemonics or memory tricks

Each key point should be concise (suitable for an infographic card) with:
- An emoji or icon representation (as text/emoji)
- A short title
- A brief detail line

Return ONLY a valid JSON object with the following structure:
{
  "title": "Infographic title",
  "keyPoints": [
    {
      "icon": "emoji or icon",
      "title": "Key point title",
      "detail": "Brief detail (max 2 lines)"
    },
    ...
  ],
  "funFact": "An interesting fun fact related to the chapter",
  "mnemonics": ["Mnemonic 1", "Mnemonic 2", "Mnemonic 3"]
}

Make content visually engaging and easy to remember for ${board} Class ${classLevel} students.`;

    const result = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();
    const parsedResponse = safeParseJSON<InfographicResponse>(responseText);

    setInCache(subject, chapter, 'infographic', parsedResponse);
    return parsedResponse;
  } catch (error) {
    console.error('Error generating infographic:', error);
    throw new Error(`Failed to generate infographic for ${subject} - ${chapter}`);
  }
}

/**
 * Generate a slide deck for a chapter
 * Returns 8-12 slides with structured content
 */
export async function generateSlideDeck(subject: string, chapter: string, board: string = 'CBSE', classLevel: number = 10): Promise<SlideDeckResponse> {
  try {
    const cached = await getFromCache(subject, chapter, 'slidedeck');
    if (cached) return cached as SlideDeckResponse;

    const prompt = `You are an expert ${board} Class ${classLevel} educator. Create a slide deck presentation for the chapter "${chapter}" in ${subject}.

Generate 8-12 presentation slides that cover the chapter comprehensively. Each slide should have:
- A clear, engaging heading
- 3-5 bullet points (concise and informative)
- A speaker note (1-2 sentences of explanation)

Slides should follow a logical progression:
1. Introduction/Overview
2-N. Key concepts and topics
Last. Summary/Key takeaways

Return ONLY a valid JSON object with the following structure:
{
  "title": "Presentation title",
  "slides": [
    {
      "slideNumber": 1,
      "heading": "Slide heading",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "note": "Speaker note explanation"
    },
    ...
  ]
}

Make content suitable for classroom presentation and ${board} Class ${classLevel} understanding level.`;

    const result = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();
    const parsedResponse = safeParseJSON<SlideDeckResponse>(responseText);

    setInCache(subject, chapter, 'slidedeck', parsedResponse);
    return parsedResponse;
  } catch (error) {
    console.error('Error generating slide deck:', error);
    throw new Error(`Failed to generate slide deck for ${subject} - ${chapter}`);
  }
}

/**
 * Fetch YouTube videos for a chapter
 * Uses Gemini to identify the best videos from popular Indian education channels
 */
export async function fetchYouTubeVideos(subject: string, chapter: string, board: string = 'CBSE', classLevel: number = 10): Promise<YouTubeVideo[]> {
  try {
    const cached = await getFromCache(subject, chapter, 'youtube');
    if (cached) return cached as YouTubeVideo[];

    const prompt = `You are an expert ${board} Class ${classLevel} educator. Identify the best YouTube videos for the chapter "${chapter}" in ${subject}.

Find 3-5 REAL, verified YouTube videos from popular Indian education channels like:
- Physics Wallah
- Vedantu
- Magnet Brains
- Science and Fun
- LearnoHub
- BYJU'S
- Aakash
- Khan Academy India

For each video, provide:
- "title": The exact video title
- "youtubeId": The YouTube video ID (the alphanumeric code from the URL, e.g., "dQw4w9WgXcQ")
- "channelName": The channel that uploaded it
- "description": A brief description of what the video covers (1-2 sentences)

Return ONLY a valid JSON object with the following structure:
{
  "videos": [
    {
      "title": "Video title",
      "youtubeId": "YouTube video ID",
      "channelName": "Channel name",
      "description": "What the video covers"
    },
    ...
  ]
}

Make sure the videos are:
- NCERT-aligned and ${board} Class ${classLevel} curriculum-relevant
- High-quality educational content
- From verified, popular education channels
- Available and current

IMPORTANT: Only include videos you are confident exist. Do not make up video IDs.`;

    const result = await geminiStructuredModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const responseText = result.response.text();
    const parsedResponse = safeParseJSON<YouTubeVideosResponse>(responseText);
    const videos = parsedResponse.videos;

    setInCache(subject, chapter, 'youtube', videos);
    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    throw new Error(`Failed to fetch YouTube videos for ${subject} - ${chapter}`);
  }
}

/**
 * Clear the content cache
 * Useful for forcing refresh of all cached content
 */
export function clearCache(): void {
  contentCache.clear();
}

/**
 * Clear cache for a specific subject and chapter
 */
export function clearCacheForChapter(subject: string, chapter: string): void {
  contentCache.delete(getCacheKey(subject, chapter, 'flashcards'));
  contentCache.delete(getCacheKey(subject, chapter, 'notes'));
  contentCache.delete(getCacheKey(subject, chapter, 'infographic'));
  contentCache.delete(getCacheKey(subject, chapter, 'slidedeck'));
  contentCache.delete(getCacheKey(subject, chapter, 'youtube'));
}

export default {
  generateFlashCards,
  generateNotes,
  generateInfographic,
  generateSlideDeck,
  fetchYouTubeVideos,
  clearCache,
  clearCacheForChapter,
};
