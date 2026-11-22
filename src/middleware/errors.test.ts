import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatZodError } from './errors.js';

describe('formatZodError', () => {
  it('turns Zod field errors into readable messages', () => {
    const result = z
      .object({
        serviceName: z.string().min(3),
        images: z.array(z.object({ url: z.string().url() })).min(1),
      })
      .safeParse({ serviceName: 'x', images: [] });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error)).toContain('Service Name must be at least 3 characters.');
      expect(formatZodError(result.error)).toContain('Images must contain at least 1 items.');
    }
  });
});
