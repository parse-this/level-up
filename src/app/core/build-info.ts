// Filled in at build time by the deploy (`ng build --define`, see .github/workflows/deploy.yml).
declare const BUILD_SHA: string;
declare const BUILD_TIME: string;

/** Which build is running, so you can tell a stale cached copy from the latest deploy. */
export const BUILD_INFO = {
  /** Short commit hash, or "dev" for local builds. */
  version: typeof BUILD_SHA === 'string' ? BUILD_SHA : 'dev',
  /** ISO time of the build, or null for local builds. */
  builtAt: typeof BUILD_TIME === 'string' ? BUILD_TIME : null,
};
