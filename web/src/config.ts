/**
 * App configuration — API base URL from the environment (VITE_API_URL),
 * defaulting to the production worker. The shared ApiService is configured
 * once at boot so REST calls and derived WS urls use the same base.
 */

import { ApiService } from '../../shared/api/ApiService';
import { API_BASE_URL } from '../../shared/api/contracts';

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ??
  API_BASE_URL;

ApiService.configure(API_URL);
