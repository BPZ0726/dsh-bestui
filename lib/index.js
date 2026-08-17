/**
 * dsh-bestui — host half.
 *
 * This plugin is browser-only: everything lives in the client bundle
 * (`dist/client.js`, exposed through exports["./client"]). The host row exists
 * solely so the client-modules registry composes the package into the browser
 * entry graph (`window.__DSH_BOOT__`); its apply is a no-op on the Node side.
 */

export const inject = [];

export function apply() {
  // Nothing to do on the host: the client half owns the theme overrides and
  // the settings row. Kept as a plain function so the Loader mounts the row
  // without a fiber-level inject wait.
}
