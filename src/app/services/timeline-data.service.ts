import { Injectable, signal } from '@angular/core';
import { WorkCenterDocument } from '../../model';

const PAGE_SIZE = 50;

interface SampleData {
  metadata: { generatedAt: string; version: string };
  data: {
    workCenters: WorkCenterDocument[];
    workOrders: unknown[];
  };
}

@Injectable({ providedIn: 'root' })
export class TimelineDataService {
  private workCenterCacheSignal = signal<WorkCenterDocument[]>([]);
  private totalWorkCenterCountSignal = signal<number>(0);
  private loadingSignal = signal<boolean>(false);
  private loadedPages = new Set<number>();

  private allWorkCenters: WorkCenterDocument[] = [];
  private dataLoaded = false;

  readonly workCenterCache = this.workCenterCacheSignal.asReadonly();
  readonly totalWorkCenterCount = this.totalWorkCenterCountSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  constructor() {
    this.fetchData();
  }

  private async fetchData(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const response = await fetch('sample-data.json');
      const json: SampleData = await response.json();
      this.allWorkCenters = json.data.workCenters;
      this.totalWorkCenterCountSignal.set(this.allWorkCenters.length);
      this.dataLoaded = true;
      this.loadedPages.clear();
      this.loadPage(0);
    } catch (e) {
      console.error('Failed to load sample-data.json', e);
      this.loadingSignal.set(false);
    }
  }

  loadPage(pageIndex: number): void {
    if (!this.dataLoaded) return;
    if (this.loadedPages.has(pageIndex)) return;
    this.loadedPages.add(pageIndex);
    this.loadingSignal.set(true);

    const start = pageIndex * PAGE_SIZE;
    const page = this.allWorkCenters.slice(start, start + PAGE_SIZE);

    if (page.length === 0) {
      this.loadingSignal.set(false);
      return;
    }

    const current = [...this.workCenterCacheSignal()];
    for (let i = 0; i < page.length; i++) {
      current[start + i] = page[i];
    }
    this.workCenterCacheSignal.set(current);
    this.loadingSignal.set(false);
  }

  ensurePageLoaded(startIndex: number, endIndex: number): void {
    const startPage = Math.floor(startIndex / PAGE_SIZE);
    const endPage = Math.floor(endIndex / PAGE_SIZE);
    for (let p = startPage; p <= endPage; p++) {
      this.loadPage(p);
    }
  }
}
