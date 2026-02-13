/**
 * Work center data generation
 */

import type { WorkCenterDocument } from './config';
import { DataValidator } from './data-validator';
import { OllamaClient } from '../ollama/ollama-client';
import { getWorkCenterPrompt } from '../ollama/prompts';
import { parseJSON, validateArray } from '../ollama/json-parser';

interface GeneratedWorkCenter {
  name: string;
}

export class WorkCenterGenerator {
  constructor(private ollamaClient: OllamaClient) {}

  /**
   * Generate work centers using LLM
   */
  async generate(
    numCenters: number,
    batchSize: number,
    model: string
  ): Promise<WorkCenterDocument[]> {
    const workCenters: WorkCenterDocument[] = [];
    let docIdCounter = 1;

    console.log(`\n📍 Generating ${numCenters} work centers in batches of ${batchSize}...`);

    for (let i = 0; i < numCenters; i += batchSize) {
      const remaining = numCenters - i;
      const currentBatchSize = Math.min(batchSize, remaining);

      try {
        const prompt = getWorkCenterPrompt(currentBatchSize);
        const response = await this.ollamaClient.generateText(model, prompt);
        const parsed = parseJSON<GeneratedWorkCenter[]>(response);
        const validated = validateArray<GeneratedWorkCenter>(parsed);

        for (const item of validated) {
          // Validate name format and check for duplicates
          if (
            DataValidator.isValidWorkCenter(item.name) &&
            !DataValidator.isDuplicateWorkCenter(
              item.name,
              workCenters.map(c => ({ name: c.data.name }))
            )
          ) {
            workCenters.push({
              docId: `wc-${docIdCounter++}`,
              docType: 'workCenter',
              data: {
                name: item.name
              }
            });
          }
        }

        const progress = Math.min(i + currentBatchSize, numCenters);
        console.log(`  ✓ Generated ${progress}/${numCenters} work centers`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ Batch ${i}-${i + currentBatchSize} failed: ${errorMsg}`);
      }
    }

    console.log(`\n✅ Generated ${workCenters.length} valid work centers`);
    return workCenters;
  }
}
