/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PersonaType = 'KIDS' | 'TEENAGERS' | 'ADULTS' | 'SENIORS';

export interface LearningNode {
  id: string;
  title: string;
  content: string;
  fact?: string; // "Did you know?"
  summary?: string; // Short summary
  reinforcement?: string; // One-liner reminder for later
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface LearningModule {
  nodes: LearningNode[];
  intermittentQuizzes: QuizQuestion[][]; // Index matches node clusters
  finalAssessment: QuizQuestion[];
}

export const PERSONA_CONFIG = {
  KIDS: {
    name: 'Kids',
    ageRange: '6-12',
    theme: 'emerald',
    icon: 'Baby',
    description: 'Adventure-ready learning! Simple words, big fun facts, and magic analogies.',
    styleMatrix: {
      tone: 'Super exciting and playful!',
      analogies: 'Magic, superheroes, and space adventures',
      vocabulary: 'Super simple (Grade school level)',
      pacing: 'Fast! Frequent rewards and high-fives'
    }
  },
  TEENAGERS: {
    name: 'Teenagers',
    ageRange: '13-19',
    theme: 'indigo',
    icon: 'Zap',
    description: 'Level up your knowledge! Fast-paced, snackable content with viral analogies.',
    styleMatrix: {
      tone: 'Casual, energetic, and total vibe',
      analogies: 'Gaming, social media trends, and life hacks',
      vocabulary: 'Modern, tech-savvy, and relatable',
      pacing: 'Snackable bursts of pure knowledge'
    }
  },
  ADULTS: {
    name: 'Adults',
    ageRange: '20-60',
    theme: 'slate',
    icon: 'Briefcase',
    description: 'Master the document in record time. Professional, sharp, and results-driven.',
    styleMatrix: {
      tone: 'Analytical, punchy, and direct',
      analogies: 'Productivity hacks, ROI, and career growth',
      vocabulary: 'Sharp, professional, and technical',
      pacing: 'Efficient and hyper-structured'
    }
  },
  SENIORS: {
    name: 'Old Adults',
    ageRange: '60+',
    theme: 'amber',
    icon: 'Scroll',
    description: 'Timeless wisdom meets modern tech. Patient, crystal clear, and rewarding.',
    styleMatrix: {
      tone: 'Respectful, calm, and deeply engaging',
      analogies: 'Historical parallels and enduring wisdom',
      vocabulary: 'Crystal clear and jargon-free',
      pacing: 'Steady, reinforcing, and satisfying'
    }
  }
};
