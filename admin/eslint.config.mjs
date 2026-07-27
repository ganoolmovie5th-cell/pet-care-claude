import next from 'eslint-config-next';
import nextTypescript from 'eslint-config-next/typescript';

// eslint 9 flat config. eslint-config-next v16 already exports flat arrays,
// so no FlatCompat shim is needed.
export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...next,
  ...nextTypescript,
];
