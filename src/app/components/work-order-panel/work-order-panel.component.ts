import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { WorkOrderDocument, WorkOrderStatus } from '../../../model';
import { WorkCenterService, WorkCenterWithOrders } from '../../services/workcenters.service';
import { endDateAfterStartDate, overlapValidator } from './work-order-panel.validators';

export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'blocked', label: 'Blocked' },
];

@Component({
  selector: 'app-work-order-panel',
  standalone: true,
  imports: [CommonModule, NgSelectModule, ReactiveFormsModule],
  templateUrl: './work-order-panel.component.html',
  styleUrl: './work-order-panel.component.scss',
})
export class WorkOrderPanelComponent {
  private fb = inject(FormBuilder);
  private workCenterService = inject(WorkCenterService);

  isOpen = signal(false);
  isEditMode = signal(false);
  readonly statusOptions = STATUS_OPTIONS;

  private overlapContext = {
    workCenterId: null as string | null,
    excludeDocId: null as string | null,
  };

  form = this.fb.group(
    {
      name: ['', Validators.required],
      status: ['open' as string, Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    },
    {
      validators: endDateAfterStartDate(),
      asyncValidators: overlapValidator((startDate, endDate) =>
        this.runOverlapCheck(startDate, endDate),
      ),
    },
  );

  get nameControl() { return this.form.controls.name; }
  get statusControl() { return this.form.controls.status; }
  get startDateControl() { return this.form.controls.startDate; }
  get endDateControl() { return this.form.controls.endDate; }

  open(workCenter: WorkCenterWithOrders, startDate?: Date) {
    const start = startDate ?? new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    this.overlapContext = { workCenterId: workCenter.docId, excludeDocId: null };

    this.form.reset({
      name: '',
      status: 'open',
      startDate: this.toDateInputValue(start),
      endDate: this.toDateInputValue(end),
    });
    this.isEditMode.set(false);
    this.isOpen.set(true);
  }

  openForEdit(workCenter: WorkCenterWithOrders, data: WorkOrderDocument) {
    this.overlapContext = { workCenterId: data.data.workCenterId, excludeDocId: data.docId };

    this.form.reset({
      name: data.data.name,
      status: data.data.status,
      startDate: data.data.startDate.substring(0, 10),
      endDate: data.data.endDate.substring(0, 10),
    });
    this.isEditMode.set(true);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }

  onSubmit() {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    const { workCenterId, excludeDocId } = this.overlapContext;
    if (!workCenterId) return;

    const v = this.form.getRawValue();
    const data = {
      name: v.name!,
      workCenterId,
      status: v.status as WorkOrderStatus,
      startDate: new Date(v.startDate!).toISOString(),
      endDate: new Date(v.endDate!).toISOString(),
    };

    if (this.isEditMode() && excludeDocId) {
      this.workCenterService.updateWorkOrder({ docId: excludeDocId, docType: 'workOrder', data });
    } else {
      this.workCenterService.addWorkOrder({ docId: crypto.randomUUID(), docType: 'workOrder', data });
    }

    this.close();
  }

  private runOverlapCheck(startDate: string, endDate: string): Observable<ValidationErrors | null> {
    const { workCenterId, excludeDocId } = this.overlapContext;
    if (!workCenterId) return of(null);

    const orders = this.workCenterService.getOrdersForCenter(workCenterId);
    const hasOverlap = this.workCenterService.hasOverlapOnCenter(
      { name: '', workCenterId, status: 'open', startDate, endDate },
      orders,
      excludeDocId ?? undefined,
    );
    return of(hasOverlap ? { workCenterOverlap: true } : null);
  }

  private toDateInputValue(date: Date): string {
    return date.toISOString().substring(0, 10);
  }
}
