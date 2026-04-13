import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Message } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId'),
      brokers: this.configService.get<string[]>('kafka.brokers'),
      retry: { retries: 3, initialRetryTime: 300 },
    });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.warn(`Kafka producer failed to connect (non-fatal): ${err.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.isConnected) await this.producer.disconnect();
    } catch (err) {
      this.logger.warn(`Error disconnecting producer: ${err.message}`);
    }
  }

  async emit(topic: string, payload: Record<string, any>): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Kafka not connected. Dropping event: ${topic}`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: payload.userId || payload.paymentId || String(Date.now()),
            value: JSON.stringify(payload),
            headers: {
              'content-type': 'application/json',
              'produced-at': new Date().toISOString(),
            },
          },
        ],
      });
      this.logger.debug(`Event emitted to ${topic}: ${JSON.stringify(payload).slice(0, 100)}`);
    } catch (err) {
      this.logger.error(`Failed to emit event to ${topic}: ${err.message}`);
      // Don't throw — Kafka failures should not break the main flow
    }
  }

  async emitBatch(topic: string, payloads: Record<string, any>[]): Promise<void> {
    if (!this.isConnected || !payloads.length) return;

    const messages: Message[] = payloads.map((payload) => ({
      key: payload.userId || String(Date.now()),
      value: JSON.stringify(payload),
    }));

    try {
      await this.producer.send({ topic, messages });
      this.logger.debug(`Batch of ${payloads.length} events emitted to ${topic}`);
    } catch (err) {
      this.logger.error(`Failed to emit batch to ${topic}: ${err.message}`);
    }
  }
}
