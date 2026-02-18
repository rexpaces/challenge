import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { WorkOrderDocument, WorkOrderStatus } from '../../../model';

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './work-order-bar.component.html',
  styleUrl: './work-order-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderBarComponent implements OnDestroy {
  name = input.required<string>();
  status = input.required<WorkOrderStatus>();
  workOrder = input.required<WorkOrderDocument>();

  editClicked = output<WorkOrderDocument>();
  deleteClicked = output<WorkOrderDocument>();

  @ViewChild('menuTemplate') menuTemplate!: TemplateRef<void>;
  @ViewChild('tooltipTemplate') tooltipTemplate!: TemplateRef<void>;

  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);
  private elementRef = inject(ElementRef);
  private overlayRef: OverlayRef | null = null;
  private tooltipRef: OverlayRef | null = null;

  toggleMenu(event: MouseEvent) {
    event.stopPropagation();

    if (this.overlayRef) {
      this.closeMenu();
      return;
    }

    const btn = event.currentTarget as HTMLElement;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(btn)
      .withPositions([
        {
          originX: 'end',
          originY: 'bottom',
          overlayX: 'end',
          overlayY: 'top',
          offsetY: 5,
        },
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    this.overlayRef.backdropClick().subscribe(() => this.closeMenu());
    this.overlayRef.attach(new TemplatePortal(this.menuTemplate, this.viewContainerRef));
  }

  onEdit() {
    this.closeMenu();
    this.editClicked.emit(this.workOrder());
  }

  onDelete() {
    this.closeMenu();
    this.deleteClicked.emit(this.workOrder());
  }

  closeMenu() {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  showTooltip() {
    if (this.tooltipRef) return;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
      ]);

    this.tooltipRef = this.overlay.create({ positionStrategy });
    this.tooltipRef.attach(new TemplatePortal(this.tooltipTemplate, this.viewContainerRef));
  }

  hideTooltip() {
    this.tooltipRef?.dispose();
    this.tooltipRef = null;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  ngOnDestroy() {
    this.closeMenu();
    this.hideTooltip();
  }
}
