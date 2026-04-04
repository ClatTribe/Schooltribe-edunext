import { GoogleGenerativeAI } from '@google/generative-ai';

// TODO: Replace with your Gemini API key
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyASihqx48z4Gl5fhUT9iS5zm0vx8XJpfM0';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Chat/tutor model — uses gemini-2.5-flash for deeper reasoning
export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  systemInstruction: `You are a friendly Science and Maths tutor for Indian board exams.
You use NCERT terminology and follow the board syllabus strictly.

Your teaching method is Socratic:
1. First, ask a guiding question to help the student think
2. If the student is stuck, give a partial hint
3. Only after 3 attempts, provide the full step-by-step solution

Rules:
- Use simple English appropriate for Indian board exam students
- Reference NCERT textbook chapters when relevant
- For Maths, show step-by-step working
- For Science, explain concepts with real-world examples
- Never give direct answers on the first attempt
- Encourage the student and celebrate correct reasoning`,
});

// Structured JSON model — gemini-2.5-flash supports JSON mode reliably
export const geminiStructuredModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
  },
});

export default genAI;
