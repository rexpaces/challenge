import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineGridV3Component } from './timeline-grid-v3.component';
import { WorkOrderDocument } from '../../../model';
import { WorkCenterService, WorkCenterWithOrders } from '../../services/workcenters.service';

// ── Test data ──────────────────────────────────────────────────────────────────

const TEST_WORK_CENTERS: WorkCenterWithOrders[] = Array.from({ length: 30 }, (_, i) => ({
  docId: `wc-${i + 1}`,
  docType: 'workCenter' as const,
  data: { name: `Work Center ${i + 1}` },
  workOrders: [],
}));

// ── Mock service (synchronous signal, no fetch) ───────────────────────────────

class MockWorkCenterService {
  private _workCenters = signal<WorkCenterWithOrders[]>(TEST_WORK_CENTERS);
  readonly workCenters = this._workCenters.asReadonly();
  readonly lastSavedWorkOrder = signal<WorkOrderDocument | null>(null);
}

// ── Test host to drive the timescale input ─────────────────────────────────────

@Component({
  template: `
    <div style="width: 1200px; height: 600px; display: block; position: relative;">
      <app-timeline-grid-v3 [timescale]="timescale()" />
    </div>
  `,
  standalone: true,
  imports: [TimelineGridV3Component],
})
class TestHostComponent {
  timescale = signal<'Day' | 'Week' | 'Month'>('Month');
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Wait for two nested requestAnimationFrame callbacks to flush. */
function waitForRAF(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

/** Arbitrary async pause for CDK rendering / effects / scrolling. */
function wait(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stabilise the fixture after any async change. */
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

function headerViewport(el: HTMLElement): HTMLElement {
  return el.querySelector('cdk-virtual-scroll-viewport.header-viewport') as HTMLElement;
}

function headerLabels(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.date-column-header')).map(
    (node) => (node as HTMLElement).textContent?.trim() ?? '',
  );
}

// ── Label parsers ──────────────────────────────────────────────────────────────

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Parse "Feb 2026" → Date */
function parseMonthLabel(label: string): Date | null {
  const parts = label.split(' ');
  if (parts.length !== 2) return null;
  const mi = MONTH_ABBR.indexOf(parts[0]);
  const yr = parseInt(parts[1], 10);
  if (mi < 0 || isNaN(yr)) return null;
  return new Date(yr, mi, 1);
}

/** Parse "2/15-2/21" → { start, end } (uses current year) */
function parseWeekLabel(label: string): { start: Date; end: Date } | null {
  const m = label.match(/^(\d+)\/(\d+)-(\d+)\/(\d+)$/);
  if (!m) return null;
  const yr = new Date().getFullYear();
  return {
    start: new Date(yr, +m[1] - 1, +m[2]),
    end: new Date(yr, +m[3] - 1, +m[4]),
  };
}

/** Parse "Feb 17" → Date (uses current year) */
function parseDayLabel(label: string): Date | null {
  const parts = label.split(' ');
  if (parts.length !== 2) return null;
  const mi = MONTH_ABBR.indexOf(parts[0]);
  const day = parseInt(parts[1], 10);
  if (mi < 0 || isNaN(day)) return null;
  return new Date(new Date().getFullYear(), mi, day);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TimelineGridV3Component', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: WorkCenterService, useClass: MockWorkCenterService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    await stabilize(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  // ── Initial rendering ────────────────────────────────────────────────────────

  describe('Initial rendering', () => {
    it('should render the left header labelled "Work Center"', () => {
      const leftHeader = el.querySelector('.left-header') as HTMLElement;
      expect(leftHeader).toBeTruthy();
      expect(leftHeader.textContent?.trim()).toBe('Work Center');
    });

    it('should render date column headers with Month labels by default', () => {
      const labels = headerLabels(el);
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(parseMonthLabel(label)).not.toBeNull(
          `Expected month label "Mon YYYY" but got "${label}"`,
        );
      }
    });

    it('should display work center names from the data source', () => {
      const names = Array.from(el.querySelectorAll('.work-center-cell')).map(
        (c) => (c as HTMLElement).textContent?.trim(),
      );
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('Work Center 1');
    });

    it('should render each row with a work-center-cell and a grid-track', () => {
      const rows = el.querySelectorAll('.row');
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row, i) => {
        expect(row.querySelector('.work-center-cell')).toBeTruthy(
          `Row ${i} is missing .work-center-cell`,
        );
        expect(row.querySelector('.grid-track')).toBeTruthy(
          `Row ${i} is missing .grid-track`,
        );
      });
    });
  });

  // ── Initial scroll position ──────────────────────────────────────────────────

  describe('Initial scroll position', () => {
    it('should not be scrolled to the very beginning', () => {
      expect(bodyViewport(el).scrollLeft).toBeGreaterThan(0);
    });

    it('should position the current month within the first few visible headers', () => {
      const now = new Date();
      const currentMonthLabel = `${MONTH_ABBR[now.getMonth()]} ${now.getFullYear()}`;
      const labels = headerLabels(el);
      const idx = labels.indexOf(currentMonthLabel);
      expect(idx).toBeGreaterThanOrEqual(0);
      // "1 unit before today" → today's month is near the start; allow CDK buffer tolerance
      expect(idx).toBeLessThan(5);
    });
  });

  // ── Header ↔ Body scroll synchronization ─────────────────────────────────────

  describe('Header scroll synchronization', () => {
    it('should sync header scrollLeft when body is scrolled horizontally', async () => {
      const body = bodyViewport(el);
      const header = headerViewport(el);

      const targetScroll = body.scrollLeft + 500;
      body.scrollLeft = targetScroll;
      body.dispatchEvent(new Event('scroll'));

      await waitForRAF();
      fixture.detectChanges();

      expect(header.scrollLeft).toBeGreaterThan(0);
      expect(Math.abs(header.scrollLeft - body.scrollLeft)).toBeLessThan(5);
    });

    it('should not change header scrollLeft on a purely vertical scroll', async () => {
      const body = bodyViewport(el);
      const header = headerViewport(el);

      // Record current header scroll
      const headerScrollBefore = header.scrollLeft;

      // Scroll vertically only (scrollLeft stays the same)
      body.scrollTop += 200;
      body.dispatchEvent(new Event('scroll'));
      await waitForRAF();
      fixture.detectChanges();

      expect(header.scrollLeft).toBe(headerScrollBefore);
    });
  });

  // ── Column uniformity ────────────────────────────────────────────────────────

  describe('Column uniformity', () => {
    it('should render all date column headers with the same width', () => {
      const columns = el.querySelectorAll('.date-column-header');
      expect(columns.length).toBeGreaterThan(1);

      const widths = Array.from(columns).map(
        (c) => Math.round((c as HTMLElement).getBoundingClientRect().width),
      );
      const ref = widths[0];
      widths.forEach((w, i) => {
        expect(w).toBe(ref, `Column ${i} width ${w}px ≠ reference ${ref}px`);
      });
    });

    it('should render all rows with the same height', () => {
      const rows = el.querySelectorAll('.row');
      expect(rows.length).toBeGreaterThan(1);

      const heights = Array.from(rows).map(
        (r) => Math.round((r as HTMLElement).getBoundingClientRect().height),
      );
      const ref = heights[0];
      heights.forEach((h, i) => {
        expect(h).toBe(ref, `Row ${i} height ${h}px ≠ reference ${ref}px`);
      });
    });
  });

  // ── Timescale switching ──────────────────────────────────────────────────────

  describe('Timescale switching', () => {
    async function switchTimescale(scale: 'Day' | 'Week' | 'Month') {
      host.timescale.set(scale);
      await stabilize(fixture);
    }

    it('should show Week labels after switching to Week', async () => {
      await switchTimescale('Week');
      const labels = headerLabels(el);
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(parseWeekLabel(label)).not.toBeNull(
          `Expected week label "M/D-M/D" but got "${label}"`,
        );
      }
    });

    it('should show Day labels after switching to Day', async () => {
      await switchTimescale('Day');
      const labels = headerLabels(el);
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) {
        expect(parseDayLabel(label)).not.toBeNull(
          `Expected day label "Mon D" but got "${label}"`,
        );
      }
    });

    it('should revert to Month labels when switching Week → Month', async () => {
      await switchTimescale('Week');
      await switchTimescale('Month');
      for (const label of headerLabels(el)) {
        expect(parseMonthLabel(label)).not.toBeNull(
          `Expected month label "Mon YYYY" but got "${label}"`,
        );
      }
    });

    // ── Scroll position preservation ───────────────────────────────────────────

    describe('scroll position preservation', () => {
      // We scroll FAR from today (12+ months) so that if the component
      // re-centres on today instead of preserving the scroll date, the
      // target date falls outside the new timescale's buffer and the
      // mismatch is clearly detectable.
      const FAR_SCROLL_MONTHS = 12;
      const FAR_SCROLL_PX = FAR_SCROLL_MONTHS * 113;

      /** The month label for "today" — used to assert we did NOT snap back. */
      function todayMonthLabel(): string {
        const now = new Date();
        return `${MONTH_ABBR[now.getMonth()]} ${now.getFullYear()}`;
      }

      it('should not reset scrollLeft to 0 when timescale changes', async () => {
        const body = bodyViewport(el);

        body.scrollLeft += FAR_SCROLL_PX;
        body.dispatchEvent(new Event('scroll'));
        await stabilize(fixture);

        expect(body.scrollLeft).toBeGreaterThan(0);

        await switchTimescale('Week');
        expect(body.scrollLeft).toBeGreaterThan(0);
      });

      it('should preserve the approximate date when switching Month → Week', async () => {
        const body = bodyViewport(el);

        // Scroll 12 months to the right — well past the Week buffer (±6 months)
        // that a buggy "re-centre on today" implementation would produce.
        body.scrollLeft += FAR_SCROLL_PX;
        body.dispatchEvent(new Event('scroll'));
        await stabilize(fixture);

        // Capture the month at the left edge (should be ~12 months from today)
        const monthLabelsBefore = headerLabels(el);
        expect(monthLabelsBefore.length).toBeGreaterThan(0);
        const edgeMonth = parseMonthLabel(monthLabelsBefore[0])!;
        expect(edgeMonth).not.toBeNull();

        // Sanity: edge month should be far from today
        const today = new Date();
        const monthsFromToday =
          (edgeMonth.getFullYear() - today.getFullYear()) * 12 +
          edgeMonth.getMonth() -
          today.getMonth();
        expect(Math.abs(monthsFromToday)).toBeGreaterThanOrEqual(
          6,
          `Pre-condition: expected scroll to be ≥6 months from today, ` +
            `but edge is ${monthLabelsBefore[0]}`,
        );

        // Switch to Week
        await switchTimescale('Week');

        const weekLabelsAfter = headerLabels(el);
        expect(weekLabelsAfter.length).toBeGreaterThan(0);
        const firstWeek = parseWeekLabel(weekLabelsAfter[0]);
        expect(firstWeek).not.toBeNull();

        // The first visible week should be within ±1 month of the previous edge month
        const diffMs = Math.abs(firstWeek!.start.getTime() - edgeMonth.getTime());
        const oneMonthMs = 31 * 24 * 60 * 60 * 1000;
        expect(diffMs).toBeLessThan(
          oneMonthMs,
          `Week at scroll edge (${weekLabelsAfter[0]}) is too far from ` +
            `the month at previous edge (${monthLabelsBefore[0]})`,
        );
      });

      it('should preserve the approximate date when switching Month → Day', async () => {
        const body = bodyViewport(el);

        // Scroll far ahead — Day buffer is only ±30 days from the anchor,
        // so any drift back to today is immediately detectable.
        body.scrollLeft += FAR_SCROLL_PX;
        body.dispatchEvent(new Event('scroll'));
        await stabilize(fixture);

        const monthLabelsBefore = headerLabels(el);
        expect(monthLabelsBefore.length).toBeGreaterThan(0);
        const edgeMonth = parseMonthLabel(monthLabelsBefore[0])!;
        expect(edgeMonth).not.toBeNull();

        await switchTimescale('Day');

        const dayLabelsAfter = headerLabels(el);
        expect(dayLabelsAfter.length).toBeGreaterThan(0);
        const firstDay = parseDayLabel(dayLabelsAfter[0]);
        expect(firstDay).not.toBeNull();

        // The first visible day should be within ±1 month of the previous edge month
        const diffMs = Math.abs(firstDay!.getTime() - edgeMonth.getTime());
        const oneMonthMs = 31 * 24 * 60 * 60 * 1000;
        expect(diffMs).toBeLessThan(
          oneMonthMs,
          `Day at scroll edge (${dayLabelsAfter[0]}) is too far from ` +
            `the month at previous edge (${monthLabelsBefore[0]})`,
        );
      });

      xit('should preserve the approximate date when switching Week → Day', async () => {
        await switchTimescale('Week');

        const body = bodyViewport(el);
        // Scroll 8 weeks ahead — more than the Day buffer (±30 days)
        body.scrollLeft += 8 * 113;
        body.dispatchEvent(new Event('scroll'));
        await stabilize(fixture);

        const weekLabelsBefore = headerLabels(el);
        expect(weekLabelsBefore.length).toBeGreaterThan(0);
        const edgeWeek = parseWeekLabel(weekLabelsBefore[0]);
        expect(edgeWeek).not.toBeNull();

        await switchTimescale('Day');

        const dayLabelsAfter = headerLabels(el);
        expect(dayLabelsAfter.length).toBeGreaterThan(0);
        const firstDay = parseDayLabel(dayLabelsAfter[0]);
        expect(firstDay).not.toBeNull();

        // The first visible day should be within ±1 week of the previous edge week
        const diffMs = Math.abs(firstDay!.getTime() - edgeWeek!.start.getTime());
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        expect(diffMs).toBeLessThan(
          oneWeekMs,
          `Day at scroll edge (${dayLabelsAfter[0]}) is too far from ` +
            `the week at previous edge (${weekLabelsBefore[0]})`,
        );
      });

      it('should preserve the approximate date across a full round-trip Month → Week → Month', async () => {
        const body = bodyViewport(el);
        body.scrollLeft += FAR_SCROLL_PX;
        body.dispatchEvent(new Event('scroll'));
        await stabilize(fixture);

        const monthLabelsBefore = headerLabels(el);
        const edgeMonthBefore = parseMonthLabel(monthLabelsBefore[0])!;
        expect(edgeMonthBefore).not.toBeNull();

        await switchTimescale('Week');
        await switchTimescale('Month');

        const monthLabelsAfter = headerLabels(el);
        const edgeMonthAfter = parseMonthLabel(monthLabelsAfter[0])!;
        expect(edgeMonthAfter).not.toBeNull();

        // Should land within ±1 month of the original position
        const diffMonths = Math.abs(
          (edgeMonthAfter.getFullYear() - edgeMonthBefore.getFullYear()) * 12 +
            edgeMonthAfter.getMonth() -
            edgeMonthBefore.getMonth(),
        );
        expect(diffMonths).toBeLessThanOrEqual(
          1,
          `Round-trip Month→Week→Month drifted ${diffMonths} months ` +
            `(before: ${monthLabelsBefore[0]}, after: ${monthLabelsAfter[0]})`,
        );
      });

      it('should land on Oct 2026 weeks after scrolling to Oct 2026 and switching Month → Week → Month', async () => {
        const body = bodyViewport(el);

        // Scroll right until "Oct 2026" is the first visible month header
        let foundOct = false;
        for (let attempt = 0; attempt < 40; attempt++) {
          const labels = headerLabels(el);
          if (labels[0] === 'Oct 2026') {
            foundOct = true;
            break;
          }
          body.scrollLeft += 113;
          body.dispatchEvent(new Event('scroll'));
          await stabilize(fixture);
        }
        expect(foundOct).toBe(
          true,
          'Could not scroll to Oct 2026. Visible: ' + headerLabels(el).join(', '),
        );

        // ── Switch to Week ──
        await switchTimescale('Week');

        const weekLabels = headerLabels(el);
        expect(weekLabels.length).toBeGreaterThan(0);

        // At least one of the first visible week headers should contain October dates (month = 10)
        const hasOctoberWeek = weekLabels.slice(0, 5).some((label) => {
          const w = parseWeekLabel(label);
          if (!w) return false;
          // A week is "in October" if either its start or end falls in Oct 2026
          return (
            (w.start.getMonth() === 9 && w.start.getFullYear() === 2026) ||
            (w.end.getMonth() === 9 && w.end.getFullYear() === 2026)
          );
        });
        expect(hasOctoberWeek).toBe(
          true,
          `After switching to Week from Oct 2026, expected October 2026 weeks ` +
            `among first visible headers. Visible: ${weekLabels.slice(0, 5).join(', ')}`,
        );

        // ── Switch back to Month ──
        await switchTimescale('Month');

        const monthLabelsAfter = headerLabels(el);
        expect(monthLabelsAfter.length).toBeGreaterThan(0);

        // "Oct 2026" should be among the first few visible month headers
        const octIdx = monthLabelsAfter.indexOf('Oct 2026');
        expect(octIdx).toBeGreaterThanOrEqual(0);
        expect(octIdx).toBeLessThan(
          3,
          `After round-trip Month→Week→Month, "Oct 2026" should be near the scroll edge ` +
            `but it was at index ${octIdx}. Visible: ${monthLabelsAfter.slice(0, 5).join(', ')}`,
        );
      });

      xit('should NOT snap back to today after switching timescale from a distant scroll position', async () => {
        const body = bodyViewport(el);
        body.scrollLeft += FAR_SCROLL_PX;
        body.dispatchEvent(new Event('scroll'));
        await stabilize(fixture);

        // Verify we scrolled away from today
        const labelsBefore = headerLabels(el);
        expect(labelsBefore).not.toContain(todayMonthLabel());

        await switchTimescale('Week');

        // After switching, today's month should NOT appear in visible headers
        // (we're ~12 months away — today is nowhere near the viewport)
        const weekLabels = headerLabels(el);
        const currentMonth = new Date().getMonth() + 1;
        const todayInAnyWeek = weekLabels.some((label) => {
          const w = parseWeekLabel(label);
          if (!w) return false;
          return w.start.getMonth() === new Date().getMonth() &&
            Math.abs(w.start.getFullYear() - new Date().getFullYear()) === 0;
        });
        expect(todayInAnyWeek).toBe(
          false,
          `After switching timescale 12 months away from today, ` +
            `visible headers should NOT contain today's date. ` +
            `Visible: ${weekLabels.join(', ')}`,
        );
      });
    });
  });

  // ── Left panel sticky behaviour ──────────────────────────────────────────────

  describe('Left panel sticky behaviour', () => {
    it('should keep work-center cells at the left edge after horizontal scroll', async () => {
      const body = bodyViewport(el);
      body.scrollLeft += 600;
      body.dispatchEvent(new Event('scroll'));
      await waitForRAF();
      fixture.detectChanges();

      const container = el.querySelector('.timeline-grid-container')!;
      const containerLeft = container.getBoundingClientRect().left;

      const cells = el.querySelectorAll('.work-center-cell');
      expect(cells.length).toBeGreaterThan(0);

      const cellLeft = (cells[0] as HTMLElement).getBoundingClientRect().left;
      expect(Math.abs(cellLeft - containerLeft)).toBeLessThan(2);
    });
  });

  // ── Header pointer-events ────────────────────────────────────────────────────

  describe('Header viewport interaction', () => {
    it('should not allow direct user scrolling on the header viewport', () => {
      const header = headerViewport(el);
      const style = getComputedStyle(header);
      expect(style.pointerEvents).toBe('none');
    });
  });
});

// ── Work order bar rendering ──────────────────────────────────────────────────

describe('TimelineGridV3Component – work order bar rendering', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let el: HTMLElement;

  const WORK_ORDER_NAME = 'Blocked Order Sept–Oct';
  const WO_START = '2026-09-01T12:00:00.000Z';
  const WO_END = '2026-10-15T12:00:00.000Z';

  const CENTERS_WITH_ORDER: WorkCenterWithOrders[] = [
    {
      docId: 'wc-test',
      docType: 'workCenter',
      data: { name: 'Test Center' },
      workOrders: [
        {
          docId: 'wo-test',
          docType: 'workOrder',
          data: {
            name: WORK_ORDER_NAME,
            workCenterId: 'wc-test',
            status: 'blocked',
            startDate: WO_START,
            endDate: WO_END,
          },
        },
      ],
    },
  ];

  class MockWorkCenterServiceWithOrder {
    private _workCenters = signal<WorkCenterWithOrders[]>(CENTERS_WITH_ORDER);
    readonly workCenters = this._workCenters.asReadonly();
    readonly lastSavedWorkOrder = signal<WorkOrderDocument | null>(null);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: WorkCenterService, useClass: MockWorkCenterServiceWithOrder },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    await stabilize(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('should render the blocked work order bar in the correct grid columns', () => {
    const bar = el.querySelector('app-work-order-bar') as HTMLElement;
    expect(bar).withContext('app-work-order-bar should be rendered').toBeTruthy();

    // ── Grid column position ────────────────────────────────────────────────
    // Compute expected column indices dynamically from the buffer:
    // Range starts 24 months before today, snapped to the 1st.
    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 24);
    rangeStart.setDate(1);
    rangeStart.setHours(0, 0, 0, 0);

    const sept2026 = new Date(2026, 8, 1); // Sept 1 2026
    const monthsToSept =
      (sept2026.getFullYear() - rangeStart.getFullYear()) * 12 +
      (sept2026.getMonth() - rangeStart.getMonth());

    const expectedColStart = monthsToSept + 1; // CSS grid is 1-indexed
    const expectedColEnd = expectedColStart + 2; // spans Sept and Oct → 2 columns

    const gridColumn = bar.style.gridColumn;
    expect(gridColumn)
      .withContext('grid-column style should be set on the bar host element')
      .toBeTruthy();

    const [startStr, endStr] = gridColumn.split('/').map((s) => s.trim());
    const actualColStart = parseInt(startStr, 10);
    const actualColEnd = parseInt(endStr, 10);

    expect(actualColStart)
      .withContext('gridColumnStart should map to the Sept 2026 column')
      .toBe(expectedColStart);
    expect(actualColEnd)
      .withContext('gridColumnEnd should be Sept column + 2 (spans Sept and Oct)')
      .toBe(expectedColEnd);

    // ── Margin-left: starts Sept 1 noon UTC → offset < 5 px ────────────────
    const marginLeft = parseFloat(bar.style.marginLeft);
    expect(marginLeft)
      .withContext('marginLeft should be near zero (work order starts on Sept 1)')
      .toBeLessThan(5);

    // ── Margin-right: ends Oct 15 → ~half of Oct remaining ─────────────────
    // Oct has 31 days; ~16 days remain after Oct 15 noon → ~58 px at 113 px/col
    const marginRight = parseFloat(bar.style.marginRight);
    expect(marginRight)
      .withContext('marginRight should be significant (work order ends Oct 15, not Oct 31)')
      .toBeGreaterThan(50);

    // ── Status styling ──────────────────────────────────────────────────────
    const innerBar = bar.querySelector('.bar') as HTMLElement;
    expect(innerBar).withContext('.bar element should exist inside app-work-order-bar').toBeTruthy();
    expect(innerBar.classList)
      .withContext('.bar should carry the status-blocked CSS class')
      .toContain('status-blocked');

    const pill = bar.querySelector('.pill') as HTMLElement;
    expect(pill).withContext('.pill element should exist').toBeTruthy();
    expect(pill.classList)
      .withContext('pill should carry pill-blocked CSS class')
      .toContain('pill-blocked');

    // ── Name label ──────────────────────────────────────────────────────────
    const nameEl = bar.querySelector('.name') as HTMLElement;
    expect(nameEl?.textContent?.trim())
      .withContext('bar should display the work order name')
      .toBe(WORK_ORDER_NAME);
  });
});

// ── Day timescale bar positioning ─────────────────────────────────────────────

describe('TimelineGridV3Component – day timescale bar positioning', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let el: HTMLElement;

  const JAN_CENTER: WorkCenterWithOrders[] = [
    {
      docId: 'wc-jan',
      docType: 'workCenter',
      data: { name: 'January Center' },
      workOrders: [
        {
          docId: 'wo-jan',
          docType: 'workOrder',
          data: {
            name: 'Jan 1–15 Order',
            workCenterId: 'wc-jan',
            status: 'in-progress',
            // noon UTC keeps us safely on Jan 1 / Jan 15 in every reasonable timezone
            startDate: '2026-01-01T12:00:00.000Z',
            endDate: '2026-01-15T12:00:00.000Z',
          },
        },
      ],
    },
  ];

  class MockWorkCenterServiceJan {
    private _wc = signal<WorkCenterWithOrders[]>(JAN_CENTER);
    readonly workCenters = this._wc.asReadonly();
    readonly lastSavedWorkOrder = signal<WorkOrderDocument | null>(null);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: WorkCenterService, useClass: MockWorkCenterServiceJan },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    await stabilize(fixture);
    el = fixture.nativeElement as HTMLElement;
  });

  it('should render bar spanning Jan 1–15 (15 day-columns) after switching to Day timescale scrolled to Jan 2026', async () => {
    const body = bodyViewport(el);

    // ── Scroll Month view to Jan 2026 ───────────────────────────────────────
    // Month range starts 24 months before today, snapped to the 1st.
    // Scrolling to (monthsToJan * 113) puts Jan 2026 exactly at the left edge,
    // so getScrollEdgeDate() will capture Jan 1, 2026 00:00 as the anchor.
    const monthRangeStart = new Date();
    monthRangeStart.setMonth(monthRangeStart.getMonth() - 24);
    monthRangeStart.setDate(1);
    monthRangeStart.setHours(0, 0, 0, 0);

    const jan2026 = new Date(2026, 0, 1);
    const monthsToJan =
      (jan2026.getFullYear() - monthRangeStart.getFullYear()) * 12 +
      (jan2026.getMonth() - monthRangeStart.getMonth());

    body.scrollLeft = monthsToJan * 113;
    body.dispatchEvent(new Event('scroll'));
    await stabilize(fixture);

    // Confirm we're looking at Jan 2026 in Month view before switching
    expect(headerLabels(el)[1])
      .withContext('should be at Jan 2026 in Month view before switching')
      .toBe('Jan 2026');

    // ── Switch to Day timescale ─────────────────────────────────────────────
    host.timescale.set('Day');
    await stabilize(fixture);

    // ── Bar must be in the DOM ──────────────────────────────────────────────
    const bar = el.querySelector('app-work-order-bar') as HTMLElement;
    expect(bar)
      .withContext('app-work-order-bar should be rendered in Day view')
      .toBeTruthy();

    // ── Span = 15 day-columns (Jan 1 through Jan 15 inclusive) ─────────────
    // Anchor captured from Month scroll = Jan 1 2026 00:00.
    // Day range start = Jan 1 − 30 days = Dec 2 2025.
    // Jan 1  → day-index 30 → gridColumnStart = 31
    // Jan 15 → day-index 44 → gridColumnEnd   = 46
    // span = 46 − 31 = 15
    const msPerDay = 24 * 60 * 60 * 1000;
    const dayRangeStart = new Date(2026, 0, 1);
    dayRangeStart.setDate(dayRangeStart.getDate() - 30);
    dayRangeStart.setHours(0, 0, 0, 0);

    const jan1Local = new Date(2026, 0, 1);
    jan1Local.setHours(0, 0, 0, 0);
    const jan15Local = new Date(2026, 0, 15);
    jan15Local.setHours(0, 0, 0, 0);

    const daysToJan1 = Math.round((jan1Local.getTime() - dayRangeStart.getTime()) / msPerDay);
    const daysToJan15 = Math.round((jan15Local.getTime() - dayRangeStart.getTime()) / msPerDay);
    const expectedColStart = daysToJan1 + 1;  // 31
    const expectedColEnd = daysToJan15 + 2;   // 46

    const gridColumn = bar.style.gridColumn;
    expect(gridColumn)
      .withContext('grid-column style must be set on the host element')
      .toBeTruthy();

    const [startStr, endStr] = gridColumn.split('/').map((s) => s.trim());
    const actualColStart = parseInt(startStr, 10);
    const actualColEnd = parseInt(endStr, 10);

    expect(actualColStart)
      .withContext('gridColumnStart should correspond to the Jan 1 day-column')
      .toBe(expectedColStart);

    expect(actualColEnd)
      .withContext('gridColumnEnd should correspond to day after Jan 15')
      .toBe(expectedColEnd);

    expect(actualColEnd - actualColStart)
      .withContext('bar should span exactly 15 day-columns (Jan 1 to Jan 15 inclusive)')
      .toBe(15);

    // ── Visible day headers confirm we are looking at Jan 2026 ─────────────
    const dayLabels = headerLabels(el);
    expect(dayLabels.length)
      .withContext('should have visible day headers in Day view')
      .toBeGreaterThan(0);

    expect(dayLabels)
      .withContext('"Jan 1" should be among the first visible day headers')
      .toContain('Jan 1');
  });
});
