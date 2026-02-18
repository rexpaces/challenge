import { AfterViewInit, Component, provideZonelessChangeDetection, signal, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineGridV3Component } from './timeline-grid-v3.component';
import { WorkOrderPanelComponent } from '../work-order-panel/work-order-panel.component';
import { WorkOrderDocument } from '../../../model';
import { WorkCenterService, WorkCenterWithOrders } from '../../services/workcenters.service';
import { WorkOrderPanelService } from '../../services/work-order-panel.service';
import { BUFFER_MONTHS } from './timeunits/timeunits';

// ── Test data ──────────────────────────────────────────────────────────────────

// Work order: Jan 17 2026 01:00 → Feb 10 2026 23:23 (local time)
const WO_START_DATE = new Date(2026, 0, 17, 1, 0, 0);
const WO_END_DATE = new Date(2026, 1, 10, 23, 23, 0);

const TEST_CENTERS: WorkCenterWithOrders[] = [
  {
    docId: 'wc-1',
    docType: 'workCenter',
    data: { name: 'Assembly Line A' },
    workOrders: [
      {
        docId: 'wo-1',
        docType: 'workOrder',
        data: {
          name: 'Jan–Feb Order',
          workCenterId: 'wc-1',
          status: 'in-progress',
          startDate: WO_START_DATE.toISOString(),
          endDate: WO_END_DATE.toISOString(),
        },
      },
    ],
  },
];

// ── Mock service (synchronous, with update support) ─────────────────────────

class MockWorkCenterService {
  private _workCenters = signal<WorkCenterWithOrders[]>(
    TEST_CENTERS.map((wc) => ({ ...wc, workOrders: [...wc.workOrders] })),
  );
  readonly workCenters = this._workCenters.asReadonly();
  readonly lastSavedWorkOrder = signal<WorkOrderDocument | null>(null);

  addWorkOrder(order: WorkOrderDocument): void {
    const centers = this._workCenters();
    const idx = centers.findIndex((wc) => wc.docId === order.data.workCenterId);
    if (idx < 0) return;
    const updated = centers.map((wc, i) =>
      i === idx ? { ...wc, workOrders: [...wc.workOrders, order] } : wc,
    );
    this._workCenters.set(updated);
    this.lastSavedWorkOrder.set(order);
  }

  updateWorkOrder(order: WorkOrderDocument): void {
    const centers = this._workCenters();
    const updated = centers.map((wc) => {
      const hasOrder = wc.workOrders.some((o) => o.docId === order.docId);
      if (!hasOrder) return wc;
      return {
        ...wc,
        workOrders: wc.workOrders.map((o) => (o.docId === order.docId ? order : o)),
      };
    });
    this._workCenters.set(updated);
    this.lastSavedWorkOrder.set(order);
  }

  deleteWorkOrder(docId: string): void {
    const updated = this._workCenters().map((wc) => ({
      ...wc,
      workOrders: wc.workOrders.filter((o) => o.docId !== docId),
    }));
    this._workCenters.set(updated);
  }

  getOrdersForCenter(workCenterId: string): WorkOrderDocument[] {
    return this.workCenters().find((wc) => wc.docId === workCenterId)?.workOrders ?? [];
  }

  hasOverlapOnCenter(): boolean {
    // No overlap in this test scenario (single work order)
    return false;
  }
}

// ── Test host ───────────────────────────────────────────────────────────────────

@Component({
  template: `
    <div style="width: 1200px; height: 600px; display: block; position: relative;">
      <app-timeline-grid-v3 [timescale]="timescale()" />
      <app-work-order-panel />
    </div>
  `,
  standalone: true,
  imports: [TimelineGridV3Component, WorkOrderPanelComponent],
})
class TestHostComponent implements AfterViewInit {
  timescale = signal<'Day' | 'Week' | 'Month'>('Month');

  @ViewChild(WorkOrderPanelComponent) panel!: WorkOrderPanelComponent;
  @ViewChild(TimelineGridV3Component) grid!: TimelineGridV3Component;

  private panelService: WorkOrderPanelService;

  constructor(panelService: WorkOrderPanelService) {
    this.panelService = panelService;
  }

  ngAfterViewInit() {
    this.panelService.setPanel(this.panel);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

const COLUMN_WIDTH = 113;

function waitForRAF(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

function wait(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stabilize(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await waitForRAF();
  await wait();
  fixture.detectChanges();
  await fixture.whenStable();
}

function bodyViewport(el: HTMLElement): HTMLElement {
  return el.querySelector('cdk-virtual-scroll-viewport.grid-viewport') as HTMLElement;
}

function headerLabels(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.date-column-header')).map(
    (node) => (node as HTMLElement).textContent?.trim() ?? '',
  );
}

function getBar(el: HTMLElement): HTMLElement {
  return el.querySelector('app-work-order-bar') as HTMLElement;
}

function parseGridColumn(bar: HTMLElement): { start: number; end: number } {
  const [startStr, endStr] = bar.style.gridColumn.split('/').map((s) => s.trim());
  return { start: parseInt(startStr, 10), end: parseInt(endStr, 10) };
}

/** Scroll Month view to Jan 2026 (left edge). */
function scrollToJan2026(body: HTMLElement): void {
  const monthRangeStart = new Date();
  monthRangeStart.setMonth(monthRangeStart.getMonth() - BUFFER_MONTHS);
  monthRangeStart.setDate(1);
  monthRangeStart.setHours(0, 0, 0, 0);

  const jan2026 = new Date(2026, 0, 1);
  const monthsToJan =
    (jan2026.getFullYear() - monthRangeStart.getFullYear()) * 12 +
    (jan2026.getMonth() - monthRangeStart.getMonth());

  body.scrollLeft = monthsToJan * COLUMN_WIDTH;
  body.dispatchEvent(new Event('scroll'));
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('TimelineGridV3 ↔ WorkOrderPanel integration', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: WorkCenterService, useClass: MockWorkCenterService },
        WorkOrderPanelService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    await stabilize(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('should render the initial work order bar spanning Jan–Feb in Month view', async () => {
    const body = bodyViewport(el);
    scrollToJan2026(body);
    await stabilize(fixture);

    const bar = getBar(el);
    expect(bar).withContext('work order bar should be rendered').toBeTruthy();

    // Bar should span 2 month columns (Jan and Feb)
    const { start, end } = parseGridColumn(bar);
    expect(end - start)
      .withContext('bar should span exactly 2 columns (Jan + Feb)')
      .toBe(2);

    // marginLeft > 0 because WO starts Jan 17 01:00, not Jan 1
    const marginLeft = parseFloat(bar.style.marginLeft);
    expect(marginLeft)
      .withContext('marginLeft should be > 0 (WO starts Jan 17, not Jan 1)')
      .toBeGreaterThan(0);

    // marginRight > 0 because WO ends Feb 10 23:23, not Feb 28
    const marginRight = parseFloat(bar.style.marginRight);
    expect(marginRight)
      .withContext('marginRight should be > 0 (WO ends Feb 10, not end of Feb)')
      .toBeGreaterThan(0);
  });

  it('should increase bar size after updating end date from Feb 10 23:23 to Feb 15 00:00 via the panel', async () => {
    const body = bodyViewport(el);
    scrollToJan2026(body);
    await stabilize(fixture);

    // ── Record initial bar margin ────────────────────────────────────────────
    let bar = getBar(el);
    expect(bar).withContext('bar should exist before edit').toBeTruthy();
    const initialMarginRight = parseFloat(bar.style.marginRight);

    // ── Open panel for edit ──────────────────────────────────────────────────
    const panel = host.panel;
    const workCenter = TEST_CENTERS[0];
    const workOrder = workCenter.workOrders[0];

    panel.openForEdit(workCenter, workOrder);
    await stabilize(fixture);

    expect(panel.isEditMode()).withContext('panel should be in edit mode').toBe(true);
    expect(panel.isOpen()).withContext('panel should be open').toBe(true);

    // Verify form was populated with the original times
    expect(panel.form.get('startTime')!.value)
      .withContext('start time should show 01:00')
      .toBe('01:00');
    expect(panel.form.get('endTime')!.value)
      .withContext('end time should show 23:23')
      .toBe('23:23');

    // ── Update end date to Feb 15, 00:00 ─────────────────────────────────────
    panel.form.patchValue({
      endDate: '2026-02-15',
      endTime: '00:00',
    });
    fixture.detectChanges();

    // Wait for async overlap validator debounce (400ms) + margin
    await wait(600);
    await stabilize(fixture);

    // ── Submit the update ────────────────────────────────────────────────────
    panel.onSubmit();
    await stabilize(fixture);

    expect(panel.isOpen())
      .withContext('panel should close after successful submit')
      .toBe(false);

    // ── Verify bar grew ──────────────────────────────────────────────────────
    // Scroll back to Jan 2026 (the lastSavedWorkOrder effect may have changed scroll)
    scrollToJan2026(body);
    await stabilize(fixture);

    bar = getBar(el);
    expect(bar).withContext('bar should still be rendered after update').toBeTruthy();

    const { start, end } = parseGridColumn(bar);
    expect(end - start)
      .withContext('bar should still span 2 columns (Jan + Feb)')
      .toBe(2);

    const updatedMarginRight = parseFloat(bar.style.marginRight);
    expect(updatedMarginRight)
      .withContext(
        'marginRight should decrease after extending end date ' +
        `(was ${initialMarginRight}px, now ${updatedMarginRight}px)`,
      )
      .toBeLessThan(initialMarginRight);

    // The marginLeft should remain unchanged (start date didn't change)
    const marginLeft = parseFloat(bar.style.marginLeft);
    expect(marginLeft)
      .withContext('marginLeft should still be > 0 (start date unchanged)')
      .toBeGreaterThan(0);
  });

  it('should position the bar ending exactly at Feb 15 in Day view after update', async () => {
    const body = bodyViewport(el);
    scrollToJan2026(body);
    await stabilize(fixture);

    // ── Update end date via panel ────────────────────────────────────────────
    const panel = host.panel;
    const workCenter = TEST_CENTERS[0];
    const workOrder = workCenter.workOrders[0];

    panel.openForEdit(workCenter, workOrder);
    await stabilize(fixture);

    panel.form.patchValue({
      endDate: '2026-02-15',
      endTime: '00:00',
    });
    fixture.detectChanges();
    await wait(600);
    await stabilize(fixture);

    panel.onSubmit();
    await stabilize(fixture);

    // ── Switch to Day timescale ──────────────────────────────────────────────
    host.timescale.set('Day');
    await stabilize(fixture);

    // ── Scroll until "Feb 15" is visible in the header ───────────────────────
    let foundFeb15 = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const labels = headerLabels(el);
      if (labels.includes('Feb 15')) {
        foundFeb15 = true;
        break;
      }
      body.scrollLeft += COLUMN_WIDTH;
      body.dispatchEvent(new Event('scroll'));
      await stabilize(fixture);
    }
    expect(foundFeb15)
      .withContext('should be able to scroll to Feb 15 in Day view')
      .toBe(true);

    // ── Verify bar is rendered and spans Jan 17 → Feb 15 ─────────────────────
    const bar = getBar(el);
    expect(bar).withContext('bar should be rendered in Day view').toBeTruthy();

    const { start, end } = parseGridColumn(bar);
    const span = end - start;

    // Jan 17 → Feb 15 inclusive = 30 day-columns
    // (Jan: 17,18,19,...,31 = 15 days) + (Feb: 1,2,...,15 = 15 days) = 30
    expect(span)
      .withContext('bar should span 30 day-columns (Jan 17 through Feb 15 inclusive)')
      .toBe(30);

    // marginRight should be full column width (113px) because
    // the WO ends at Feb 15 00:00:00, which is the very start of the Feb 15
    // day unit — so the bar visually ends right at the Feb 14/Feb 15 boundary.
    const marginRight = parseFloat(bar.style.marginRight);
    expect(marginRight)
      .withContext(
        'marginRight on last column (Feb 15) should be the full column width ' +
        '(WO ends at 00:00, the exact start of the day unit)',
      )
      .toBe(COLUMN_WIDTH);

    // marginLeft should reflect the 01:00 start time
    // 1 hour into a 24-hour day ≈ 1/24 ≈ 0.042 → Math.round(0.042 * 113) = 5px
    const marginLeft = parseFloat(bar.style.marginLeft);
    expect(marginLeft)
      .withContext('marginLeft should reflect the 01:00 start time (~5px into the day)')
      .toBeGreaterThan(0);
    expect(marginLeft)
      .withContext('marginLeft should be small (only 1 hour offset)')
      .toBeLessThan(10);
  });
});
