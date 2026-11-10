import type { Artifact } from '../services/heritageApi';

/**
 * Filter artifacts by name, description or site name.
 * Backend descriptions are nullable, so every optional field is normalized
 * before matching instead of assuming a string.
 */
export function filterArtifacts(
  artifacts: Artifact[],
  query: string,
): Artifact[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return artifacts;
  }

  return artifacts.filter((artifact) => {
    const searchable = [
      artifact.name,
      artifact.description,
      artifact.siteName,
    ];

    return searchable.some((value) =>
      (value ?? '').toLowerCase().includes(normalizedQuery),
    );
  });
}
