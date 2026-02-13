/**
 * Work order data generation
 */

import type { WorkOrderDocument, WorkCenterDocument, WorkOrderStatus } from './config';
import { DataValidator } from './data-validator';
import { OllamaClient } from '../ollama/ollama-client';
import { getWorkOrderPrompt } from '../ollama/prompts';
import { parseJSON, validateArray } from '../ollama/json-parser';

interface GeneratedWorkOrder {
  name: string;
  status: string;
}

/**
 * Work order data (internal type, matches /model/documents.ts)
 */
interface WorkOrderData {
  name: string;
  workCenterId: string;
  status: 'open' | 'in-progress' | 'complete' | 'blocked';
  startDate: string;
  endDate: string;
}

/**
 * Generate a random date within a range
 */
function randomDateInRange(startDate: Date, endDate: Date): string {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const random = start + Math.random() * (end - start);
  return new Date(random).toISOString();
}

/**
 * Normalize status string to valid WorkOrderStatus
 */
function normalizeStatus(status: string): WorkOrderStatus {
  const normalized = status.toLowerCase().trim();
  const validStatuses: WorkOrderStatus[] = ['open', 'in-progress', 'complete', 'blocked'];

  if (validStatuses.includes(normalized as WorkOrderStatus)) {
    return normalized as WorkOrderStatus;
  }

  // Fallback to random status if invalid
  return validStatuses[Math.floor(Math.random() * validStatuses.length)];
}

/**
 * Generate date range for a batch of work orders
 */
function generateDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30); // 30 days ago

  const end = new Date(now);
  end.setDate(end.getDate() + 60); // 60 days from now

  return { start, end };
}

export class WorkOrderGenerator {
  constructor(private ollamaClient: OllamaClient) {}

  /**
   * Generate work orders for all work centers
   */
  async generate(
    workCenters: WorkCenterDocument[],
    ordersPerCenter: number,
    batchSize: number,
    model: string
  ): Promise<{ orders: WorkOrderDocument[]; stats: { generated: number; valid: number; discarded: number } }> {
    const allOrders: WorkOrderDocument[] = [];
    let docIdCounter = 1;
    let totalGenerated = 0;
    let totalValid = 0;
    let totalDiscarded = 0;

    console.log(`\n📋 Generating ${workCenters.length} centers × ${ordersPerCenter} orders = ${workCenters.length * ordersPerCenter} total orders...`);

    for (const center of workCenters) {
      const centerOrders: WorkOrderDocument[] = [];

      for (let i = 0; i < ordersPerCenter; i += batchSize) {
        const remaining = ordersPerCenter - i;
        const currentBatchSize = Math.min(batchSize, remaining);
        const dateRange = generateDateRange();

        try {
          const prompt = getWorkOrderPrompt(
            center.data.name,
            currentBatchSize,
            {
              start: dateRange.start.toISOString().split('T')[0],
              end: dateRange.end.toISOString().split('T')[0]
            }
          );

          const response = await this.ollamaClient.generateText(model, prompt);
          const parsed = parseJSON<GeneratedWorkOrder[]>(response);
          const validated = validateArray<GeneratedWorkOrder>(parsed);

          for (const item of validated) {
            totalGenerated++;

            const newOrderData: WorkOrderData = {
              name: item.name,
              workCenterId: center.docId,
              status: normalizeStatus(item.status),
              startDate: randomDateInRange(dateRange.start, dateRange.end),
              endDate: ''
            };

            // Generate end date (after start date)
            const startDateObj = new Date(newOrderData.startDate);
            const endDateObj = new Date(startDateObj);
            endDateObj.setHours(endDateObj.getHours() + Math.floor(Math.random() * 72) + 1); // 1-72 hours later
            newOrderData.endDate = endDateObj.toISOString();

            // Validate: format, overlaps, and duplicates
            if (
              DataValidator.isValidWorkOrder(newOrderData) &&
              !DataValidator.hasOverlapOnCenter(newOrderData, centerOrders) &&
              !DataValidator.isDuplicateWorkOrder(newOrderData.name, centerOrders, center.docId)
            ) {
              const workOrder: WorkOrderDocument = {
                docId: `wo-${docIdCounter++}`,
                docType: 'workOrder',
                data: newOrderData
              };

              centerOrders.push(workOrder);
              allOrders.push(workOrder);
              totalValid++;
            } else {
              totalDiscarded++;
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`  ✗ Work orders for ${center.data.name} batch ${i}-${i + currentBatchSize} failed: ${errorMsg}`);
        }
      }

      console.log(`  ✓ ${center.data.name}: ${centerOrders.length} valid orders`);
    }

    console.log(`\n✅ Work order generation complete:`);
    console.log(`   Total generated: ${totalGenerated}`);
    console.log(`   Valid (no overlaps): ${totalValid}`);
    console.log(`   Discarded (overlaps): ${totalDiscarded}`);

    return {
      orders: allOrders,
      stats: {
        generated: totalGenerated,
        valid: totalValid,
        discarded: totalDiscarded
      }
    };
  }
}
