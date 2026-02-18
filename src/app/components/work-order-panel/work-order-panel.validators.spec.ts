import { FormControl, FormGroup } from '@angular/forms';
import { endDateAfterStartDate } from './work-order-panel.validators';

// ── endDateAfterStartDate ───────────────────────────────────────────────────

describe('endDateAfterStartDate', () => {
  function buildGroup(startDate: string | null, endDate: string | null): FormGroup {
    return new FormGroup(
      {
        startDate: new FormControl(startDate),
        endDate: new FormControl(endDate),
      },
      { validators: endDateAfterStartDate() },
    );
  }

  it('returns null when endDate is strictly after startDate', () => {
    const group = buildGroup('2025-01-01', '2025-01-08');
    expect(group.errors).toBeNull();
  });

  it('returns error when endDate equals startDate', () => {
    const group = buildGroup('2025-01-01', '2025-01-01');
    expect(group.errors).toEqual({ endDateBeforeStartDate: true });
  });

  it('returns error when endDate is before startDate', () => {
    const group = buildGroup('2025-01-08', '2025-01-01');
    expect(group.errors).toEqual({ endDateBeforeStartDate: true });
  });

  it('returns null when startDate is absent', () => {
    const group = buildGroup(null, '2025-01-08');
    expect(group.errors).toBeNull();
  });

  it('returns null when endDate is absent', () => {
    const group = buildGroup('2025-01-01', null);
    expect(group.errors).toBeNull();
  });

  it('returns null when both dates are absent', () => {
    const group = buildGroup(null, null);
    expect(group.errors).toBeNull();
  });

  it('returns null when endDate is one day after startDate', () => {
    const group = buildGroup('2025-06-15', '2025-06-16');
    expect(group.errors).toBeNull();
  });

  it('returns error when endDate is one day before startDate', () => {
    const group = buildGroup('2025-06-16', '2025-06-15');
    expect(group.errors).toEqual({ endDateBeforeStartDate: true });
  });

  it('updates errors reactively when a date value changes', () => {
    const group = buildGroup('2025-01-01', '2025-01-08');
    expect(group.errors).toBeNull();

    group.get('endDate')!.setValue('2024-12-31');
    expect(group.errors).toEqual({ endDateBeforeStartDate: true });

    group.get('endDate')!.setValue('2025-02-01');
    expect(group.errors).toBeNull();
  });
});

