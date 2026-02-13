/**
 * Main data generator orchestrator
 */

import { GeneratorConfig, GeneratedData } from './config';
import { OllamaClient } from '../ollama/ollama-client';
import { WorkCenterGenerator } from './work-center-generator';
import { WorkOrderGenerator } from './work-order-generator';

export async function generateSampleData(config: GeneratorConfig): Promise<GeneratedData> {
  console.log('🚀 Starting data generation...');
  console.log(`   Model: ${config.model}`);
  console.log(`   Work Centers: ${config.numCenters}`);
  console.log(`   Orders per Center: ${config.ordersPerCenter}`);
  console.log(`   Batch Size: ${config.batchSize}`);

  const ollamaClient = new OllamaClient();

  // Check if Ollama is available
  console.log('\n🔍 Checking Ollama connection...');
  const modelAvailable = await ollamaClient.checkModel(config.model);
  if (!modelAvailable) {
    throw new Error(
      `Model '${config.model}' not found or Ollama not running.\n` +
      `Please:\n` +
      `  1. Start Ollama: ollama serve\n` +
      `  2. Pull the model: ollama pull ${config.model}`
    );
  }
  console.log(`✓ Ollama is ready with model '${config.model}'`);

  // Generate work centers
  const centerGenerator = new WorkCenterGenerator(ollamaClient);
  const workCenters = await centerGenerator.generate(
    config.numCenters,
    config.batchSize,
    config.model
  );

  if (workCenters.length === 0) {
    throw new Error('Failed to generate any work centers');
  }

  // Generate work orders
  const orderGenerator = new WorkOrderGenerator(ollamaClient);
  const { orders: workOrders, stats: orderStats } = await orderGenerator.generate(
    workCenters,
    config.ordersPerCenter,
    config.batchSize,
    config.model
  );

  console.log(`\n📊 Final Statistics:`);
  console.log(`   Work Centers: ${workCenters.length} unique`);
  console.log(`   Work Orders: ${workOrders.length} (valid & unique)`);

  return {
    workCenters,
    workOrders,
    stats: {
      totalGenerated: orderStats.generated,
      totalValid: orderStats.valid,
      totalDiscarded: orderStats.discarded
    }
  };
}

export { GeneratorConfig, GeneratedData };
