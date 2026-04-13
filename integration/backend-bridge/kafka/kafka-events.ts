// shared/kafka-events.ts
// Single source of truth for all Kafka topic names and payload shapes.
// Used by both the NestJS producer and FastAPI consumer.

// ── Topic Names ───────────────────────────────────────────────────────────
export const KAFKA_TOPICS = {
  // Payment events (NestJS → all consumers)
  PAYMENT_CAPTURED:           'payment.captured',
  PAYMENT_WEBHOOK_CAPTURED:   'payment.webhook.captured',
  PAYMENT_FAILED:             'payment.failed',

  // Policy events (NestJS → notification, ML)
  POLICY_ACTIVATED:           'policy.activated',
  POLICY_QUOTE_CREATED:       'policy.quote.created',
  POLICY_SEARCH_EVENTS:       'policy.search.events',

  // Recommendation events (NestJS → ML, Analytics)
  RECOMMENDATIONS_GENERATED:  'recommendations.generated',
  RECOMMENDATIONS_INTERACTION:'recommendations.interaction',

  // ML training events (ML service → NestJS admin)
  MODEL_RETRAIN_TRIGGERED:    'model.retrain.triggered',
  MODEL_RETRAIN_COMPLETE:     'model.retrain.complete',
} as const;

export type KafkaTopic = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];

// ── Payload interfaces ────────────────────────────────────────────────────

export interface PaymentCapturedEvent {
  paymentId: string;
  userId: string;
  amount: number;
  purchaseId: string;
  quoteId?: string;
  timestamp: string;
}

export interface PolicyActivatedEvent {
  purchaseId: string;
  userId: string;
  policyId: string;
  policyNumber: string;
  premiumPaid: number;
  timestamp: string;
}

export interface PolicyQuoteCreatedEvent {
  userId: string;
  policyId: string;
  quoteId: string;
  category: string;
  premium: number;
  timestamp: string;
}

export interface RecommendationsGeneratedEvent {
  userId: string;
  count: number;
  category: string;
  modelVersion: string;
  fallbackUsed: boolean;
  timestamp: string;
}

export interface RecommendationInteractionEvent {
  userId: string;
  recommendationId?: string;
  policyId: string;
  action: 'view' | 'click' | 'quote' | 'purchase' | 'dismiss';
  sessionId?: string;
  timestamp: string;
}

export interface ModelRetrainCompleteEvent {
  modelVersion: string;
  trainingDurationSeconds: number;
  metrics: {
    aucRoc: number;
    aucPr: number;
    precisionAt5: number;
    ndcgAt10: number;
  };
  trainingSamples: number;
  timestamp: string;
}
