import { typeRule } from './type';
import type { Rule } from '../types';

/** Rules in report order: structural changes first, then constraints. */
export const defaultRules: readonly Rule[] = [typeRule];

export { typeRule };
