import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  signal,
  effect,
  output,
} from '@angular/core';

interface HoverState {
  x: number;
  y: number;
  visible: boolean;
}

export interface HoverBoxContext {
  x: number;
  timeUnitIndex: number;
}

@Directive({
  selector: '.grid-track',
  standalone: true,
})
export class GridTrackHoverDirective implements OnDestroy {
  private readonly COLUMN_WIDTH = 113; // Match the grid column width

  private hoverState = signal<HoverState>({ x: 0, y: 0, visible: false });
  readonly hoverBox = this.hoverState.asReadonly();
  readonly boxClicked = output<HoverBoxContext>();

  private trackEl: HTMLElement;
  private floatingBoxEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private hoverTimeout: number | null = null;
  private HOVER_DELAY = 200; // milliseconds

  constructor(el: ElementRef<HTMLElement>) {
    this.trackEl = el.nativeElement;

    // Create the floating box element
    this.floatingBoxEl = document.createElement('div');
    this.floatingBoxEl.className = 'grid-track-hover-box';
    this.floatingBoxEl.style.cssText = `
      position: absolute;
      width: 113px;
      height: 38px;
      border: 1px solid rgba(195, 199, 255, 1);
      border-radius: 8px;
      background-color: rgba(101, 112, 255, 0.1);
      pointer-events: auto;
      cursor: pointer;
      z-index: 0;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;
    this.floatingBoxEl.addEventListener('click', () => {
      const state = this.hoverState();
      // TODO import the configuration instead
      const boxWidth = 113;
      const boxCenterX = state.x + boxWidth / 2;
      const timeUnitIndex = Math.floor(boxCenterX / this.COLUMN_WIDTH);
      this.boxClicked.emit({ x: state.x, timeUnitIndex });
    });

    // Create the tooltip element
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'grid-track-tooltip';
    this.tooltipEl.textContent = 'Click to add dates';
    this.tooltipEl.style.cssText = `
      position: absolute;
      width: 130px;
      height: 26px;
      box-shadow: 0 2px 4px -2px rgba(200, 207, 233, 1), 0 0 16px -8px rgba(230, 235, 240, 1);
      border-radius: 8px;
      background-color: rgba(104, 113, 150, 1);
      color: rgba(249, 250, 255, 1);
      font-family: "Circular-Std";
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.15s ease;
    `;

    this.trackEl.style.position = 'relative';
    this.trackEl.appendChild(this.floatingBoxEl);
    this.trackEl.appendChild(this.tooltipEl);

    // Update floating box and tooltip position and visibility whenever hoverState changes
    // This runs in the constructor's injection context
    effect(() => {
      const state = this.hoverState();

      if (state.visible) {
        this.floatingBoxEl.style.left = `${state.x}px`;
        this.floatingBoxEl.style.top = `${state.y}px`;
        this.floatingBoxEl.style.opacity = '1';

        // Position tooltip 5px above the floating box, centered horizontally
        const tooltipWidth = 130;
        const boxWidth = 113;
        const tooltipLeft = state.x + (boxWidth - tooltipWidth) / 2;
        const tooltipTop = state.y - 5 - 26; // 5px gap + tooltip height
        this.tooltipEl.style.left = `${tooltipLeft}px`;
        this.tooltipEl.style.top = `${tooltipTop}px`;
        this.tooltipEl.style.opacity = '1';
      } else {
        this.floatingBoxEl.style.opacity = '0';
        this.tooltipEl.style.opacity = '0';
      }
    });
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    // Check if mouse is over a work order bar
    const target = event.target as HTMLElement;
    const isOverWorkOrder = target.closest('app-work-order-bar') !== null;

    if (isOverWorkOrder) {
      // Hide the floating box when over a work order
      this.clearHoverTimeout();
      this.hoverState.set({ x: 0, y: 0, visible: false });
      return;
    }

    // Get the position relative to the grid-track container
    const rect = this.trackEl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Constrain to track bounds
    const boxWidth = 113;
    const boxHeight = 38;
    const constrainedX = Math.min(x - boxWidth / 2, rect.width - boxWidth);
    const constrainedY = y - boxHeight / 2;

    const newState = {
      x: Math.max(0, constrainedX),
      y: Math.max(0, constrainedY),
      visible: true,
    };

    // If box is already visible, update immediately without delay
    if (this.hoverState().visible) {
      this.clearHoverTimeout();
      this.hoverState.set(newState);
      return;
    }

    // Otherwise, wait for the delay before showing
    this.clearHoverTimeout();
    this.hoverTimeout = window.setTimeout(() => {
      this.hoverState.set(newState);
    }, this.HOVER_DELAY);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.clearHoverTimeout();
    this.hoverState.set({ x: 0, y: 0, visible: false });
  }

  private clearHoverTimeout() {
    if (this.hoverTimeout !== null) {
      window.clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  ngOnDestroy() {
    this.clearHoverTimeout();
    if (this.trackEl.contains(this.floatingBoxEl)) {
      this.trackEl.removeChild(this.floatingBoxEl);
    }
    if (this.trackEl.contains(this.tooltipEl)) {
      this.trackEl.removeChild(this.tooltipEl);
    }
  }
}
