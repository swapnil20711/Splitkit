// Reexport the native module. On web, it will be resolved to SplitkitModule.web.ts
// and on native platforms to SplitkitModule.ts
export { default } from './SplitkitModule';
export * from './Splitkit.types';
