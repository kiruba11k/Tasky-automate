import * as base from 'react/jsx-dev-runtime';
import { patch } from './shared';

export const Fragment = base.Fragment;
export const jsxDEV = (type, props, key, isStatic, source, self) => base.jsxDEV(type, patch(type, props), key, isStatic, source, self);
