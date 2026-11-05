import type { Artifact } from '../services/heritageApi';

/**
 * Lọc hiện vật phía client theo tên hoặc mô tả.
 * Backend hiện chưa hỗ trợ search/filter nên filter được thực hiện trên dữ liệu đã tải.
 */
export function filterArtifacts(artifacts: Artifact[], query: string): Artifact[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return artifacts;
  }

  return artifacts.filter(
    (artifact) =>
      artifact.name.toLowerCase().includes(normalizedQuery) ||
      artifact.description.toLowerCase().includes(normalizedQuery)
  );
}
