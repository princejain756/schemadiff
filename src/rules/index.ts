import { enumRule } from './enum';
import { propertiesRule } from './properties';
import { requiredRule } from './required';
import { typeRule } from './type';
import type { Rule } from '../types';

/** Rules in report order: structural changes first, then constraints. */
export const defaultRules: readonly Rule[] = [typeRule, propertiesRule, requiredRule, enumRule];

export { enumRule, propertiesRule, requiredRule, typeRule };
