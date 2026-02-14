import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineGridComponent } from './timeline-grid.component';

describe('TimelineGridComponent', () => {
  let fixture: ComponentFixture<TimelineGridComponent>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineGridComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineGridComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    nativeElement = fixture.nativeElement as HTMLElement;
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render work center rows and grid rows', () => {
    const leftRows = nativeElement.querySelectorAll('.work-center-row');
    const rightRows = nativeElement.querySelectorAll('.grid-row');

    expect(leftRows.length).toBeGreaterThan(0);
    expect(rightRows.length).toBeGreaterThan(0);
    expect(leftRows.length).toBe(rightRows.length);
  });

  describe('Row height alignment between left and right panels', () => {
    it('should have the same number of rows in both panels', () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row');
      const rightRows = nativeElement.querySelectorAll('.grid-row');

      expect(leftRows.length).toBe(rightRows.length);
    });

    it('should have matching heights for every row pair across panels', () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row');
      const rightRows = nativeElement.querySelectorAll('.grid-row');

      expect(leftRows.length).toBe(rightRows.length);

      for (let i = 0; i < leftRows.length; i++) {
        const leftHeight = (leftRows[i] as HTMLElement).getBoundingClientRect().height;
        const rightHeight = (rightRows[i] as HTMLElement).getBoundingClientRect().height;

        expect(leftHeight).toBe(
          rightHeight,
          `Row ${i} height mismatch: left panel = ${leftHeight}px, right panel = ${rightHeight}px`
        );
      }
    });

    it('should have first row height matching between panels', () => {
      const firstLeftRow = nativeElement.querySelector('.work-center-row:first-child') as HTMLElement;
      const firstRightRow = nativeElement.querySelector('.grid-row:first-child') as HTMLElement;

      expect(firstLeftRow).toBeTruthy();
      expect(firstRightRow).toBeTruthy();

      const leftHeight = firstLeftRow.getBoundingClientRect().height;
      const rightHeight = firstRightRow.getBoundingClientRect().height;

      expect(leftHeight).toBe(
        rightHeight,
        `First row height mismatch: left = ${leftHeight}px, right = ${rightHeight}px`
      );
    });

    it('should have non-first rows height matching between panels', () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row:not(:first-child)');
      const rightRows = nativeElement.querySelectorAll('.grid-row:not(:first-child)');

      expect(leftRows.length).toBe(rightRows.length);
      expect(leftRows.length).toBeGreaterThan(0);

      for (let i = 0; i < leftRows.length; i++) {
        const leftHeight = (leftRows[i] as HTMLElement).getBoundingClientRect().height;
        const rightHeight = (rightRows[i] as HTMLElement).getBoundingClientRect().height;

        expect(leftHeight).toBe(
          rightHeight,
          `Non-first row ${i} height mismatch: left = ${leftHeight}px, right = ${rightHeight}px`
        );
      }
    });

    it('should have left panel header height match right panel header height', () => {
      const leftHeader = nativeElement.querySelector('.left-panel-header') as HTMLElement;
      const rightHeader = nativeElement.querySelector('.header-container') as HTMLElement;

      expect(leftHeader).toBeTruthy();
      expect(rightHeader).toBeTruthy();

      const leftHeight = leftHeader.getBoundingClientRect().height;
      const rightHeight = rightHeader.getBoundingClientRect().height;

      expect(leftHeight).toBe(
        rightHeight,
        `Header height mismatch: left = ${leftHeight}px, right = ${rightHeight}px`
      );
    });
  });

  describe('Right panel header column uniformity', () => {
    it('should render at least one date column header', () => {
      const columns = nativeElement.querySelectorAll('.date-column-header');
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should have the same width for all date column headers', () => {
      const columns = nativeElement.querySelectorAll('.date-column-header');
      expect(columns.length).toBeGreaterThan(1);

      const referenceWidth = (columns[0] as HTMLElement).getBoundingClientRect().width;

      for (let i = 1; i < columns.length; i++) {
        const columnWidth = (columns[i] as HTMLElement).getBoundingClientRect().width;
        expect(columnWidth).toBe(
          referenceWidth,
          `Column ${i} width (${columnWidth}px) does not match first column width (${referenceWidth}px)`
        );
      }
    });

    it('should have the same height for all date column headers', () => {
      const columns = nativeElement.querySelectorAll('.date-column-header');
      expect(columns.length).toBeGreaterThan(1);

      const referenceHeight = (columns[0] as HTMLElement).getBoundingClientRect().height;

      for (let i = 1; i < columns.length; i++) {
        const columnHeight = (columns[i] as HTMLElement).getBoundingClientRect().height;
        expect(columnHeight).toBe(
          referenceHeight,
          `Column ${i} height (${columnHeight}px) does not match first column height (${referenceHeight}px)`
        );
      }
    });
  });

  describe('Synchronized row hover between panels', () => {
    it('should add hovered class to matching rows when left panel row is hovered', async () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row');
      const rightRows = nativeElement.querySelectorAll('.grid-row');

      expect(leftRows.length).toBeGreaterThan(0);
      expect(rightRows.length).toBe(leftRows.length);

      // Hover over the second row in the left panel
      const rowIndexToHover = 1;
      const leftRow = leftRows[rowIndexToHover] as HTMLElement;

      // Simulate mouseenter
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
      leftRow.dispatchEvent(mouseEnterEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check that the hovered class is applied to both panels
      expect(leftRow.classList.contains('hovered')).toBe(
        true,
        `Left panel row ${rowIndexToHover} should have hovered class`
      );

      const rightRow = rightRows[rowIndexToHover] as HTMLElement;
      expect(rightRow.classList.contains('hovered')).toBe(
        true,
        `Right panel row ${rowIndexToHover} should have hovered class`
      );
    });

    it('should add hovered class to matching rows when right panel row is hovered', async () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row');
      const rightRows = nativeElement.querySelectorAll('.grid-row');

      expect(leftRows.length).toBeGreaterThan(0);
      expect(rightRows.length).toBe(leftRows.length);

      // Hover over the third row in the right panel
      const rowIndexToHover = 2;
      const rightRow = rightRows[rowIndexToHover] as HTMLElement;

      // Simulate mouseenter
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
      rightRow.dispatchEvent(mouseEnterEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check that the hovered class is applied to both panels
      expect(rightRow.classList.contains('hovered')).toBe(
        true,
        `Right panel row ${rowIndexToHover} should have hovered class`
      );

      const leftRow = leftRows[rowIndexToHover] as HTMLElement;
      expect(leftRow.classList.contains('hovered')).toBe(
        true,
        `Left panel row ${rowIndexToHover} should have hovered class`
      );
    });

    it('should remove hovered class from all rows on mouseleave', async () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row');
      const rightRows = nativeElement.querySelectorAll('.grid-row');

      const rowIndexToHover = 1;
      const leftRow = leftRows[rowIndexToHover] as HTMLElement;

      // Hover the row
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
      leftRow.dispatchEvent(mouseEnterEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify hovered class is added
      expect(leftRow.classList.contains('hovered')).toBe(true);

      // Simulate mouseleave
      const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
      leftRow.dispatchEvent(mouseLeaveEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check that hovered class is removed from both panels
      expect(leftRow.classList.contains('hovered')).toBe(
        false,
        'Left panel row should not have hovered class after mouseleave'
      );

      const rightRow = rightRows[rowIndexToHover] as HTMLElement;
      expect(rightRow.classList.contains('hovered')).toBe(
        false,
        'Right panel row should not have hovered class after mouseleave'
      );
    });

    it('should only have one row hovered at a time', async () => {
      const leftRows = nativeElement.querySelectorAll('.work-center-row');
      const rightRows = nativeElement.querySelectorAll('.grid-row');

      // Hover first row
      const firstRow = leftRows[0] as HTMLElement;
      const firstRowEvent = new MouseEvent('mouseenter', { bubbles: true });
      firstRow.dispatchEvent(firstRowEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Hover second row
      const secondRow = leftRows[1] as HTMLElement;
      const secondRowEvent = new MouseEvent('mouseenter', { bubbles: true });
      secondRow.dispatchEvent(secondRowEvent);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check that only second row is hovered
      expect((leftRows[0] as HTMLElement).classList.contains('hovered')).toBe(false);
      expect((rightRows[0] as HTMLElement).classList.contains('hovered')).toBe(false);
      expect((leftRows[1] as HTMLElement).classList.contains('hovered')).toBe(true);
      expect((rightRows[1] as HTMLElement).classList.contains('hovered')).toBe(true);
    });
  });

  describe('Infinite scroll to future dates', () => {
    it('should be able to scroll to Dec 2030', async () => {
      const rightPanel = nativeElement.querySelector('.right-panel') as HTMLElement;
      expect(rightPanel).toBeTruthy();

      const component = fixture.componentInstance;
      let targetReached = false;

      // Keep scrolling right until Dec 2030 is visible or we run out of room
      for (let attempts = 0; attempts < 50; attempts++) {
        // Check if Dec 2030 is visible in the date headers
        const columns = nativeElement.querySelectorAll('.date-column-header');
        for (let i = 0; i < columns.length; i++) {
          const text = (columns[i] as HTMLElement).textContent?.trim();
          if (text === 'Dec 2030') {
            targetReached = true;
            break;
          }
        }

        if (targetReached) break;

        // Scroll right
        const scrollAmount = 500;
        rightPanel.scrollLeft += scrollAmount;

        // Wait for scroll handler to process
        await new Promise(resolve => setTimeout(resolve, 150));
        fixture.detectChanges();
        await fixture.whenStable();
      }

      expect(targetReached).toBe(
        true,
        'Could not scroll timeline to Dec 2030. Final visible dates: ' +
          Array.from(nativeElement.querySelectorAll('.date-column-header'))
            .map((el: any) => el.textContent?.trim())
            .join(', ')
      );
    });

    it('should be able to scroll backward to Nov 2024', async () => {
      const rightPanel = nativeElement.querySelector('.right-panel') as HTMLElement;
      expect(rightPanel).toBeTruthy();

      const component = fixture.componentInstance;
      let targetReached = false;

      // Keep scrolling left until Nov 2024 is visible or we run out of room
      for (let attempts = 0; attempts < 50; attempts++) {
        // Check if Nov 2024 is visible in the date headers
        const columns = nativeElement.querySelectorAll('.date-column-header');
        for (let i = 0; i < columns.length; i++) {
          const text = (columns[i] as HTMLElement).textContent?.trim();
          if (text === 'Nov 2024') {
            targetReached = true;
            break;
          }
        }

        if (targetReached) break;

        // Scroll left
        const scrollAmount = 500;
        rightPanel.scrollLeft -= scrollAmount;

        // Wait for scroll handler to process
        await new Promise(resolve => setTimeout(resolve, 150));
        fixture.detectChanges();
        await fixture.whenStable();
      }

      expect(targetReached).toBe(
        true,
        'Could not scroll timeline backward to Nov 2024. Final visible dates: ' +
          Array.from(nativeElement.querySelectorAll('.date-column-header'))
            .map((el: any) => el.textContent?.trim())
            .join(', ')
      );
    });
  });
});
