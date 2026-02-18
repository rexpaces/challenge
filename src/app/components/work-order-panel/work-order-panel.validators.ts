import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export const OVERLAP_DEBOUNCE_MS = 400;

/**
 * Group-level validator: endDate must be strictly after startDate.
 * Returns null if either date is absent (required validators handle those).
 */
export function endDateAfterStartDate(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;

    if (!startDate || !endDate) return null;

    return new Date(endDate) > new Date(startDate)
      ? null
      : { endDateBeforeStartDate: true };
  };
}

/**
 * Group-level async validator: checks whether the work order overlaps an
 * existing booking on the same work center.
 *
 * Debounced by OVERLAP_DEBOUNCE_MS — Angular cancels the previous subscription
 * on each value change, so rapid edits trigger only one check.
 *
 * @param checkFn  Pure callback supplied by the caller; receives the current
 *                 startDate and endDate strings and returns an Observable of
 *                 ValidationErrors or null. No service reference lives here.
 */
export function overlapValidator(
  checkFn: (startDate: string, endDate: string) => Observable<ValidationErrors | null>,
): AsyncValidatorFn {
  return (group: AbstractControl): Observable<ValidationErrors | null> => {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;
    if (!startDate || !endDate) return of(null);

    return timer(OVERLAP_DEBOUNCE_MS).pipe(
      switchMap(() => checkFn(startDate, endDate)),
    );
  };
}
