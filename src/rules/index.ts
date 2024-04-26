import { additionalPropertiesRule } from './additional-properties';
import { boundsRule } from './bounds';
import { enumRule } from './enum';
import { itemsRule } from './items';
import { propertiesRule } from './properties';
import { requiredRule } from './required';
import { typeRule } from './type';
import type { Rule } from '../types';

/** Rules in report order: structural changes first, then constraints. */
export const defaultRules: readonly Rule[] = [
  typeRule,
  propertiesRule,
  requiredRule,
  additionalPropertiesRule,
  enumRule,
  boundsRule,
  itemsRule,
];

export {
  additionalPropertiesRule,
  boundsRule,
  enumRule,
  itemsRule,
  propertiesRule,
  requiredRule,
  typeRule,
};
