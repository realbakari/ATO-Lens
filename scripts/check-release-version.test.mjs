import { describe, expect, it } from 'vitest';
import {
  readPackageVersion,
  validateReleaseVersion
} from './check-release-version.mjs';

describe('release version validation', () => {
  const packageVersion = readPackageVersion();

  it('accepts the package version with one optional v prefix', () => {
    expect(validateReleaseVersion(packageVersion, packageVersion)).toBe(packageVersion);
    expect(validateReleaseVersion(`v${packageVersion}`, packageVersion)).toBe(packageVersion);
    expect(validateReleaseVersion(undefined, packageVersion)).toBe(packageVersion);
  });

  it.each(['1.0.0', 'vv1.0.1', ' 1.0.1', '1.0.1 ', '', 'release-1'])(
    'rejects invalid or mismatched input %j',
    (requested) => {
      expect(() => validateReleaseVersion(requested, '1.0.1')).toThrow();
    }
  );
});
