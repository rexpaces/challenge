/**
 * JSON parsing utilities for handling LLM responses
 */

/**
 * Parse JSON from LLM response, handling markdown code blocks and whitespace
 * @param response Raw response from LLM
 * @returns Parsed JSON object
 * @throws Error if JSON is invalid
 */
export function parseJSON<T = any>(response: string): T {
  let cleanedResponse = response.trim();

  // Remove markdown code blocks if present
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  cleanedResponse = cleanedResponse.trim();

  try {
    return JSON.parse(cleanedResponse) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}\n\nResponse: ${response.substring(0, 200)}`);
  }
}

/**
 * Validate that parsed JSON is an array
 */
export function validateArray<T = any>(data: any): T[] {
  if (!Array.isArray(data)) {
    throw new Error(`Expected array, got ${typeof data}`);
  }
  return data as T[];
}
