#!/usr/bin/env node

/**
 * CLI entry point for work order data generator
 *
 * Usage:
 *   npm run generate -- --centers 50 --orders 20 --output generated/data.json
 *   npm run generate:small
 *   npm run generate:medium
 *   npm run generate:large
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateSampleData } from './generator';
import { writeJSON, getFileStats } from './output/file-writer';
import { DEFAULT_CONFIG } from './generator/config';

async function main() {
  const args = yargs(hideBin(process.argv))
    .option('centers', {
      alias: 'c',
      describe: 'Number of work centers to generate',
      default: DEFAULT_CONFIG.numCenters,
      type: 'number'
    })
    .option('orders', {
      alias: 'o',
      describe: 'Work orders per center',
      default: DEFAULT_CONFIG.ordersPerCenter,
      type: 'number'
    })
    .option('output', {
      alias: 'f',
      describe: 'Output file path',
      default: 'generated/sample-data.json',
      type: 'string'
    })
    .option('batch-size', {
      describe: 'Items per LLM prompt',
      default: DEFAULT_CONFIG.batchSize,
      type: 'number'
    })
    .option('model', {
      describe: 'Ollama model name',
      default: DEFAULT_CONFIG.model,
      type: 'string'
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Verbose output',
      default: false,
      type: 'boolean'
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  try {
    console.log('='.repeat(60));
    console.log('   Work Order Data Generator');
    console.log('='.repeat(60));

    const startTime = Date.now();

    const data = await generateSampleData({
      numCenters: args.centers,
      ordersPerCenter: args.orders,
      batchSize: args['batch-size'],
      model: args.model
    });

    console.log('\n💾 Writing output file...');
    await writeJSON(args.output, data);
    const fileSize = getFileStats(args.output);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS');
    console.log('='.repeat(60));
    console.log(`📊 Generated Data:`);
    console.log(`   Work Centers: ${data.workCenters.length}`);
    console.log(`   Work Orders: ${data.workOrders.length}`);
    console.log(`   Valid Orders: ${data.stats.totalValid}`);
    console.log(`   Discarded (overlaps): ${data.stats.totalDiscarded}`);
    console.log(`\n💾 Output:`);
    console.log(`   File: ${args.output}`);
    console.log(`   Size: ${fileSize}`);
    console.log(`\n⏱️  Generation took ${duration}s`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR');
    console.error('='.repeat(60));
    console.error(error instanceof Error ? error.message : String(error));
    console.error('='.repeat(60));

    if (args.verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    console.error('\n💡 Tips:');
    console.error('   • Make sure Ollama is running: ollama serve');
    console.error(`   • Make sure model is available: ollama pull ${args.model}`);
    console.error('   • Check Ollama is accessible at http://localhost:11434');
    console.error('   • Use --verbose flag for more details\n');

    process.exit(1);
  }
}

main();
