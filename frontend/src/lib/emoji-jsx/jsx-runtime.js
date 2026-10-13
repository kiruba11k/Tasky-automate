import * as base from 'react/jsx-runtime';
import { patch } from './shared';

export const Fragment = base.Fragment;
export const jsx = (type, props, key) => base.jsx(type, patch(type, props), key);
export const jsxs = (type, props, key) => base.jsxs(type, patch(type, props), key);
