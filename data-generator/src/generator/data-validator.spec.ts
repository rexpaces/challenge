/**
 * Unit tests for DataValidator class
 * Focuses on overlap detection, duplicate checking, and validation rules
 */


import type { WorkOrderData, WorkOrderDocument } from './config';
import { DataValidator } from './data-validator';

describe('DataValidator', () => {
  // Helper function to create test work order data
  function createWorkOrder(
    startDate: string,
    endDate: string,
    workCenterId: string = 'wc-1',
    name: string = 'Test Order'
  ): WorkOrderData {
    return {
      name,
      workCenterId,
      status: 'open',
      startDate,
      endDate
    };
  }

  // Helper function to create a work order document
  function createWorkOrderDocument(
    docId: string,
    startDate: string,
    endDate: string,
    workCenterId: string = 'wc-1',
    name: string = 'Test Order'
  ): WorkOrderDocument {
    return {
      docId,
      docType: 'workOrder',
      data: createWorkOrder(startDate, endDate, workCenterId, name)
    };
  }

  describe('Overlap Detection - Category 1: NO OVERLAP (Gap between orders)', () => {
    it('Test #1: Order 1 completely before Order 2 (3-day gap)', () => {
      const order1 = createWorkOrder(
        '2025-01-10T00:00:00',
        '2025-01-12T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T00:00:00', '2025-01-20T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(false);
    });

    it('Test #2: Order 1 completely after Order 2 (5-day gap)', () => {
      const order1 = createWorkOrder(
        '2025-01-20T00:00:00',
        '2025-01-25T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-15T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(false);
    });

    it('Test #3: With hours/minutes - ~25 hour gap', () => {
      const order1 = createWorkOrder(
        '2025-01-10T17:30:00',
        '2025-01-11T08:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-12T09:00:00', '2025-01-13T17:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(false);
    });
  });

  describe('Overlap Detection - Category 2: TOUCH AT EDGES (Should overlap)', () => {
    it('Test #4: Order 1 ends EXACTLY when Order 2 starts (touching)', () => {
      const order1 = createWorkOrder(
        '2025-01-10T10:00:00',
        '2025-01-15T10:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T10:00:00', '2025-01-20T10:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      // Touching edges should be considered overlapping
      expect(hasOverlap).toBe(true);
    });

    it('Test #5: Order 2 ends EXACTLY when Order 1 starts (touching)', () => {
      const order1 = createWorkOrder(
        '2025-01-15T17:30:00',
        '2025-01-18T09:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-10T08:00:00', '2025-01-15T17:30:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      // Touching edges should be considered overlapping
      expect(hasOverlap).toBe(true);
    });
  });

  describe('Overlap Detection - Category 3: PARTIAL OVERLAP', () => {
    it('Test #6: Order 1 starts before, overlaps middle of Order 2 (5-day overlap)', () => {
      const order1 = createWorkOrder(
        '2025-01-10T00:00:00',
        '2025-01-17T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T00:00:00', '2025-01-20T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Test #7: Order 1 starts after start of Order 2, before end (4-day overlap)', () => {
      const order1 = createWorkOrder(
        '2025-01-16T00:00:00',
        '2025-01-25T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-20T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Test #8: Orders overlap by 1-day only (with hour granularity)', () => {
      const order1 = createWorkOrder(
        '2025-01-10T00:00:00',
        '2025-01-15T09:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T17:00:00', '2025-01-20T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      // These don't overlap - 8 hours apart
      expect(hasOverlap).toBe(false);
    });

    it('Test #8b: Orders overlap by partial day with hour granularity', () => {
      const order1 = createWorkOrder(
        '2025-01-10T00:00:00',
        '2025-01-15T18:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T17:00:00', '2025-01-20T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      // These overlap by 1 hour
      expect(hasOverlap).toBe(true);
    });
  });

  describe('Overlap Detection - Category 4: COMPLETE CONTAINMENT', () => {
    it('Test #9: Order 2 completely contains Order 1', () => {
      const order1 = createWorkOrder(
        '2025-01-15T00:00:00',
        '2025-01-18T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-25T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Test #10: Order 1 completely contains Order 2', () => {
      const order1 = createWorkOrder(
        '2025-01-10T00:00:00',
        '2025-01-25T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T00:00:00', '2025-01-18T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });
  });

  describe('Overlap Detection - Category 5: IDENTICAL TIME RANGES', () => {
    it('Test #11: Both orders have exact same start and end time', () => {
      const order1 = createWorkOrder(
        '2025-01-15T10:00:00',
        '2025-01-20T17:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T10:00:00', '2025-01-20T17:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Test #12: Same start time, different end time', () => {
      const order1 = createWorkOrder(
        '2025-01-15T10:00:00',
        '2025-01-18T09:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T10:00:00', '2025-01-25T17:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Test #13: Same end time, different start time', () => {
      const order1 = createWorkOrder(
        '2025-01-10T08:00:00',
        '2025-01-20T17:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T10:00:00', '2025-01-20T17:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });
  });

  describe('Overlap Detection - Category 6: EDGE CASES WITH DATETIME', () => {
    it('Test #14: Overlap by milliseconds only (edge precision)', () => {
      const order1 = createWorkOrder(
        '2025-01-15T10:00:00.000Z',
        '2025-01-15T10:00:00.001Z'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-15T10:00:00.001Z', '2025-01-20T17:00:00.000Z')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      // Touching at millisecond precision should overlap
      expect(hasOverlap).toBe(true);
    });

    it('Test #15: Midnight boundary crossing', () => {
      const order1 = createWorkOrder(
        '2025-01-15T23:59:59',
        '2025-01-16T00:00:01'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-16T00:00:00', '2025-01-20T10:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Test #16: Very long order vs very short order (year vs hour)', () => {
      const order1 = createWorkOrder(
        '2025-06-15T10:00:00',
        '2025-06-15T11:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-01T00:00:00', '2025-12-31T23:59:59')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });
  });

  describe('Overlap Detection - Multiple Orders on Same Center', () => {
    it('Should detect overlap with first order in list of many', () => {
      const order1 = createWorkOrder(
        '2025-01-10T00:00:00',
        '2025-01-15T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-12T00:00:00', '2025-01-18T00:00:00'),
        createWorkOrderDocument('wo-2', '2025-02-01T00:00:00', '2025-02-05T00:00:00'),
        createWorkOrderDocument('wo-3', '2025-03-01T00:00:00', '2025-03-10T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Should detect overlap with last order in list of many', () => {
      const order1 = createWorkOrder(
        '2025-03-05T00:00:00',
        '2025-03-12T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-12T00:00:00', '2025-01-18T00:00:00'),
        createWorkOrderDocument('wo-2', '2025-02-01T00:00:00', '2025-02-05T00:00:00'),
        createWorkOrderDocument('wo-3', '2025-03-01T00:00:00', '2025-03-10T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });

    it('Should not detect overlap when order fits between existing orders', () => {
      const order1 = createWorkOrder(
        '2025-02-10T00:00:00',
        '2025-02-20T00:00:00'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-12T00:00:00', '2025-01-18T00:00:00'),
        createWorkOrderDocument('wo-2', '2025-03-01T00:00:00', '2025-03-05T00:00:00')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(false);
    });
  });

  describe('Overlap Detection - Work Center Filtering', () => {
    it('Should only check overlap with orders on same work center', () => {
      const order1 = createWorkOrder(
        '2025-01-15T00:00:00',
        '2025-01-20T00:00:00',
        'wc-2' // Different center
      );
      const existingOrders = [
        // This overlaps, but on different center
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-18T00:00:00', 'wc-1'),
        // This is on same center but no overlap
        createWorkOrderDocument('wo-2', '2025-02-01T00:00:00', '2025-02-05T00:00:00', 'wc-2')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      // Should NOT overlap because only wc-2 orders are checked
      expect(hasOverlap).toBe(false);
    });

    it('Should detect overlap only with same work center', () => {
      const order1 = createWorkOrder(
        '2025-01-15T00:00:00',
        '2025-01-20T00:00:00',
        'wc-2'
      );
      const existingOrders = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-18T00:00:00', 'wc-1'),
        // This overlaps AND is on same center
        createWorkOrderDocument('wo-2', '2025-01-17T00:00:00', '2025-01-22T00:00:00', 'wc-2')
      ];

      const hasOverlap = DataValidator.hasOverlapOnCenter(order1, existingOrders);

      expect(hasOverlap).toBe(true);
    });
  });

  describe('Work Order Validation - isValidWorkOrder', () => {
    it('Should accept valid work order', () => {
      const order = createWorkOrder(
        '2025-01-10T10:00:00',
        '2025-01-15T17:00:00'
      );

      const isValid = DataValidator.isValidWorkOrder(order);

      expect(isValid).toBe(true);
    });

    it('Should reject order with missing name', () => {
      const order: WorkOrderData = {
        name: '',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2025-01-10T10:00:00',
        endDate: '2025-01-15T17:00:00'
      };

      const isValid = DataValidator.isValidWorkOrder(order);

      expect(isValid).toBe(false);
    });

    it('Should reject order with missing work center ID', () => {
      const order: WorkOrderData = {
        name: 'Test Order',
        workCenterId: '',
        status: 'open',
        startDate: '2025-01-10T10:00:00',
        endDate: '2025-01-15T17:00:00'
      };

      const isValid = DataValidator.isValidWorkOrder(order);

      expect(isValid).toBe(false);
    });

    it('Should reject order with invalid status', () => {
      const order: any = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'invalid-status',
        startDate: '2025-01-10T10:00:00',
        endDate: '2025-01-15T17:00:00'
      };

      const isValid = DataValidator.isValidWorkOrder(order);

      expect(isValid).toBe(false);
    });

    it('Should reject order with end date before start date', () => {
      const order = createWorkOrder(
        '2025-01-15T10:00:00',
        '2025-01-10T17:00:00' // End before start
      );

      const isValid = DataValidator.isValidWorkOrder(order);

      expect(isValid).toBe(false);
    });

    it('Should reject order with invalid start date', () => {
      const order: any = {
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: 'invalid-date',
        endDate: '2025-01-15T17:00:00'
      };

      const isValid = DataValidator.isValidWorkOrder(order);

      expect(isValid).toBe(false);
    });

    it('Should allow all valid status types', () => {
      const statuses: Array<'open' | 'in-progress' | 'complete' | 'blocked'> = [
        'open',
        'in-progress',
        'complete',
        'blocked'
      ];

      statuses.forEach(status => {
        const order: any = {
          name: 'Test Order',
          workCenterId: 'wc-1',
          status,
          startDate: '2025-01-10T10:00:00',
          endDate: '2025-01-15T17:00:00'
        };

        const isValid = DataValidator.isValidWorkOrder(order);
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Work Center Validation - isValidWorkCenter', () => {
    it('Should accept valid work center name', () => {
      const isValid = DataValidator.isValidWorkCenter('Extrusion Line A');

      expect(isValid).toBe(true);
    });

    it('Should reject empty name', () => {
      const isValid = DataValidator.isValidWorkCenter('');

      expect(isValid).toBe(false);
    });

    it('Should reject whitespace-only name', () => {
      const isValid = DataValidator.isValidWorkCenter('   ');

      expect(isValid).toBe(false);
    });

    it('Should accept name with leading/trailing spaces (trimmed)', () => {
      const isValid = DataValidator.isValidWorkCenter('  CNC Machine 1  ');

      expect(isValid).toBe(true);
    });
  });

  describe('Duplicate Detection - isDuplicateWorkCenter', () => {
    it('Should detect exact duplicate', () => {
      const existing = [{ name: 'Extrusion Line A' }];

      const isDuplicate = DataValidator.isDuplicateWorkCenter('Extrusion Line A', existing);

      expect(isDuplicate).toBe(true);
    });

    it('Should detect case-insensitive duplicate', () => {
      const existing = [{ name: 'Extrusion Line A' }];

      const isDuplicate = DataValidator.isDuplicateWorkCenter('extrusion line a', existing);

      expect(isDuplicate).toBe(true);
    });

    it('Should detect duplicate with different spacing', () => {
      const existing = [{ name: 'Extrusion   Line A' }];

      const isDuplicate = DataValidator.isDuplicateWorkCenter('Extrusion Line A', existing);

      expect(isDuplicate).toBe(false); // Different spacing is not trimmed in comparison
    });

    it('Should not detect duplicate when name is different', () => {
      const existing = [{ name: 'Extrusion Line A' }];

      const isDuplicate = DataValidator.isDuplicateWorkCenter('Extrusion Line B', existing);

      expect(isDuplicate).toBe(false);
    });

    it('Should handle empty existing list', () => {
      const existing: { name: string }[] = [];

      const isDuplicate = DataValidator.isDuplicateWorkCenter('Extrusion Line A', existing);

      expect(isDuplicate).toBe(false);
    });

    it('Should detect duplicate in list of many centers', () => {
      const existing = [
        { name: 'Line A' },
        { name: 'Line B' },
        { name: 'Line C' },
        { name: 'Machine 1' },
        { name: 'Machine 2' }
      ];

      const isDuplicate = DataValidator.isDuplicateWorkCenter('machine 2', existing);

      expect(isDuplicate).toBe(true);
    });
  });

  describe('Duplicate Detection - isDuplicateWorkOrder', () => {
    it('Should detect exact duplicate order name on same center', () => {
      const existing = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-12T00:00:00', 'wc-1', 'Order #1001')
      ];

      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'Order #1001',
        existing,
        'wc-1'
      );

      expect(isDuplicate).toBe(true);
    });

    it('Should detect case-insensitive duplicate', () => {
      const existing = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-12T00:00:00', 'wc-1', 'Order #1001')
      ];

      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'order #1001',
        existing,
        'wc-1'
      );

      expect(isDuplicate).toBe(true);
    });

    it('Should allow same name on different work centers', () => {
      const existing = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-12T00:00:00', 'wc-1')
      ];

      // Same name, but different center
      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'Order #1001',
        existing,
        'wc-2' // Different center
      );

      expect(isDuplicate).toBe(false);
    });

    it('Should not detect duplicate when name is different', () => {
      const existing = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-12T00:00:00', 'wc-1', 'Order #1001')
      ];

      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'Order #1002',
        existing,
        'wc-1'
      );

      expect(isDuplicate).toBe(false);
    });

    it('Should handle empty existing list', () => {
      const existing: WorkOrderDocument[] = [];

      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'Order #1001',
        existing,
        'wc-1'
      );

      expect(isDuplicate).toBe(false);
    });

    it('Should detect duplicate in list of many orders on same center', () => {
      const existing = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-12T00:00:00', 'wc-1', 'Order #1001'),
        createWorkOrderDocument('wo-2', '2025-01-15T00:00:00', '2025-01-18T00:00:00', 'wc-1', 'Order #1002'),
        createWorkOrderDocument('wo-3', '2025-01-20T00:00:00', '2025-01-25T00:00:00', 'wc-1', 'Order #2001')
      ];

      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'Order #2001',
        existing,
        'wc-1'
      );

      expect(isDuplicate).toBe(true);
    });

    it('Should only check orders on the specified work center', () => {
      const existing = [
        createWorkOrderDocument('wo-1', '2025-01-10T00:00:00', '2025-01-12T00:00:00', 'wc-1', 'Order #1001'),
        createWorkOrderDocument('wo-2', '2025-01-15T00:00:00', '2025-01-18T00:00:00', 'wc-2', 'Order #2001'),
        createWorkOrderDocument('wo-3', '2025-01-20T00:00:00', '2025-01-25T00:00:00', 'wc-2', 'Order #2002')
      ];

      // This name exists on wc-2, but we're checking wc-3
      const isDuplicate = DataValidator.isDuplicateWorkOrder(
        'Order #2001',
        existing,
        'wc-3'
      );

      expect(isDuplicate).toBe(false);
    });
  });
});
