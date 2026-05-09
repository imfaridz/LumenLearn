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
    description: 'Gamified, simple vocabulary, focus on fun facts.',
    styleMatrix: {
      tone: 'Exciting and playful',
      analogies: 'Magic, animals, adventures',
      vocabulary: 'Grade school (7th grade level max)',
      pacing: 'Fast with frequent rewards'
    }
  },
  TEENAGERS: {
    name: 'Teenagers',
    ageRange: '13-19',
    theme: 'indigo',
    icon: 'Zap',
    description: 'Relatable, fast-paced, modern analogies.',
    styleMatrix: {
      tone: 'Casual and energetic',
      analogies: 'Social media, gaming, viral trends',
      vocabulary: 'Current slang and tech-terms',
      pacing: 'Snackable with social competition'
    }
  },
  ADULTS: {
    name: 'Adults',
    ageRange: '20-60',
    theme: 'slate',
    icon: 'Briefcase',
    description: 'Efficiency-focused, professional, practical.',
    styleMatrix: {
      tone: 'Analytical and direct',
      analogies: 'Career growth, productivity, ROI',
      vocabulary: 'Professional and technical',
      pacing: 'Efficient and structured'
    }
  },
  SENIORS: {
    name: 'Old Adults',
    ageRange: '60+',
    theme: 'amber',
    icon: 'Scroll',
    description: 'Clear, patient, focus on cognitive retention.',
    styleMatrix: {
      tone: 'Respectful and calm',
      analogies: 'Historical context, wisdom, legacy',
      vocabulary: 'Standard, clear, no jargon',
      pacing: 'Steady and reinforcing'
    }
  }
};
