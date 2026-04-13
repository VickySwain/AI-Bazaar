import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { Policy } from './entities/policy.entity';
import { Insurer } from './entities/insurer.entity';
import { Quote } from './entities/quote.entity';
import { Purchase } from './entities/purchase.entity';
import { LicAdapter } from './adapters/lic.adapter';
import { HdfcAdapter } from './adapters/hdfc.adapter';
import { AdapterRegistryService } from './adapters/adapter-registry.service';
import { KafkaModule } from '../common/kafka/kafka.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Policy, Insurer, Quote, Purchase]),
    HttpModule,
    KafkaModule,
  ],
  controllers: [PoliciesController],
  providers: [
    PoliciesService,
    LicAdapter,
    HdfcAdapter,
    AdapterRegistryService,
  ],
  exports: [PoliciesService],
})
export class PoliciesModule {}
