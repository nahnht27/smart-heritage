import { filterArtifacts } from '../artifact';
import type { Artifact } from '../../services/heritageApi';

const artifacts: Artifact[] = [
  {
    id: 1,
    siteId: 1,
    name: 'Trống Đồng Đông Sơn',
    era: null,
    category: null,
    description: 'Biểu tượng văn hóa Đông Sơn',
    locationInMuseum: null,
    imageUrl: null,
  },
  {
    id: 2,
    siteId: 1,
    name: 'Kiếm Cổ Thời Trần',
    era: null,
    category: null,
    description: 'Vũ khí cổ thời nhà Trần',
    locationInMuseum: null,
    imageUrl: null,
  },
];

describe('filterArtifacts', () => {
  it('trả về toàn bộ khi query rỗng', () => {
    expect(filterArtifacts(artifacts, '')).toHaveLength(2);
    expect(filterArtifacts(artifacts, '   ')).toHaveLength(2);
  });

  it('lọc theo tên, không phân biệt hoa thường và khoảng trắng', () => {
    expect(filterArtifacts(artifacts, '  trống ')).toHaveLength(1);
    expect(filterArtifacts(artifacts, 'TRỐNG')[0].id).toBe(1);
  });

  it('lọc theo mô tả', () => {
    expect(filterArtifacts(artifacts, 'nhà trần')).toHaveLength(1);
    expect(filterArtifacts(artifacts, 'nhà trần')[0].id).toBe(2);
  });

  it('trả về mảng rỗng khi không khớp', () => {
    expect(filterArtifacts(artifacts, 'không tồn tại')).toEqual([]);
  });
});
