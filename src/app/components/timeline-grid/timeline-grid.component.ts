import {
  Component,
  AfterViewInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { DEFAULT_ZOOM_LEVEL, getZoomConfig } from '../../../model/timeline-config';
import { WorkCenterDocument } from '../../../model';
import { TimelineDataService } from '../../services/timeline-data.service';

interface DateRange {
  start: Date;
  end: Date;
}

const ROW_HEIGHT = 48;
const FIRST_ROW_HEIGHT = 60;

@Component({
  selector: 'app-timeline-grid',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './timeline-grid.component.html',
  styleUrl: './timeline-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rightPanel') rightPanel?: ElementRef<HTMLElement>;
  @ViewChild('leftVirtualScroll') leftVirtualScroll?: CdkVirtualScrollViewport;

  private dataService = inject(TimelineDataService);

  readonly ROW_HEIGHT = ROW_HEIGHT;
  readonly FIRST_ROW_HEIGHT = FIRST_ROW_HEIGHT;

  // Data from service
  workCenterCache = this.dataService.workCenterCache;
  totalWorkCenterCount = this.dataService.totalWorkCenterCount;

  // First work center rendered outside CDK viewport
  firstWorkCenter = computed(() => {
    const cache = this.workCenterCache();
    return cache.length > 0 ? cache[0] : null;
  });

  // Remaining work centers fed into CDK virtual scroll
  remainingWorkCenters = computed(() => {
    return this.workCenterCache().slice(1);
  });

  // CDK viewport visible range tracking
  visibleStartIndex = signal(0);
  private visibleEndIndex = signal(0);

  // Work centers visible in right panel (driven by CDK viewport range, excludes first item)
  visibleWorkCenters = computed(() => {
    const cache = this.workCenterCache();
    if (cache.length <= 1) return [];
    const start = this.visibleStartIndex();
    const end = this.visibleEndIndex();
    // Before CDK fires its first scrolledIndexChange, show all remaining items
    if (end === 0 && start === 0) return cache.slice(1);
    return cache.slice(start + 1, end + 1);
  });

  // State
  private visibleDateRange = signal<DateRange>({
    start: new Date(),
    end: new Date()
  });
  private hoveredRowIndex = signal<number | null>(null);

  visibleDates = computed(() => {
    const range = this.visibleDateRange();
    const dates: Date[] = [];

    let current = new Date(range.start);
    current.setDate(1);
    current.setHours(0, 0, 0, 0);

    while (current <= range.end) {
      dates.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return dates;
  });

  columnWidth = computed(() => {
    return getZoomConfig(DEFAULT_ZOOM_LEVEL).columnWidthPixels;
  });

  // Memoized set of hovered row indices for efficient template binding
  hoveredRowIndices = computed(() => {
    const index = this.hoveredRowIndex();
    return index !== null ? new Set([index]) : new Set<number>();
  });

  private scrollThrottleActive = false;
  private isInitializing = true;

  constructor() {
    this.initializeVisibleRange();
  }

  ngOnDestroy() {
    this.scrollThrottleActive = false;
  }

  private initializeVisibleRange() {
    const today = new Date();

    const start = new Date(today);
    start.setMonth(start.getMonth() - 12);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setMonth(end.getMonth() + 12);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);

    this.visibleDateRange.set({ start, end });
  }

  ngAfterViewInit() {
    if (this.rightPanel) {
      this.scrollToPositionToday();
    }
  }

  private scrollToPositionToday() {
    if (!this.rightPanel) return;

    const element = this.rightPanel.nativeElement;
    const today = new Date();
    const range = this.visibleDateRange();

    let monthsFromStart = 0;
    let current = new Date(range.start);
    current.setDate(1);

    while (current < today) {
      monthsFromStart++;
      current.setMonth(current.getMonth() + 1);
    }

    const columnWidth = this.columnWidth();
    const scrollPosition = (monthsFromStart - 1) * columnWidth;

    element.scrollLeft = Math.max(0, scrollPosition);

    requestAnimationFrame(() => {
      this.isInitializing = false;
    });
  }

  onLeftPanelScrolledIndexChange(startIndex: number): void {
    const remaining = this.remainingWorkCenters();
    const viewportHeight = this.leftVirtualScroll?.getViewportSize() ?? 0;
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);
    const endIndex = Math.min(startIndex + visibleCount, remaining.length);

    this.visibleStartIndex.set(startIndex);
    this.visibleEndIndex.set(endIndex);

    // Ensure pages are loaded for the visible range (offset by 1 for the first row)
    this.dataService.ensurePageLoaded(startIndex + 1, endIndex + 1);
  }

  onHorizontalScroll(event: Event) {
    if (this.isInitializing) return;

    if (this.scrollThrottleActive) return;
    this.scrollThrottleActive = true;

    requestAnimationFrame(() => {
      this.scrollThrottleActive = false;

      const element = event.target as HTMLElement;
      const scrollLeft = element.scrollLeft;
      const scrollWidth = element.scrollWidth;
      const clientWidth = element.clientWidth;
      const threshold = clientWidth;

      if (scrollLeft < threshold) {
        this.expandDateRange('left', element);
      }

      if (scrollLeft > scrollWidth - clientWidth - threshold) {
        this.expandDateRange('right', element);
      }
    });
  }

  private expandDateRange(direction: 'left' | 'right', scrollElement: HTMLElement) {
    const current = this.visibleDateRange();
    const monthsToExpand = 3;
    const columnWidth = this.columnWidth();

    if (direction === 'left') {
      const start = new Date(current.start);
      start.setMonth(start.getMonth() - monthsToExpand);

      const addedWidth = monthsToExpand * columnWidth;

      this.visibleDateRange.set({
        start,
        end: current.end
      });

      requestAnimationFrame(() => {
        scrollElement.scrollLeft += addedWidth;
      });
    } else {
      const end = new Date(current.end);
      end.setMonth(end.getMonth() + monthsToExpand);
      end.setDate(0);
      this.visibleDateRange.set({
        start: current.start,
        end
      });
    }
  }

  formatDateHeader(date: Date): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  trackByCenter(_index: number, center: WorkCenterDocument): string {
    return center.docId;
  }

  trackByDate(_index: number, date: Date): number {
    return date.getTime();
  }

  onRowHover(index: number): void {
    this.hoveredRowIndex.set(index);
  }

  onRowLeave(): void {
    this.hoveredRowIndex.set(null);
  }
}
