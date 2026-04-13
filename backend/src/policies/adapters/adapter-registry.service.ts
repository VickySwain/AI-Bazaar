import { Injectable, Logger } from '@nestjs/common';
import { InsurerAdapter } from './insurer.adapter';
import { LicAdapter } from './lic.adapter';
import { HdfcAdapter } from './hdfc.adapter';

@Injectable()
export class AdapterRegistryService {
  private readonly logger = new Logger(AdapterRegistryService.name);
  private adapters: Map<string, InsurerAdapter> = new Map();

  constructor(
    private licAdapter: LicAdapter,
    private hdfcAdapter: HdfcAdapter,
  ) {
    this.register('LicAdapter', licAdapter);
    this.register('HdfcAdapter', hdfcAdapter);
  }

  register(name: string, adapter: InsurerAdapter): void {
    this.adapters.set(name, adapter);
    this.logger.log(`Registered adapter: ${name}`);
  }

  getAdapter(adapterClass: string): InsurerAdapter | undefined {
    return this.adapters.get(adapterClass);
  }

  getAll(): InsurerAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAdapterNames(): string[] {
    return Array.from(this.adapters.keys());
  }
}
