export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewState {
  reps: number
  ease: number
  intervalDays: number
  dueAt: string
  lastReviewedAt?: string
}

export interface Question {
  id: string
  content: string
  answer: string
  source?: string
  imagePath?: string
  imageData?: string
  imageMediaId?: string
  artifacts: QuestionArtifact[]
  ocrText?: string
  knowledgePoints: string[]
  tags: string[]
  difficulty: number
  mistakeCause?: string
  createdAt: string
  updatedAt: string
  review: ReviewState
}

export interface QuestionArtifact {
  id?: string
  kind: 'image' | 'video' | 'html'
  title?: string
  source?: string
  content?: string
  poster?: string
}

export interface WrongQuestionAnalysis {
  questionId: string
  solution?: string
  mistakeType?: string
  reasoningError?: string
  knowledgeGaps: string[]
  reasoningGaps: string[]
  correctionStrategy: string[]
  variantSuggestions: string[]
  confidence?: number
  generatedBy?: string
  createdAt: string
  updatedAt: string
}

export interface LearningGap {
  id: string
  name: string
  description?: string
  severity: number
  createdAt: string
  updatedAt: string
}

export interface QuestionVariant {
  id: string
  questionId: string
  variantType: string
  content: string
  answer: string
  analysis?: string
  difficulty: number
  source?: string
  generatedBy?: string
  createdAt: string
  updatedAt: string
}

export interface QuestionAttempt {
  id: string
  questionId: string
  variantId?: string
  userAnswer?: string
  isCorrect?: boolean
  score?: number
  timeSpentMs?: number
  mistakeCause?: string
  analysis?: string
  attemptedAt: string
}

export interface ReviewLog {
  id: number
  questionId: string
  grade: ReviewGrade
  quality: number
  previousIntervalDays: number
  nextIntervalDays: number
  easeAfter: number
  reviewedAt: string
}

export interface SearchHit {
  question: Question
  score: number
  matchType: 'fts' | 'similarity'
}

export interface Dashboard {
  totalQuestions: number
  reviewed: number
  due: number
  mastered: number
  streak: number
  reviewCount: number
  successRate: number
  attemptCount: number
  attemptAccuracy: number
  learningGapCount: number
  knowledgePoints: Array<{ name: string; questionCount: number; mastery: number; accuracy: number; gapCount: number }>
  weakPoints: Array<{ name: string; questionCount: number; mastery: number; accuracy: number; gapCount: number }>
  activity: Array<{ date: string; count: number }>
  reviewTrend: Array<{ date: string; reviews: number; successRate: number }>
  masteryTrend: Array<{ date: string; mastered: number }>
  mistakeCauses: Array<{ name: string; count: number }>
  learningGaps: Array<{ name: string; questionCount: number; dueCount: number; severity: number; confidence: number }>
  difficulty: Array<{ level: number; count: number }>
  reviewCompletionRate: number
  weeklyReport: {
    added: number
    reviews: number
    successfulReviews: number
    activeDays: number
    strongestKnowledgePoint?: string
    weakestKnowledgePoint?: string
  }
}

export interface KnowledgeGraph {
  nodes: Array<{ id: string; count: number; mastery: number; due: number }>
  edges: Array<{ source: string; target: string; weight: number }>
}
