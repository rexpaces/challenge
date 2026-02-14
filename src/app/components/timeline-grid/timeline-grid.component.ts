import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DEFAULT_ZOOM_LEVEL, getZoomConfig } from '../../../model/timeline-config';
import { WorkCenterDocument } from '../../../model';

interface DateRange {
  start: Date;
  end: Date;
}

@Component({
  selector: 'app-timeline-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-grid.component.html',
  styleUrl: './timeline-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineGridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rightPanel') rightPanel?: ElementRef<HTMLElement>;

  // State
  private workCenterList = signal<WorkCenterDocument[]>([]);
  private visibleDateRange = signal<DateRange>({
    start: new Date(),
    end: new Date()
  });
  private hoveredRowIndex = signal<number | null>(null);

  // Computed properties
  workCenters = this.workCenterList.asReadonly();
  hoveredRowIndex$ = this.hoveredRowIndex.asReadonly();

  visibleDates = computed(() => {
    const range = this.visibleDateRange();
    const dates: Date[] = [];

    let current = new Date(range.start);
    current.setDate(1); // Start from first day of month
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

  ngOnInit() {
    this.loadWorkCenters();
  }

  ngOnDestroy() {
    this.scrollThrottleActive = false;
  }

  private initializeVisibleRange() {
    const today = new Date();

    // Calculate start: 12 months before today (for smooth infinite scroll)
    const start = new Date(today);
    start.setMonth(start.getMonth() - 12);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    // Calculate end: 12 months after today (for smooth infinite scroll)
    const end = new Date(today);
    end.setMonth(end.getMonth() + 12);
    end.setDate(0); // Last day of month
    end.setHours(23, 59, 59, 999);

    this.visibleDateRange.set({ start, end });
  }

  ngAfterViewInit() {
    // Scroll right panel so today is the second visible month
    if (this.rightPanel) {
      this.scrollToPositionToday();
    }
  }

  private scrollToPositionToday() {
    if (!this.rightPanel) return;

    const element = this.rightPanel.nativeElement;
    const today = new Date();
    const range = this.visibleDateRange();

    // Calculate how many months between range start and today
    let monthsFromStart = 0;
    let current = new Date(range.start);
    current.setDate(1);

    while (current < today) {
      monthsFromStart++;
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate scroll position: today should be the second visible month
    // So we scroll to show (today - 1 month) at the start
    const columnWidth = this.columnWidth();
    const scrollPosition = (monthsFromStart - 1) * columnWidth;

    // Scroll to position with today as second visible month
    element.scrollLeft = Math.max(0, scrollPosition);

    // Allow scroll handler to start working after initial positioning settles
    requestAnimationFrame(() => {
      this.isInitializing = false;
    });
  }

  private loadWorkCenters() {
    // Mock data - in a real app, this would come from a service
    const mockCenters: WorkCenterDocument[] = [
      { docId: 'wc-1', docType: 'workCenter', data: { name: 'Assembly Line A' } },
      { docId: 'wc-2', docType: 'workCenter', data: { name: 'Assembly Line B' } },
      { docId: 'wc-3', docType: 'workCenter', data: { name: 'Quality Check' } },
      { docId: 'wc-4', docType: 'workCenter', data: { name: 'Packaging' } },
      { docId: 'wc-5', docType: 'workCenter', data: { name: 'Shipping' } },
      { docId: 'wc-6', docType: 'workCenter', data: { name: 'Testing Center' } },
      { docId: 'wc-7', docType: 'workCenter', data: { name: 'Calibration' } },
      { docId: 'wc-8', docType: 'workCenter', data: { name: 'Final Assembly' } }
    ];

    this.workCenterList.set(mockCenters);
  }

  onHorizontalScroll(event: Event) {
    // Skip during initialization
    if (this.isInitializing) return;

    // Throttle: fire at most once per animation frame (not debounce)
    if (this.scrollThrottleActive) return;
    this.scrollThrottleActive = true;

    requestAnimationFrame(() => {
      this.scrollThrottleActive = false;

      const element = event.target as HTMLElement;
      const scrollLeft = element.scrollLeft;
      const scrollWidth = element.scrollWidth;
      const clientWidth = element.clientWidth;
      const threshold = clientWidth; // Use full viewport width as threshold

      // Check if approaching left edge
      if (scrollLeft < threshold) {
        this.expandDateRange('left', element);
      }

      // Check if approaching right edge
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

      // Calculate the width of the new columns being prepended
      const addedWidth = monthsToExpand * columnWidth;

      this.visibleDateRange.set({
        start,
        end: current.end
      });

      // Adjust scrollLeft to compensate for prepended columns
      // This prevents the viewport from jumping when content is added on the left
      requestAnimationFrame(() => {
        scrollElement.scrollLeft += addedWidth;
      });
    } else {
      const end = new Date(current.end);
      end.setMonth(end.getMonth() + monthsToExpand);
      end.setDate(0); // Last day of month
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
