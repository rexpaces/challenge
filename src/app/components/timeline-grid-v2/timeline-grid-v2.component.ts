import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  ViewChild,
  AfterViewInit,
  NgZone,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { take } from 'rxjs';

interface DateRange {
  start: Date;
  end: Date;
}

interface WorkOrder {
  id: string;
  name: string;
  workCenterId: string;
  startDate: Date;
  endDate: Date;
}

interface WorkOrderGridPosition {
  gridColumnStart: number; // 1-based CSS grid line
  gridColumnEnd: number; // 1-based CSS grid line (exclusive)
  marginLeftPx: number; // sub-month start offset
  marginRightPx: number; // sub-month end trim
}

interface PositionedWorkOrder {
  order: WorkOrder;
  position: WorkOrderGridPosition;
}

const ROW_HEIGHT = 48;
const COLUMN_WIDTH = 113;
const LEFT_PANEL_WIDTH = 200;
const TOTAL_ROWS = 1000;
const BUFFER_MONTHS = 24; // 2 years each direction from today

@Component({
  selector: 'app-timeline-grid-v2',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './timeline-grid-v2.component.html',
  styleUrl: './timeline-grid-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineGridV2Component implements AfterViewInit, OnDestroy {
  @ViewChild('bodyViewport') bodyViewport!: CdkVirtualScrollViewport;
  @ViewChild('headerViewport') headerViewport!: CdkVirtualScrollViewport;

  private zone = inject(NgZone);

  readonly ROW_HEIGHT = ROW_HEIGHT;
  readonly COLUMN_WIDTH = COLUMN_WIDTH;
  readonly LEFT_PANEL_WIDTH = LEFT_PANEL_WIDTH;

  // Demo data
  readonly workCenters = Array.from({ length: TOTAL_ROWS }, (_, i) => ({
    id: `wc-${i}`,
    name: `Work Center ${i + 1}`,
  }));

  // Generate random work orders for demo
  private generateWorkOrders(): WorkOrder[] {
    const orders: WorkOrder[] = [];
    const orderNames = [
      'Assembly Line A',
      'Painting Job B',
      'Quality Check C',
      'Welding Task D',
      'Fabrication E',
      'Testing Phase F',
      'Installation G',
      'Maintenance H',
      'Repair Work I',
      'Calibration J',
      'Inspection K',
      'Setup L',
    ];

    // Create 2-4 work orders for each of the first 50 work centers
    for (let wcIndex = 0; wcIndex < TOTAL_ROWS; wcIndex++) {
      const numOrders = 2 + Math.floor(Math.random() * 3); // 2-4 orders per work center

      for (let i = 0; i < numOrders; i++) {
        const year = 2025 + Math.floor(Math.random() * 2); // 2025 or 2026
        const month = Math.floor(Math.random() * 12);
        const day = 1 + Math.floor(Math.random() * 28);

        const startDate = new Date(year, month, day);
        const durationDays = 5 + Math.floor(Math.random() * 100); // 5-30 days
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        orders.push({
          id: `wo-${wcIndex}-${i}`,
          name: orderNames[Math.floor(Math.random() * orderNames.length)],
          workCenterId: `wc-${wcIndex}`,
          startDate,
          endDate,
        });
      }
    }

    return orders;
  }

  readonly workOrders: WorkOrder[] = this.generateWorkOrders();

  // Manually mocked work orders for testing
  /*readonly workOrders: WorkOrder[] = [
    // 2 work orders for wc-1
    {
      id: 'wo-1-1',
      name: 'Assembly Line A',
      workCenterId: 'wc-1',
      startDate: new Date(2026, 1, 10), // Feb 10, 2026
      endDate: new Date(2026, 1, 25),   // Feb 25, 2026
    },
    {
      id: 'wo-1-2',
      name: 'Quality Check C',
      workCenterId: 'wc-1',
      startDate: new Date(2026, 2, 5),  // Mar 5, 2026
      endDate: new Date(2026, 2, 20),   // Mar 20, 2026
    },
    // 3 work orders for wc-2
    {
      id: 'wo-2-1',
      name: 'Painting Job B',
      workCenterId: 'wc-2',
      startDate: new Date(2026, 1, 15), // Feb 15, 2026
      endDate: new Date(2026, 2, 5),    // Mar 5, 2026
    },
    {
      id: 'wo-2-2',
      name: 'Welding Task D',
      workCenterId: 'wc-2',
      startDate: new Date(2026, 2, 10), // Mar 10, 2026
      endDate: new Date(2026, 4, 28),   // Apr 28, 2026
    },
    {
      id: 'wo-2-3',
      name: 'Fabrication E',
      workCenterId: 'wc-2',
      startDate: new Date(2026, 6, 1),  // Jun 1, 2026
      endDate: new Date(2026, 7, 15),   // Jul 15, 2026
    },
  ];*/

  // Reactive date range — expanded as the user scrolls
  private visibleDateRange = signal<DateRange>({ start: new Date(), end: new Date() });

  // Months derived from the reactive date range
  allMonths = computed(() => {
    const range = this.visibleDateRange();
    const months: { label: string; year: number; month: number }[] = [];

    let current = new Date(range.start);
    current.setDate(1);
    current.setHours(0, 0, 0, 0);

    const names = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    while (current <= range.end) {
      months.push({
        label: `${names[current.getMonth()]} ${current.getFullYear()}`,
        year: current.getFullYear(),
        month: current.getMonth(),
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  });

  totalMonths = computed(() => this.allMonths().length);

  TOTAL_CONTENT_WIDTH = computed(() => {
    return this.totalMonths() * COLUMN_WIDTH;
  });

  // Pre-computed grid-template-columns string
  gridTemplateColumns = computed(() => {
    return `repeat(${this.totalMonths()}, ${COLUMN_WIDTH}px)`;
  });

  // Pre-computed map: workCenterId -> PositionedWorkOrder[]
  // Only includes orders that overlap the visible column range
  workOrdersByCenter = computed(() => {
    const months = this.allMonths();
    const { start: visStart, end: visEnd } = this.visibleColumnRange();
    const map = new Map<string, PositionedWorkOrder[]>();

    for (const wo of this.workOrders) {
      const position = this.calculateGridPosition(wo, months);
      if (!position) continue;

      // Skip bars entirely outside the visible viewport columns
      if (position.gridColumnEnd <= visStart || position.gridColumnStart >= visEnd) continue;

      let list = map.get(wo.workCenterId);
      if (!list) {
        list = [];
        map.set(wo.workCenterId, list);
      }
      list.push({ order: wo, position });
    }

    return map;
  });

  // Visible column range (1-based CSS grid lines, with buffer) — drives work order filtering
  private visibleColumnRange = signal({ start: 1, end: 1 });
  private lastRangeStart = 0;
  private lastRangeEnd = 0;

  private scrollListener: (() => void) | null = null;
  private bodyEl: HTMLElement | null = null;
  private headerEl: HTMLElement | null = null;
  private scrollThrottleActive = false;
  private isInitializing = true;

  constructor() {
    this.initializeVisibleRange();
  }

  private initializeVisibleRange() {
    const today = new Date();

    const start = new Date(today);
    start.setMonth(start.getMonth() - BUFFER_MONTHS);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setMonth(end.getMonth() + BUFFER_MONTHS);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);

    this.visibleDateRange.set({ start, end });
  }

  ngOnDestroy() {
    if (this.scrollListener && this.bodyEl) {
      this.bodyEl.removeEventListener('scroll', this.scrollListener);
    }
  }

  ngAfterViewInit() {
    this.bodyEl = this.bodyViewport.elementRef.nativeElement;
    this.headerEl = this.headerViewport.elementRef.nativeElement;

    this.scrollListener = () => {
      // Sync header horizontal scroll to body
      this.headerEl!.scrollLeft = this.bodyEl!.scrollLeft;

      if (!this.isInitializing) {
        // Check for edge expansion (infinite scroll)
        this.onHorizontalScroll();
        // Update visible column range for work order filtering
        this.checkVisibleColumnRange();
      }
    };

    this.zone.runOutsideAngular(() => {
      this.bodyEl!.addEventListener('scroll', this.scrollListener!);
    });

    this.scrollToToday();
  }

  private scrollToToday() {
    const today = new Date();
    const months = this.allMonths();
    const todayIndex = months.findIndex(
      (m) => m.year === today.getFullYear() && m.month === today.getMonth(),
    );
    if (todayIndex < 0) return;

    // Show 1 month before today as the first visible column
    const scrollPos = Math.max(0, (todayIndex - 1) * COLUMN_WIDTH);

    // Wait for CDK to render rows, then set scroll position
    this.bodyViewport.renderedRangeStream.pipe(take(1)).subscribe(() => {
      requestAnimationFrame(() => {
        this.bodyEl!.scrollLeft = scrollPos;
        this.headerEl!.scrollLeft = scrollPos;
        // Initialize visible column range so work orders render
        this.syncVisibleColumnRange();

        requestAnimationFrame(() => {
          this.isInitializing = false;
        });
      });
    });
  }

  private onHorizontalScroll() {
    if (this.scrollThrottleActive) return;

    const scrollLeft = this.bodyEl!.scrollLeft;
    const scrollWidth = this.bodyEl!.scrollWidth;
    const clientWidth = this.bodyEl!.clientWidth;

    const threshold = 8 * COLUMN_WIDTH;
    const needsExpandLeft = scrollLeft < threshold;
    const needsExpandRight = scrollLeft > scrollWidth - clientWidth - threshold;

    if (!needsExpandLeft && !needsExpandRight) return;

    this.scrollThrottleActive = true;

    requestAnimationFrame(() => {
      this.zone.run(() => {
        this.scrollThrottleActive = false;
        const monthsToExpand = 6;

        if (needsExpandLeft) {
          const current = this.visibleDateRange();
          const start = new Date(current.start);
          start.setMonth(start.getMonth() - monthsToExpand);

          this.visibleDateRange.set({ start, end: current.end });

          // Compensate scroll so viewport stays in place
          const addedWidth = monthsToExpand * COLUMN_WIDTH;
          this.bodyEl!.scrollLeft += addedWidth;
          this.headerEl!.scrollLeft = this.bodyEl!.scrollLeft;
          // Keep visible column range in sync for correct work order filtering
          this.syncVisibleColumnRange();
        }

        if (needsExpandRight) {
          const current = this.visibleDateRange();
          const end = new Date(current.end);
          end.setMonth(end.getMonth() + monthsToExpand);
          end.setDate(0);

          this.visibleDateRange.set({ start: current.start, end });
          this.syncVisibleColumnRange();
        }
      });
    });
  }

  /** Compute the visible column range from current scroll state. */
  private computeVisibleColumnRange(): { start: number; end: number } {
    const scrollLeft = this.bodyEl!.scrollLeft;
    const clientWidth = this.bodyEl!.clientWidth;
    const BUFFER = 5; // extra months each side
    const firstCol = Math.max(1, Math.floor(scrollLeft / COLUMN_WIDTH) + 1 - BUFFER);
    const lastCol = Math.ceil((scrollLeft + clientWidth) / COLUMN_WIDTH) + 1 + BUFFER;
    return { start: firstCol, end: lastCol };
  }

  /** Called from scroll handler (outside zone). Only enters zone when range shifts by ≥2 columns. */
  private checkVisibleColumnRange() {
    const range = this.computeVisibleColumnRange();
    if (
      Math.abs(range.start - this.lastRangeStart) < 2 &&
      Math.abs(range.end - this.lastRangeEnd) < 2
    ) {
      return;
    }
    this.lastRangeStart = range.start;
    this.lastRangeEnd = range.end;
    this.zone.run(() => {
      this.visibleColumnRange.set(range);
    });
  }

  /** Immediately sync the signal (called from expansion/init already inside zone). */
  private syncVisibleColumnRange() {
    const range = this.computeVisibleColumnRange();
    this.lastRangeStart = range.start;
    this.lastRangeEnd = range.end;
    this.visibleColumnRange.set(range);
  }

  // Calculate grid-column position for a work order
  private calculateGridPosition(
    wo: WorkOrder,
    months: { year: number; month: number }[],
  ): WorkOrderGridPosition | null {
    if (months.length === 0) return null;

    // Find start month index
    const startIdx = months.findIndex(
      (m) => m.year === wo.startDate.getFullYear() && m.month === wo.startDate.getMonth(),
    );

    // Find end month index
    const endIdx = months.findIndex(
      (m) => m.year === wo.endDate.getFullYear() && m.month === wo.endDate.getMonth(),
    );

    // Work order is entirely outside the visible range
    if (startIdx === -1 && endIdx === -1) return null;

    // Clamp indices if work order partially extends beyond range
    const clampedStartIdx = startIdx === -1 ? 0 : startIdx;
    const clampedEndIdx = endIdx === -1 ? months.length - 1 : endIdx;

    // Sub-month offset for start
    const daysInStartMonth = new Date(
      wo.startDate.getFullYear(),
      wo.startDate.getMonth() + 1,
      0,
    ).getDate();
    const marginLeftPx =
      startIdx === -1 ? 0 : ((wo.startDate.getDate() - 1) / daysInStartMonth) * COLUMN_WIDTH;

    // Sub-month offset for end
    const daysInEndMonth = new Date(
      wo.endDate.getFullYear(),
      wo.endDate.getMonth() + 1,
      0,
    ).getDate();
    const marginRightPx =
      endIdx === -1 ? 0 : ((daysInEndMonth - wo.endDate.getDate()) / daysInEndMonth) * COLUMN_WIDTH;

    // CSS grid lines are 1-based; gridColumnEnd is exclusive
    const gridColumnStart = clampedStartIdx + 1;
    const gridColumnEnd = clampedEndIdx + 2;

    // Enforce minimum visible width (60px)
    const totalSpanPx = (gridColumnEnd - gridColumnStart) * COLUMN_WIDTH;
    const visibleWidth = totalSpanPx - marginLeftPx - marginRightPx;
    const adjustedMarginRight =
      visibleWidth < 60 ? Math.max(0, totalSpanPx - marginLeftPx - 60) : marginRightPx;

    return {
      gridColumnStart,
      gridColumnEnd,
      marginLeftPx: Math.round(marginLeftPx * 100) / 100,
      marginRightPx: Math.round(adjustedMarginRight * 100) / 100,
    };
  }

  // Template helper: simple map lookup
  getPositionedOrders(workCenterId: string): PositionedWorkOrder[] {
    return this.workOrdersByCenter().get(workCenterId) ?? [];
  }

  trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  trackByLabel(_index: number, item: { label: string }) {
    return item.label;
  }

  trackByPositionedOrder(_index: number, item: PositionedWorkOrder) {
    return item.order.id;
  }
}
