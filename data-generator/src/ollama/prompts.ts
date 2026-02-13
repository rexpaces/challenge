/**
 * LLM prompt templates for generating realistic work order data
 */

/**
 * Generate realistic work center names
 */
export function getWorkCenterPrompt(count: number): string {
  return `You are generating realistic manufacturing facility work center names for a factory scheduling system.

Generate exactly ${count} unique work center names in valid JSON array format.
Each object should have a "name" property only.

Work centers should be diverse: production lines, machines, assembly stations, quality control areas, etc.
Make names realistic and specific (e.g., "Injection Molding Line B", "CNC Machine 3", "Packaging Station").

Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Example format:
[
  { "name": "Extrusion Line A" },
  { "name": "CNC Machine 1" }
]`;
}

/**
 * Generate realistic work order names and statuses for a specific work center
 */
export function getWorkOrderPrompt(
  centerName: string,
  count: number,
  dateRange: { start: string; end: string }
): string {
  return `You are generating realistic work orders for a manufacturing scheduling system.

Generate exactly ${count} unique work orders for the work center: "${centerName}"
Date range available: ${dateRange.start} to ${dateRange.end}

Each work order should have:
- "name": Realistic order name (e.g., "Order #2401", "Customer XYZ Assembly", "Batch-001")
- "status": One of: "open", "in-progress", "complete", "blocked"

Make names specific to manufacturing (order numbers, customer names, job types).
Vary the statuses naturally (not all complete, not all open).

Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Example format:
[
  { "name": "Order #2401", "status": "open" },
  { "name": "Customer ABC Assembly", "status": "in-progress" }
]`;
}
