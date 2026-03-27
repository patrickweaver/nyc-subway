import { z } from 'zod';
import { LineGroup } from './types';

export const LineGroupEnum = z.enum(LineGroup);
