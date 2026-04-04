export interface ChapterInfo {
  number: number;
  name: string;
}

export type BoardType = 'CBSE' | 'ICSE';
export type ClassLevel = 8 | 9 | 10;
export type SubjectType = 'science' | 'maths' | 'physics' | 'chemistry' | 'biology' | 'ai';

// For CBSE, subjects are: science, maths
// For ICSE, subjects are: physics, chemistry, biology, maths

export const BOARD_SUBJECTS: Record<BoardType, SubjectType[]> = {
  CBSE: ['science', 'maths', 'ai'],
  ICSE: ['physics', 'chemistry', 'biology', 'maths', 'ai'],
};

export const SUBJECT_LABELS: Record<SubjectType, { label: string; icon: string }> = {
  science: { label: 'Science', icon: '🔬' },
  maths: { label: 'Mathematics', icon: '📐' },
  physics: { label: 'Physics', icon: '⚡' },
  chemistry: { label: 'Chemistry', icon: '🧪' },
  biology: { label: 'Biology', icon: '🧬' },
  ai: { label: 'AI & Computing', icon: '🤖' },
};

// CBSE Class 8
const cbseClass8Science: ChapterInfo[] = [
  { number: 1, name: 'Exploring the Investigative World of Science' },
  { number: 2, name: 'The Invisible Living World: Beyond Our Naked Eye' },
  { number: 3, name: 'Health: The Ultimate Treasure' },
  { number: 4, name: 'Electricity: Magnetic and Heating Effects' },
  { number: 5, name: 'Exploring Forces' },
  { number: 6, name: 'Pressure, Winds, Storms and Cyclones' },
  { number: 7, name: 'Particulate Nature of Matter' },
  { number: 8, name: 'Nature of Matter: Elements, Compounds and Mixtures' },
  { number: 9, name: 'The Amazing World of Solutes, Solvents and Solutions' },
  { number: 10, name: 'Light: Mirrors and Lenses' },
  { number: 11, name: 'Keeping Time with the Skies' },
  { number: 12, name: 'How Nature Works in Harmony' },
  { number: 13, name: 'Our Home: Earth, a Unique Life Sustaining Planet' },
];

const cbseClass8Maths: ChapterInfo[] = [
  { number: 1, name: 'A Square and A Cube' },
  { number: 2, name: 'Power Play' },
  { number: 3, name: 'A Story of Numbers' },
  { number: 4, name: 'Quadrilaterals' },
  { number: 5, name: 'Number Play' },
  { number: 6, name: 'We Distribute, Yet Things Multiply' },
  { number: 7, name: 'Proportional Reasoning' },
];

// CBSE Class 9
const cbseClass9Science: ChapterInfo[] = [
  { number: 1, name: 'Matter in Our Surroundings' },
  { number: 2, name: 'Is Matter Around Us Pure' },
  { number: 3, name: 'Atoms and Molecules' },
  { number: 4, name: 'Structure of the Atom' },
  { number: 5, name: 'The Fundamental Unit of Life' },
  { number: 6, name: 'Tissues' },
  { number: 7, name: 'Motion' },
  { number: 8, name: 'Force and Laws of Motion' },
  { number: 9, name: 'Gravitation' },
  { number: 10, name: 'Work and Energy' },
  { number: 11, name: 'Sound' },
  { number: 12, name: 'Diversity in Living Organisms' },
  { number: 13, name: 'Improvement in Food Resources' },
];

const cbseClass9Maths: ChapterInfo[] = [
  { number: 1, name: 'Number Systems' },
  { number: 2, name: 'Polynomials' },
  { number: 3, name: 'Coordinate Geometry' },
  { number: 4, name: 'Linear Equations in Two Variables' },
  { number: 5, name: 'Introduction to Euclid\'s Geometry' },
  { number: 6, name: 'Lines and Angles' },
  { number: 7, name: 'Triangles' },
  { number: 8, name: 'Quadrilaterals' },
  { number: 9, name: 'Circles' },
  { number: 10, name: 'Heron\'s Formula' },
  { number: 11, name: 'Surface Areas and Volumes' },
  { number: 12, name: 'Statistics' },
  { number: 13, name: 'Probability' },
  { number: 14, name: 'Areas of Parallelograms and Triangles' },
  { number: 15, name: 'Constructions' },
];

// CBSE Class 10
const cbseClass10Science: ChapterInfo[] = [
  { number: 1, name: 'Chemical Reactions and Equations' },
  { number: 2, name: 'Acids, Bases and Salts' },
  { number: 3, name: 'Metals and Non-metals' },
  { number: 4, name: 'Carbon and its Compounds' },
  { number: 5, name: 'Periodic Classification of Elements' },
  { number: 6, name: 'Life Processes' },
  { number: 7, name: 'Control and Coordination' },
  { number: 8, name: 'How do Organisms Reproduce?' },
  { number: 9, name: 'Heredity and Evolution' },
  { number: 10, name: 'Light — Reflection and Refraction' },
  { number: 11, name: 'The Human Eye and the Colourful World' },
  { number: 12, name: 'Electricity' },
  { number: 13, name: 'Magnetic Effects of Electric Current' },
];

const cbseClass10Maths: ChapterInfo[] = [
  { number: 1, name: 'Real Numbers' },
  { number: 2, name: 'Polynomials' },
  { number: 3, name: 'Pair of Linear Equations in Two Variables' },
  { number: 4, name: 'Quadratic Equations' },
  { number: 5, name: 'Arithmetic Progressions' },
  { number: 6, name: 'Triangles' },
  { number: 7, name: 'Coordinate Geometry' },
  { number: 8, name: 'Introduction to Trigonometry' },
  { number: 9, name: 'Some Applications of Trigonometry' },
  { number: 10, name: 'Circles' },
  { number: 11, name: 'Areas Related to Circles' },
  { number: 12, name: 'Surface Areas and Volumes' },
  { number: 13, name: 'Statistics' },
  { number: 14, name: 'Probability' },
];

// ICSE Class 8
const icseClass8Physics: ChapterInfo[] = [
  { number: 1, name: 'Matter' },
  { number: 2, name: 'Physical Quantities and Measurement' },
  { number: 3, name: 'Force and Pressure' },
  { number: 4, name: 'Energy' },
  { number: 5, name: 'Light Energy' },
  { number: 6, name: 'Heat Transfer' },
  { number: 7, name: 'Sound' },
  { number: 8, name: 'Electricity' },
];

const icseClass8Chemistry: ChapterInfo[] = [
  { number: 1, name: 'Matter' },
  { number: 2, name: 'Physical and Chemical Changes' },
  { number: 3, name: 'Elements, Compounds and Mixtures' },
  { number: 4, name: 'Atomic Structure' },
  { number: 5, name: 'Language of Chemistry' },
  { number: 6, name: 'Chemical Reactions' },
  { number: 7, name: 'Hydrogen' },
  { number: 8, name: 'Water' },
  { number: 9, name: 'Carbon and Its Compounds' },
];

const icseClass8Biology: ChapterInfo[] = [
  { number: 1, name: 'Transportation in Plants' },
  { number: 2, name: 'Reproduction in Plants' },
  { number: 3, name: 'Reproduction in Humans' },
  { number: 4, name: 'Ecosystems' },
  { number: 5, name: 'Endocrine System and Adolescence' },
  { number: 6, name: 'The Circulatory System' },
  { number: 7, name: 'Nervous System' },
  { number: 8, name: 'Diseases and First Aid' },
  { number: 9, name: 'Food Production' },
];

const icseClass8Maths: ChapterInfo[] = [
  { number: 1, name: 'Rational Numbers' },
  { number: 2, name: 'Exponents and Powers' },
  { number: 3, name: 'Squares and Square Roots' },
  { number: 4, name: 'Cubes and Cube Roots' },
  { number: 5, name: 'Playing with Numbers' },
  { number: 6, name: 'Sets' },
  { number: 7, name: 'Percent and Percentage' },
  { number: 8, name: 'Profit, Loss and Discount' },
  { number: 9, name: 'Interest' },
  { number: 10, name: 'Direct and Inverse Variation' },
  { number: 11, name: 'Algebraic Expressions' },
  { number: 12, name: 'Algebraic Identities' },
  { number: 13, name: 'Factorisation' },
  { number: 14, name: 'Linear Equations in One Variable' },
  { number: 15, name: 'Linear Inequations' },
  { number: 16, name: 'Understanding Shapes' },
  { number: 17, name: 'Special Types of Quadrilaterals' },
  { number: 18, name: 'Constructions' },
  { number: 19, name: 'Area of a Trapezium and a Polygon' },
  { number: 20, name: 'Volume and Surface Area of Solids' },
  { number: 21, name: 'Data Handling' },
];

// ICSE Class 9
const icseClass9Physics: ChapterInfo[] = [
  { number: 1, name: 'Measurements and Experimentation' },
  { number: 2, name: 'Motion in One Dimension' },
  { number: 3, name: 'Laws of Motion' },
  { number: 4, name: 'Pressure in Fluids and Atmospheric Pressure' },
  { number: 5, name: 'Upthrust in Fluids, Archimedes\' Principle and Floatation' },
  { number: 6, name: 'Heat and Energy' },
  { number: 7, name: 'Reflection of Light' },
  { number: 8, name: 'Propagation of Sound Waves' },
  { number: 9, name: 'Current Electricity' },
  { number: 10, name: 'Magnetism' },
];

const icseClass9Chemistry: ChapterInfo[] = [
  { number: 1, name: 'The Language of Chemistry' },
  { number: 2, name: 'Chemical Changes and Reactions' },
  { number: 3, name: 'Water' },
  { number: 4, name: 'Atomic Structure and Chemical Bonding' },
  { number: 5, name: 'The Periodic Table' },
  { number: 6, name: 'Study of the First Element — Hydrogen' },
  { number: 7, name: 'Study of Gas Laws' },
  { number: 8, name: 'Atmospheric Pollution' },
  { number: 9, name: 'Practical Work' },
];

const icseClass9Biology: ChapterInfo[] = [
  { number: 1, name: 'Introducing Biology' },
  { number: 2, name: 'Cell: The Unit of Life' },
  { number: 3, name: 'Tissues: Plant and Animal Tissues' },
  { number: 4, name: 'The Flower' },
  { number: 5, name: 'Pollination and Fertilisation' },
  { number: 6, name: 'Seeds: Structure and Germination' },
  { number: 7, name: 'Respiration in Plants' },
  { number: 8, name: 'Five Kingdom Classification' },
  { number: 9, name: 'Economic Importance of Bacteria and Fungi' },
  { number: 10, name: 'Nutrition' },
  { number: 11, name: 'Digestive System' },
  { number: 12, name: 'Skin: The Jack of All Trades' },
  { number: 13, name: 'The Respiratory System' },
  { number: 14, name: 'Hygiene — A Key to Healthy Life' },
  { number: 15, name: 'Diseases: Cause and Control' },
];

const icseClass9Maths: ChapterInfo[] = [
  { number: 1, name: 'Rational and Irrational Numbers' },
  { number: 2, name: 'Compound Interest' },
  { number: 3, name: 'Expansions' },
  { number: 4, name: 'Factorisation' },
  { number: 5, name: 'Simultaneous Linear Equations' },
  { number: 6, name: 'Problems on Simultaneous Linear Equations' },
  { number: 7, name: 'Quadratic Equations' },
  { number: 8, name: 'Indices' },
  { number: 9, name: 'Logarithms' },
  { number: 10, name: 'Triangles' },
  { number: 11, name: 'Mid Point Theorem' },
  { number: 12, name: 'Pythagoras Theorem' },
  { number: 13, name: 'Rectilinear Figures' },
  { number: 14, name: 'Theorems on Area' },
  { number: 15, name: 'Circle' },
  { number: 16, name: 'Mensuration' },
  { number: 17, name: 'Trigonometric Ratios' },
  { number: 18, name: 'Trigonometric Ratios and Standard Angles' },
  { number: 19, name: 'Coordinate Geometry' },
  { number: 20, name: 'Statistics' },
];

// ICSE Class 10
const icseClass10Physics: ChapterInfo[] = [
  { number: 1, name: 'Force' },
  { number: 2, name: 'Work, Energy and Power' },
  { number: 3, name: 'Machines' },
  { number: 4, name: 'Refraction of Light at Plane Surfaces' },
  { number: 5, name: 'Refraction Through a Lens' },
  { number: 6, name: 'Spectrum' },
  { number: 7, name: 'Sound' },
  { number: 8, name: 'Current Electricity' },
  { number: 9, name: 'Household Circuits' },
  { number: 10, name: 'Magnetic Effect of Current' },
  { number: 11, name: 'Calorimetry' },
  { number: 12, name: 'Radioactivity' },
];

const icseClass10Chemistry: ChapterInfo[] = [
  { number: 1, name: 'Periodic Table, Periodic Properties and Variations of Properties' },
  { number: 2, name: 'Chemical Bonding' },
  { number: 3, name: 'Acids, Bases and Salts' },
  { number: 4, name: 'Analytical Chemistry' },
  { number: 5, name: 'Mole Concept and Stoichiometry' },
  { number: 6, name: 'Electrolysis' },
  { number: 7, name: 'Metallurgy' },
  { number: 8, name: 'Study of Compounds — Hydrogen Chloride' },
  { number: 9, name: 'Study of Compounds — Ammonia' },
  { number: 10, name: 'Study of Compounds — Nitric Acid' },
  { number: 11, name: 'Study of Compounds — Sulphuric Acid' },
  { number: 12, name: 'Organic Chemistry' },
];

const icseClass10Biology: ChapterInfo[] = [
  { number: 1, name: 'Cell Cycle, Cell Division and Structure of Chromosomes' },
  { number: 2, name: 'Genetics — Some Basic Fundamentals' },
  { number: 3, name: 'Absorption by Roots' },
  { number: 4, name: 'Transpiration' },
  { number: 5, name: 'Photosynthesis' },
  { number: 6, name: 'Chemical Coordination in Plants' },
  { number: 7, name: 'The Circulatory System' },
  { number: 8, name: 'The Excretory System' },
  { number: 9, name: 'The Nervous System and Sense Organs' },
  { number: 10, name: 'The Endocrine System' },
  { number: 11, name: 'The Reproductive System' },
  { number: 12, name: 'Population — The Increasing Numbers and Rising Problems' },
  { number: 13, name: 'Pollution — A Rising Environmental Problem' },
];

const icseClass10Maths: ChapterInfo[] = [
  { number: 1, name: 'GST (Goods and Services Tax)' },
  { number: 2, name: 'Banking' },
  { number: 3, name: 'Shares and Dividends' },
  { number: 4, name: 'Linear Inequations' },
  { number: 5, name: 'Quadratic Equations in One Variable' },
  { number: 6, name: 'Factorisation' },
  { number: 7, name: 'Ratio and Proportion' },
  { number: 8, name: 'Matrices' },
  { number: 9, name: 'Arithmetic and Geometric Progressions' },
  { number: 10, name: 'Reflection' },
  { number: 11, name: 'Section Formula' },
  { number: 12, name: 'Equation of a Straight Line' },
  { number: 13, name: 'Similarity' },
  { number: 14, name: 'Locus' },
  { number: 15, name: 'Circles' },
  { number: 16, name: 'Constructions' },
  { number: 17, name: 'Mensuration' },
  { number: 18, name: 'Trigonometric Identities' },
  { number: 19, name: 'Trigonometric Tables' },
  { number: 20, name: 'Heights and Distances' },
  { number: 21, name: 'Measures of Central Tendency' },
  { number: 22, name: 'Probability' },
];

// AI & Computing — Class 8 (Discover AI: what it is, where it's used, staying safe)
const aiClass8: ChapterInfo[] = [
  { number: 1, name: 'What is AI? Understanding Artificial Intelligence Simply' },
  { number: 2, name: 'AI Around You: Voice Assistants, Filters & Recommendations' },
  { number: 3, name: 'Talking to AI: Your First Conversation with a Chatbot' },
  { number: 4, name: 'How to Ask Good Questions: Introduction to Prompting' },
  { number: 5, name: 'AI for Fun: Generating Stories, Poems & Jokes' },
  { number: 6, name: 'AI Art Tools: Creating Images with Simple Prompts' },
  { number: 7, name: 'Is That Real? Spotting AI-Generated Content Online' },
  { number: 8, name: 'Staying Safe with AI: Privacy, Passwords & Digital Footprint' },
  { number: 9, name: 'AI vs Human: What AI Can & Cannot Do' },
  { number: 10, name: 'Cool AI Careers: What People Who Work with AI Actually Do' },
];

// AI & Computing — Class 9 (Use AI daily: prompting, productivity, critical thinking)
const aiClass9: ChapterInfo[] = [
  { number: 1, name: 'AI Recap & What\'s New: Tools That Launched This Year' },
  { number: 2, name: 'Prompt Engineering Basics: Getting Better Answers from AI' },
  { number: 3, name: 'Using AI for Homework: Research, Summaries & Explanations' },
  { number: 4, name: 'AI Writing Tools: Drafting Essays, Emails & Reports' },
  { number: 5, name: 'AI Image & Video Tools: Canva AI, Remove.bg & More' },
  { number: 6, name: 'AI for Presentations: Making Slides & Posters Faster' },
  { number: 7, name: 'Fact-Checking AI: When Chatbots Get It Wrong' },
  { number: 8, name: 'Deepfakes & Misinformation: How to Spot Fake Content' },
  { number: 9, name: 'AI Ethics: Bias, Fairness & Why It Matters' },
  { number: 10, name: 'Using AI Responsibly: Plagiarism, Copyright & Honesty' },
  { number: 11, name: 'Voice AI & Translation: Breaking Language Barriers' },
  { number: 12, name: 'Mini Project: Solve a Real Problem Using AI Tools' },
];

// AI & Computing — Class 10 (Advanced prompting, AI-powered workflows, career readiness)
const aiClass10: ChapterInfo[] = [
  { number: 1, name: 'Advanced Prompting: Chain-of-Thought & Role-Based Prompts' },
  { number: 2, name: 'AI for Coding: Using Copilot & ChatGPT to Write Simple Programs' },
  { number: 3, name: 'Building a Chatbot: No-Code Tools to Create Your Own AI Bot' },
  { number: 4, name: 'AI for Data: Turning Spreadsheets into Insights with AI' },
  { number: 5, name: 'AI-Powered Study Plan: Personalising Your Board Exam Prep' },
  { number: 6, name: 'How ChatGPT & Gemini Actually Work (Simplified)' },
  { number: 7, name: 'AI in India: Startups, Government Apps & Real-World Impact' },
  { number: 8, name: 'AI & Social Media: Algorithms, Feeds & Your Attention' },
  { number: 9, name: 'Digital Citizenship: Online Safety, Cyberbullying & AI Laws' },
  { number: 10, name: 'AI Careers for the Future: Skills You Need Starting Now' },
  { number: 11, name: 'Building Your AI Portfolio: Showcasing Projects & Skills' },
  { number: 12, name: 'Capstone Project: Solve a School or Community Problem with AI' },
];

// Master database
const chapterDatabase: Record<BoardType, Record<ClassLevel, Record<SubjectType, ChapterInfo[]>>> = {
  CBSE: {
    8: {
      science: cbseClass8Science,
      maths: cbseClass8Maths,
      physics: [],
      chemistry: [],
      biology: [],
      ai: aiClass8,
    },
    9: {
      science: cbseClass9Science,
      maths: cbseClass9Maths,
      physics: [],
      chemistry: [],
      biology: [],
      ai: aiClass9,
    },
    10: {
      science: cbseClass10Science,
      maths: cbseClass10Maths,
      physics: [],
      chemistry: [],
      biology: [],
      ai: aiClass10,
    },
  },
  ICSE: {
    8: {
      physics: icseClass8Physics,
      chemistry: icseClass8Chemistry,
      biology: icseClass8Biology,
      maths: icseClass8Maths,
      science: [],
      ai: aiClass8,
    },
    9: {
      physics: icseClass9Physics,
      chemistry: icseClass9Chemistry,
      biology: icseClass9Biology,
      maths: icseClass9Maths,
      science: [],
      ai: aiClass9,
    },
    10: {
      physics: icseClass10Physics,
      chemistry: icseClass10Chemistry,
      biology: icseClass10Biology,
      maths: icseClass10Maths,
      science: [],
      ai: aiClass10,
    },
  },
};

/**
 * Get chapters for a specific board, class level, and subject
 * @param board - 'CBSE' or 'ICSE'
 * @param classLevel - 8, 9, or 10
 * @param subject - Subject name (science, maths, physics, chemistry, biology)
 * @returns Array of chapters for the specified combination
 */
export function getChapters(
  board: BoardType,
  classLevel: ClassLevel,
  subject: SubjectType
): ChapterInfo[] {
  const chapters = chapterDatabase[board]?.[classLevel]?.[subject];

  if (!chapters) {
    console.warn(
      `No chapters found for ${board} Class ${classLevel} ${subject}`
    );
    return [];
  }

  return chapters;
}

/**
 * Get all valid subjects for a given board and class level
 */
export function getValidSubjects(
  board: BoardType,
  classLevel: ClassLevel
): SubjectType[] {
  return BOARD_SUBJECTS[board].filter(
    (subject) => getChapters(board, classLevel, subject).length > 0
  );
}

/**
 * Get chapter count for a specific combination
 */
export function getChapterCount(
  board: BoardType,
  classLevel: ClassLevel,
  subject: SubjectType
): number {
  return getChapters(board, classLevel, subject).length;
}

/**
 * Get a specific chapter by number
 */
export function getChapter(
  board: BoardType,
  classLevel: ClassLevel,
  subject: SubjectType,
  chapterNumber: number
): ChapterInfo | undefined {
  const chapters = getChapters(board, classLevel, subject);
  return chapters.find((ch) => ch.number === chapterNumber);
}
