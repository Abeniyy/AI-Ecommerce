// client/src/lib/track.js
import { api } from '../services/api';
import { getSessionId } from './session';

/**
 * Record a user interaction.
 * @param {'view'|'add_to_cart'|'purchase'} event
 * @param {number} product_id
 */
export async function track(event, product_id) {
  try {
    await api.post('/api/events', {
      event,
      product_id,
      session_id: getSessionId(),
    });
  } catch {
    // Tracking should never block the UI; ignore failures silently.
  }
}
