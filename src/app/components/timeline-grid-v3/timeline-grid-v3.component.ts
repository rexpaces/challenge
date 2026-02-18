import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  NgZone,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import {
  DateRange,
  getTimeScaleDateRange,
  getTimeUnits,
  TIME_SCALES,
  TimeUnit,
} from './timeunits/timeunits';
import { WorkCenterService, WorkCenterWithOrders } from '../../services/workcenters.service';
import { WorkOrderDocument } from '../../../model';
import { Subscription, take } from 'rxjs';
import { WorkOrderBarComponent } from '../work-order-bar/work-order-bar.component';
import { GridTrackHoverDirective } from './grid-track-hover.directive';
import { WorkOrderPanelService } from '../../services/work-order-panel.service';

const COLUMN_WIDTH = 113;
const ROW_HEIGHT = 48;
const DESKTOP_LEFT_PANEL_WIDTH = 382;
const MOBILE_LEFT_PANEL_WIDTH = 230;

export interface PositionedWorkOrder {
  order: WorkOrderDocument;
  gridColumnStart: number;
  gridColumnEnd: number;
  marginLeftPx: number;
  marginRightPx: number;
}

@Component({
  selector: 'app-timeline-grid-v3',
  standalone: true,
  imports: [CommonModule, ScrollingModule, WorkOrderBarComponent, GridTrackHoverDirective],
  templateUrl: './timeline-grid-v3.component.html',
  styleUrl: './timeline-grid-v3.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineGridV3Component implements AfterViewInit, OnDestroy {
  @ViewChild('bodyViewport') bodyViewport!: CdkVirtualScrollViewport;
  @ViewChild('headerViewport') headerViewport!: CdkVirtualScrollViewport;

  // Timescale input
  timescale = input<'Day' | 'Week' | 'Month'>('Month');

  readonly COLUMN_WIDTH = COLUMN_WIDTH;
  readonly ROW_HEIGHT = ROW_HEIGHT;

  private workCenterService = inject(WorkCenterService);
  private workOrderPanelService = inject(WorkOrderPanelService);
  private isInitializing = true;
  private previousTimescale = TIME_SCALES.MONTH;
  private currentDateRange!: DateRange;
  private previousDateRange!: DateRange;
  private scrollerPositionAtDate = new Date();
  private currentTimescale = TIME_SCALES.MONTH;

  workCenters = this.workCenterService.workCenters;

  private bodyEl: HTMLElement | null = null;
  private zone = inject(NgZone);
  private scrollListener: (() => void) | null = null;
  private resizeListener: (() => void) | null = null;
  private rangeSubscription: Subscription | null = null;

  // Track window width for responsive left panel width
  private windowWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);

  leftPanelWidth = computed(() => {
    this.windowWidth(); // Track changes
    return typeof window !== 'undefined' && window.innerWidth <= 768
      ? MOBILE_LEFT_PANEL_WIDTH
      : DESKTOP_LEFT_PANEL_WIDTH;
  });

  readonly LEFT_PANEL_WIDTH = computed(() => this.leftPanelWidth());

  private _renderedRange = signal<{ start: number; end: number }>({ start: 0, end: 0 });

  private _timeUnits = signal<TimeUnit[]>([]);
  timeUnits = this._timeUnits.asReadonly();

  /** Pre-computed map: workCenterId → positioned work orders within current date range.
   *  Only processes work centers currently rendered by the CDK viewport. */
  positionedOrdersByCenter = computed(() => {
    const units = this.timeUnits();
    const centers = this.workCenters();
    const { start, end } = this._renderedRange();
    if (!units.length || !centers.length) return new Map<string, PositionedWorkOrder[]>();

    const rangeStart = units[0].start;
    const rangeEnd = units[units.length - 1].end;

    const map = new Map<string, PositionedWorkOrder[]>();
    const visibleWorkCenters = centers.slice(start, end);
    for (const wc of visibleWorkCenters ) {
      const positioned: PositionedWorkOrder[] = [];
      for (const wo of wc.workOrders) {
        const woStart = new Date(wo.data.startDate);
        const woEnd = new Date(wo.data.endDate);

        // Skip work orders outside the visible date range
        if (woEnd < rangeStart || woStart > rangeEnd) continue;

        const pos = this.computePosition(woStart, woEnd, units);
        if (pos) {
          positioned.push({ order: wo, ...pos });
        }
      }
      map.set(wc.docId, positioned);
    }

    return map;
  });

  constructor() {
    // Initialise with the default timescale so derived signals have data immediately
    this.currentDateRange = getTimeScaleDateRange(TIME_SCALES.MONTH, this.scrollerPositionAtDate);
    this._timeUnits.set(getTimeUnits(TIME_SCALES.MONTH, this.currentDateRange));

    effect(() => {
      const saved = this.workCenterService.lastSavedWorkOrder();
      if (!saved || !this.bodyEl) return;

      const startDate = new Date(saved.data.startDate);
      this.scrollerPositionAtDate = startDate;
      this.scrollToDate(startDate, this.timeUnits());
    });

    effect(() => {
      const newTimescale = this.timescale();

      // Rotate bookkeeping: current → previous
      this.previousTimescale = this.currentTimescale;
      this.previousDateRange = this.currentDateRange;
      this.currentTimescale = newTimescale;

      // Capture scroll position using the previous timescale/range
      // (only possible after the first render when bodyEl exists)
      if (!this.isInitializing && this.bodyEl && this.previousDateRange) {
        this.scrollerPositionAtDate = this.getScrollEdgeDate();
      }

      // Recompute date range and time units for the new timescale
      const newRange = getTimeScaleDateRange(newTimescale, this.scrollerPositionAtDate);
      this.currentDateRange = newRange;
      const units = getTimeUnits(newTimescale, newRange);
      this._timeUnits.set(units);

      // Restore scroll position after the DOM updates (skip during init)
      if (!this.isInitializing && this.bodyEl) {
        requestAnimationFrame(() => {
          this.scrollToDate(this.scrollerPositionAtDate, units);
        });
      }
    }, { allowSignalWrites: true });
  }

  totalTimeUnits = computed(() => this.timeUnits().length);

  totalContentWidth = computed(() => this.totalTimeUnits() * COLUMN_WIDTH);

  gridTemplateColumns = computed(() => `repeat(${this.totalTimeUnits()}, ${COLUMN_WIDTH}px)`);

  horizontalRowWidth = computed(() => this.leftPanelWidth() + this.totalContentWidth());

  /** 1-based CSS grid column of the time unit that contains "now", or -1 */
  currentTimeUnitColumn = computed(() => {
    console.log('currentTimeUnitColumn');
    const units = this.timeUnits();
    const now = new Date();
    const idx = units.findIndex((u) => now >= u.start && now <= u.end);
    return idx >= 0 ? idx + 1 : -1;
  });

  /** Label for the current-time marker */
  currentTimeUnitLabel = computed(() => {
    console.log('currentTimeUnitLabel');
    const col = this.currentTimeUnitColumn();
    if (col === -1) return '';
    const unit = this.timeUnits()[col - 1];
    switch (unit.type) {
      case 'month': return 'Current month';
      case 'week':  return 'Current week';
      case 'day':   return 'Current day';
    }
  });

  ngAfterViewInit() {
    this.bodyEl = this.bodyViewport.elementRef.nativeElement;

    this.zone.runOutsideAngular(() => {
      let ticking = false;
      let lastScrollLeft = 0;
      this.scrollListener = () => {
        const currentLeft = this.bodyEl!.scrollLeft;
        if (lastScrollLeft !== currentLeft) {
          if (!ticking) {
            window.requestAnimationFrame(() => {
              const scrollLeft = this.bodyEl!.scrollLeft;
              this.headerViewport.scrollToOffset(scrollLeft);
              ticking = false;
            });
            ticking = true;
          }
          lastScrollLeft = currentLeft;
        }
      };
      this.bodyEl!.addEventListener('scroll', this.scrollListener, { passive: true });

      // Listen for window resize to update responsive left panel width
      this.resizeListener = () => {
        this.windowWidth.set(window.innerWidth);
      };
      window.addEventListener('resize', this.resizeListener);
    });

    this.rangeSubscription = this.bodyViewport.renderedRangeStream.subscribe((range) => {
      this._renderedRange.set(range);
    });

    this.setScrollOnCurrentDate();
  }

  ngOnDestroy() {
    if (this.scrollListener && this.bodyEl) {
      this.bodyEl.removeEventListener('scroll', this.scrollListener);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.rangeSubscription?.unsubscribe();
  }

  trackByTimeUnitId(_index: number, item: TimeUnit) {
    return item.id;
  }

  trackByWorkCenterId(_index: number, workCenter: WorkCenterWithOrders) {
    return workCenter.docId;
  }

  trackByPositionedOrder(_index: number, item: PositionedWorkOrder) {
    return item.order.docId;
  }

  openWorkOrderPanel(context: { x: number; timeUnitIndex: number }, workCenter: WorkCenterWithOrders) {
    const timeUnit = this.timeUnits()[context.timeUnitIndex];
    this.workOrderPanelService.open(workCenter, timeUnit?.start);
  }

  onEditWorkOrder(order: WorkOrderDocument, workCenter: WorkCenterWithOrders) {
    this.workOrderPanelService.openForEdit(workCenter, order);
  }

  onDeleteWorkOrder(order: WorkOrderDocument) {
    this.workCenterService.deleteWorkOrder(order.docId);
  }

  private computePosition(
    woStart: Date,
    woEnd: Date,
    units: TimeUnit[],
  ): { gridColumnStart: number; gridColumnEnd: number; marginLeftPx: number; marginRightPx: number } | null {
    // Find the first unit that overlaps with the work order
    const startIdx = units.findIndex((u) => woStart < u.end && woEnd > u.start);
    if (startIdx < 0) return null;

    // Find the last unit that overlaps
    let endIdx = startIdx;
    for (let i = startIdx; i < units.length; i++) {
      if (units[i].start > woEnd) break;
      endIdx = i;
    }

    // Calculate sub-column margins
    const startUnit = units[startIdx];
    const endUnit = units[endIdx];

    const startUnitDuration = startUnit.end.getTime() - startUnit.start.getTime();
    const endUnitDuration = endUnit.end.getTime() - endUnit.start.getTime();

    // Left margin: how far into the first column does the WO start?
    const clampedStart = Math.max(woStart.getTime(), startUnit.start.getTime());
    const marginLeftFraction = (clampedStart - startUnit.start.getTime()) / startUnitDuration;
    const marginLeftPx = Math.round(marginLeftFraction * COLUMN_WIDTH);

    // Right margin: how much of the last column is after the WO ends?
    const clampedEnd = Math.min(woEnd.getTime(), endUnit.end.getTime());
    const marginRightFraction = (endUnit.end.getTime() - clampedEnd) / endUnitDuration;
    const marginRightPx = Math.round(marginRightFraction * COLUMN_WIDTH);

    // CSS grid columns are 1-indexed
    return {
      gridColumnStart: startIdx + 1,
      gridColumnEnd: endIdx + 2,
      marginLeftPx,
      marginRightPx,
    };
  }

  private scrollToDate(targetDate: Date, timeUnits: TimeUnit[]) {
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
  }

  private setScrollOnCurrentDate() {
    if (!this.isInitializing) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const units = this.timeUnits();

    // Find the time unit that contains today
    const todayIndex = units.findIndex((unit) => today >= unit.start && today <= unit.end);
    if (todayIndex < 0) return;

    // Show 1 unit before today as the first visible column
    const scrollPos = Math.max(0, (todayIndex - 1) * COLUMN_WIDTH);

    // Wait for CDK to render rows, then set scroll position
    this.bodyViewport.renderedRangeStream.pipe(take(1)).subscribe(() => {
      requestAnimationFrame(() => {
        this.bodyEl!.scrollLeft = scrollPos;
        requestAnimationFrame(() => {
          this.isInitializing = false;
        });
      });
    });
  }

  private getScrollEdgeDate(): Date {
    const scrollLeft = this.bodyEl!.scrollLeft;
    const colIdx = Math.floor(scrollLeft / COLUMN_WIDTH);
    const fractionInCol = (scrollLeft - colIdx * COLUMN_WIDTH) / COLUMN_WIDTH;

    // Compute start and end of the column at colIdx
    let colStart: Date;
    let colEnd: Date;
    if (this.previousTimescale === TIME_SCALES.MONTH) {
      colStart = new Date(this.previousDateRange.start);
      colStart.setDate(1);
      colStart.setHours(0, 0, 0, 0);
      colStart.setMonth(colStart.getMonth() + colIdx);

      colEnd = new Date(colStart);
      colEnd.setMonth(colEnd.getMonth() + 1);
    } else if (this.previousTimescale === TIME_SCALES.WEEK) {
      colStart = new Date(this.previousDateRange.start);
      colStart.setDate(colStart.getDate() - colStart.getDay());
      colStart.setHours(0, 0, 0, 0);
      colStart.setDate(colStart.getDate() + colIdx * 7);

      colEnd = new Date(colStart);
      colEnd.setDate(colEnd.getDate() + 7);
    } else {
      colStart = new Date(this.previousDateRange.start);
      colStart.setHours(0, 0, 0, 0);
      colStart.setDate(colStart.getDate() + colIdx);

      colEnd = new Date(colStart);
      colEnd.setDate(colEnd.getDate() + 1);
    }

    // Interpolate within the column to get the exact date
    const dateMs = colStart.getTime() + fractionInCol * (colEnd.getTime() - colStart.getTime());
    return new Date(dateMs);
  }
}
