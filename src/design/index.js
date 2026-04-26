/**
 * Design system entry point.
 *
 * Usage:
 *   import { Stack, Box, Text, color, space, motion } from '@/design';
 *
 * Rule: any new page/component imports from here. No magic numbers in new code.
 */

export { Stack } from './Stack';
export { Box }   from './Box';
export { Text }  from './Text';

export {
  color,
  space,
  type,
  fontFamily,
  radius,
  shadow,
  motion,
  z,
  layout,
  bp,
  media,
} from './tokens';
