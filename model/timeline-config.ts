/**
 * Timeline Configuration
 * Configurable settings for zoom levels and visible date ranges
 * Both frontend and backend can import and use these settings
 */

import { ZoomLevel } from './documents';

/**
 * Configuration for each zoom level
 * Defines the visible range (in hours) before and after the current/reference point
 */
export interface ZoomLevelConfig {
  label: string;
  /** Hours to display before the reference point */
  rangeBeforeHours: number;
  /** Hours to display after the reference point */
  rangeAfterHours: number;
  /** Column width in pixels for smallest time unit */
  columnWidthPixels: number;
}

/**
 * Timeline configuration by zoom level
 * Easily adjustable without changing core interfaces
 *
 * Example for Hour level:
 *   - rangeBeforeHours: 6 (show 6 hours before)
 *   - rangeAfterHours: 6 (show 6 hours after)
 *   - Total visible: 12 hours
 */
export const TIMELINE_CONFIG: Record<ZoomLevel, ZoomLevelConfig> = {
  hour: {
    label: 'Hour',
    rangeBeforeHours: 6,
    rangeAfterHours: 6,
    columnWidthPixels: 40, // pixels per hour
  },
  day: {
    label: 'Day',
    rangeBeforeHours: 24 * 14, // 14 days
    rangeAfterHours: 24 * 14, // 14 days
    columnWidthPixels: 80, // pixels per day
  },
  week: {
    label: 'Week',
    rangeBeforeHours: 24 * 7 * 8, // 8 weeks
    rangeAfterHours: 24 * 7 * 8, // 8 weeks
    columnWidthPixels: 100, // pixels per week
  },
  month: {
    label: 'Month',
    rangeBeforeHours: 24 * 30 * 6, // 6 months
    rangeAfterHours: 24 * 30 * 6, // 6 months
    columnWidthPixels: 120, // pixels per month
  },
};

/**
 * Get configuration for a specific zoom level
 */
export function getZoomConfig(zoom: ZoomLevel): ZoomLevelConfig {
  return TIMELINE_CONFIG[zoom];
}

/**
 * Calculate total visible hours for a zoom level
 */
export function getTotalVisibleHours(zoom: ZoomLevel): number {
  const config = getZoomConfig(zoom);
  return config.rangeBeforeHours + config.rangeAfterHours;
}

/**
 * Default zoom level to display on app load
 */
export const DEFAULT_ZOOM_LEVEL: ZoomLevel = 'month';

/**
 * All available zoom levels in order
 */
export const AVAILABLE_ZOOM_LEVELS: ZoomLevel[] = ['hour', 'day', 'week', 'month'];
