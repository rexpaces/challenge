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
  input,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { take } from 'rxjs';

interface DateRange {
  start: Date;
  end: Date;
}

interface TimeUnit {
  label: string;
  start: Date;
  end: Date;
  type: 'day' | 'week' | 'month';
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
const TOTAL_ROWS = 10;
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

  // Timescale input
  timescale = input<'Day' | 'Week' | 'Month'>('Month');

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

  // Time units derived from the reactive date range and timescale
  allTimeUnits = computed(() => {
    console.log('allTimeUnits');
    const range = this.visibleDateRange();
    const timescale = this.timescale();
    const units: TimeUnit[] = [];

    if (timescale === 'Month') {
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
        const monthStart = new Date(current);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);

        units.push({
          label: `${names[current.getMonth()]} ${current.getFullYear()}`,
          start: monthStart,
          end: monthEnd,
          type: 'month',
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (timescale === 'Week') {
      let current = new Date(range.start);
      // Start from the beginning of the week (Sunday)
      const day = current.getDay();
      current.setDate(current.getDate() - day);
      current.setHours(0, 0, 0, 0);

      while (current <= range.end) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const startStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
        const endStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

        units.push({
          label: `${startStr}-${endStr}`,
          start: weekStart,
          end: weekEnd,
          type: 'week',
        });
        current.setDate(current.getDate() + 7);
      }
    } else if (timescale === 'Day') {
      let current = new Date(range.start);
      current.setHours(0, 0, 0, 0);

      while (current <= range.end) {
        const dayStart = new Date(current);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        units.push({
          label: `${monthNames[current.getMonth()]} ${current.getDate()}`,
          start: dayStart,
          end: dayEnd,
          type: 'day',
        });
        current.setDate(current.getDate() + 1);
      }
    }

    return units;
  });

  totalTimeUnits = computed(() => this.allTimeUnits().length);

  TOTAL_CONTENT_WIDTH = computed(() => {
    return this.totalTimeUnits() * COLUMN_WIDTH;
  });

  // Pre-computed grid-template-columns string
  gridTemplateColumns = computed(() => {
    return `repeat(${this.totalTimeUnits()}, ${COLUMN_WIDTH}px)`;
  });

  // Pre-computed map: workCenterId -> PositionedWorkOrder[]
  // Only recomputes when allTimeUnits changes (timescale or date range change), not on scroll.
  // Off-screen elements are handled by the browser's native paint optimization.
  workOrdersByCenter = computed(() => {
    console.log('workOrdersByCenter');
    const timeUnits = this.allTimeUnits();
    const map = new Map<string, PositionedWorkOrder[]>();

    for (const wo of this.workOrders) {
      const position = this.calculateGridPosition(wo, timeUnits);
      if (!position) continue;

      let list = map.get(wo.workCenterId);
      if (!list) {
        list = [];
        map.set(wo.workCenterId, list);
      }
      list.push({ order: wo, position });
    }

    return map;
  });

  // Pre-computed rows: each work center paired with its positioned orders.
  // CDK virtual scroll iterates this directly — no per-row lookups during CD.
  readonly rows = computed(() => {
    const ordersByCenter = this.workOrdersByCenter();
    return this.workCenters.map(wc => ({
      id: wc.id,
      name: wc.name,
      orders: ordersByCenter.get(wc.id) ?? [],
    }));
  });

  private scrollListener: (() => void) | null = null;
  private bodyEl: HTMLElement | null = null;
  private headerEl: HTMLElement | null = null;
  private scrollThrottleActive = false;
  private isInitializing = true;

  private previousTimescale: 'Day' | 'Week' | 'Month' = 'Month';

  constructor() {
    this.initializeVisibleRange();

    // Reinitialize the visible range when timescale changes
    effect(() => {
      const newTimescale = this.timescale();
      if (!this.isInitializing) {
        // Compute the exact date at the scroll edge using the OLD timescale.
        // visibleDateRange hasn't changed yet, and previousTimescale holds the old value.
        const targetDate = this.getScrollEdgeDate();

        this.initializeVisibleRange(targetDate);

        // Scroll so the same date is the first visible column in the new timescale
        requestAnimationFrame(() => {
          this.scrollToDate(targetDate);
        });
      }
      this.previousTimescale = newTimescale;
    });
  }

  private initializeVisibleRange(centerDate?: Date) {
    const anchor = centerDate ?? new Date();
    const timescale = this.timescale();

    const start = new Date(anchor);
    const end = new Date(anchor);

    if (timescale === 'Month') {
      start.setMonth(start.getMonth() - BUFFER_MONTHS);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      end.setMonth(end.getMonth() + BUFFER_MONTHS);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (timescale === 'Week') {
      // Buffer: ~6 months worth of weeks (26 weeks each direction)
      start.setDate(start.getDate() - 26 * 7);
      // Start from beginning of week (Sunday)
      const startDay = start.getDay();
      start.setDate(start.getDate() - startDay);
      start.setHours(0, 0, 0, 0);

      end.setDate(end.getDate() + 26 * 7);
      // End at end of week (Saturday)
      const endDay = end.getDay();
      end.setDate(end.getDate() + (6 - endDay));
      end.setHours(23, 59, 59, 999);
    } else if (timescale === 'Day') {
      // Buffer: ~6 months worth of days (180 days each direction)
      start.setDate(start.getDate() - 180);
      start.setHours(0, 0, 0, 0);

      end.setDate(end.getDate() + 180);
      end.setHours(23, 59, 59, 999);
    }

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
      }
    };

    this.zone.runOutsideAngular(() => {
      this.bodyEl!.addEventListener('scroll', this.scrollListener!);
    });

    this.scrollToToday();
  }

  /**
   * Compute the exact date at the scrollLeft edge using the OLD timescale
   * and the current (unchanged) visibleDateRange. Includes the sub-column
   * fractional offset so the position maps precisely to the new timescale.
   */
  private getScrollEdgeDate(): Date {
    const scrollLeft = this.bodyEl!.scrollLeft;
    const colIdx = Math.floor(scrollLeft / COLUMN_WIDTH);
    const fractionInCol = (scrollLeft - colIdx * COLUMN_WIDTH) / COLUMN_WIDTH;

    const range = untracked(() => this.visibleDateRange());

    // Compute start and end of the column at colIdx
    let colStart: Date;
    let colEnd: Date;

    if (this.previousTimescale === 'Month') {
      colStart = new Date(range.start);
      colStart.setDate(1);
      colStart.setHours(0, 0, 0, 0);
      colStart.setMonth(colStart.getMonth() + colIdx);

      colEnd = new Date(colStart);
      colEnd.setMonth(colEnd.getMonth() + 1);
    } else if (this.previousTimescale === 'Week') {
      colStart = new Date(range.start);
      colStart.setDate(colStart.getDate() - colStart.getDay());
      colStart.setHours(0, 0, 0, 0);
      colStart.setDate(colStart.getDate() + colIdx * 7);

      colEnd = new Date(colStart);
      colEnd.setDate(colEnd.getDate() + 7);
    } else {
      colStart = new Date(range.start);
      colStart.setHours(0, 0, 0, 0);
      colStart.setDate(colStart.getDate() + colIdx);

      colEnd = new Date(colStart);
      colEnd.setDate(colEnd.getDate() + 1);
    }

    // Interpolate within the column to get the exact date
    const dateMs = colStart.getTime() + fractionInCol * (colEnd.getTime() - colStart.getTime());
    return new Date(dateMs);
  }

  /** Scroll so that targetDate is at the left edge, with sub-column precision. */
  private scrollToDate(targetDate: Date) {
    const timeUnits = this.allTimeUnits();

    // Find the time unit that contains the target date
    const targetIndex = timeUnits.findIndex(
      (unit) => targetDate >= unit.start && targetDate <= unit.end,
    );
    if (targetIndex < 0) return;

    // Calculate sub-column offset within the target unit
    const unit = timeUnits[targetIndex];
    const unitDurationMs = unit.end.getTime() - unit.start.getTime();
    const offsetFraction = (targetDate.getTime() - unit.start.getTime()) / unitDurationMs;

    const scrollPos = (targetIndex + offsetFraction) * COLUMN_WIDTH;
    this.bodyEl!.scrollLeft = scrollPos;
    this.headerEl!.scrollLeft = scrollPos;
  }

  private scrollToToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeUnits = this.allTimeUnits();

    // Find the time unit that contains today
    const todayIndex = timeUnits.findIndex(
      (unit) => today >= unit.start && today <= unit.end,
    );
    if (todayIndex < 0) return;

    // Show 1 unit before today as the first visible column
    const scrollPos = Math.max(0, (todayIndex - 1) * COLUMN_WIDTH);

    // Wait for CDK to render rows, then set scroll position
    this.bodyViewport.renderedRangeStream.pipe(take(1)).subscribe(() => {
      requestAnimationFrame(() => {
        this.bodyEl!.scrollLeft = scrollPos;
        this.headerEl!.scrollLeft = scrollPos;
        // Initialize visible column range so work orders render


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
        const timescale = this.timescale();

        // Determine expansion amount based on timescale
        let unitsToExpand = 6;
        if (timescale === 'Month') {
          unitsToExpand = 6; // 6 months
        } else if (timescale === 'Week') {
          unitsToExpand = 12; // 12 weeks (~3 months)
        } else if (timescale === 'Day') {
          unitsToExpand = 60; // 60 days (~2 months)
        }

        if (needsExpandLeft) {
          const current = this.visibleDateRange();
          const start = new Date(current.start);

          if (timescale === 'Month') {
            start.setMonth(start.getMonth() - unitsToExpand);
          } else if (timescale === 'Week') {
            start.setDate(start.getDate() - unitsToExpand * 7);
          } else if (timescale === 'Day') {
            start.setDate(start.getDate() - unitsToExpand);
          }

          this.visibleDateRange.set({ start, end: current.end });

          // Compensate scroll so viewport stays in place
          const addedWidth = unitsToExpand * COLUMN_WIDTH;
          this.bodyEl!.scrollLeft += addedWidth;
          this.headerEl!.scrollLeft = this.bodyEl!.scrollLeft;
          // Keep visible column range in sync for correct work order filtering

        }

        if (needsExpandRight) {
          const current = this.visibleDateRange();
          const end = new Date(current.end);

          if (timescale === 'Month') {
            end.setMonth(end.getMonth() + unitsToExpand);
            end.setDate(0);
          } else if (timescale === 'Week') {
            end.setDate(end.getDate() + unitsToExpand * 7);
          } else if (timescale === 'Day') {
            end.setDate(end.getDate() + unitsToExpand);
          }

          this.visibleDateRange.set({ start: current.start, end });

        }
      });
    });
  }


  // Calculate grid-column position for a work order
  private calculateGridPosition(
    wo: WorkOrder,
    timeUnits: TimeUnit[],
  ): WorkOrderGridPosition | null {
    if (timeUnits.length === 0) return null;

    // Find start time unit index (unit that contains the start date)
    const startIdx = timeUnits.findIndex(
      (unit) => wo.startDate >= unit.start && wo.startDate <= unit.end,
    );

    // Find end time unit index (unit that contains the end date)
    const endIdx = timeUnits.findIndex(
      (unit) => wo.endDate >= unit.start && wo.endDate <= unit.end,
    );

    // Work order is entirely outside the visible range
    if (startIdx === -1 && endIdx === -1) return null;

    // Clamp indices if work order partially extends beyond range
    const clampedStartIdx = startIdx === -1 ? 0 : startIdx;
    const clampedEndIdx = endIdx === -1 ? timeUnits.length - 1 : endIdx;

    // Calculate sub-unit offset for start
    let marginLeftPx = 0;
    if (startIdx !== -1) {
      const startUnit = timeUnits[startIdx];
      const unitDurationMs = startUnit.end.getTime() - startUnit.start.getTime();
      const offsetMs = wo.startDate.getTime() - startUnit.start.getTime();
      marginLeftPx = (offsetMs / unitDurationMs) * COLUMN_WIDTH;
    }

    // Calculate sub-unit offset for end
    let marginRightPx = 0;
    if (endIdx !== -1) {
      const endUnit = timeUnits[endIdx];
      const unitDurationMs = endUnit.end.getTime() - endUnit.start.getTime();
      const offsetMs = endUnit.end.getTime() - wo.endDate.getTime();
      marginRightPx = (offsetMs / unitDurationMs) * COLUMN_WIDTH;
    }

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
