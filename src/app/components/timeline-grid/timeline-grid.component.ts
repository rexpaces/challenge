import {
  Component,
  OnInit,
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
export class TimelineGridComponent implements OnInit, OnDestroy {
  @ViewChild('rightPanel') rightPanel?: ElementRef<HTMLElement>;

  // State
  private workCenterList = signal<WorkCenterDocument[]>([]);
  private visibleDateRange = signal<DateRange>({
    start: new Date(),
    end: new Date()
  });

  // Computed properties
  workCenters = this.workCenterList.asReadonly();

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

  private scrollTimeout: any;

  constructor() {
    this.initializeVisibleRange();
  }

  ngOnInit() {
    this.loadWorkCenters();
  }

  ngOnDestroy() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  private initializeVisibleRange() {
    const today = new Date();
    const config = getZoomConfig(DEFAULT_ZOOM_LEVEL);

    // Calculate start: 6 months before today
    const start = new Date(today);
    start.setMonth(start.getMonth() - 6);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    // Calculate end: 6 months after today
    const end = new Date(today);
    end.setMonth(end.getMonth() + 6);
    end.setDate(0); // Last day of month
    end.setHours(23, 59, 59, 999);

    this.visibleDateRange.set({ start, end });
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
    const element = event.target as HTMLElement;
    const scrollLeft = element.scrollLeft;
    const scrollWidth = element.scrollWidth;
    const clientWidth = element.clientWidth;

    // Debounce scroll events
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      // Check if approaching left edge
      if (scrollLeft < 200) {
        this.expandDateRange('left');
      }

      // Check if approaching right edge
      if (scrollLeft > scrollWidth - clientWidth - 200) {
        this.expandDateRange('right');
      }
    }, 100);
  }

  private expandDateRange(direction: 'left' | 'right') {
    const current = this.visibleDateRange();
    const monthsToExpand = 3; // Expand by 3 months at a time

    if (direction === 'left') {
      const start = new Date(current.start);
      start.setMonth(start.getMonth() - monthsToExpand);
      this.visibleDateRange.set({
        start,
        end: current.end
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
}
