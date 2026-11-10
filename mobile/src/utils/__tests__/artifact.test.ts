import { filterArtifacts } from '../artifact';
import type { Artifact } from '../../services/heritageApi';

const artifacts: Artifact[] = [
  {
    id: 1,
    name: 'Trống Đồng Đông Sơn',
    description: 'Biểu tượng văn hóa Đông Sơn',
    siteId: 1,
    siteName: 'Bảo tàng Lịch sử',
    imageUrl: null,
    address: null,
  },
  {
    id: 2,
    name: 'Kiếm Cổ Thời Trần',
    description: null,
    siteId: 1,
    siteName: 'Bảo tàng Lịch sử',
    imageUrl: null,
    address: null,
  },
];

describe('filterArtifacts', () => {
  it('trả về toàn bộ danh sách khi query rỗng', () => {
    expect(filterArtifacts(artifacts, '  ')).toEqual(artifacts);
  });

  it('lọc theo tên không phân biệt hoa thường', () => {
    expect(filterArtifacts(artifacts, 'kiếm')).toEqual([artifacts[1]]);
  });

  it('lọc theo mô tả', () => {
    expect(filterArtifacts(artifacts, 'đông sơn')).toEqual([artifacts[0]]);
  });

  it('không crash khi description null', () => {
    expect(filterArtifacts(artifacts, 'trần')).toEqual([artifacts[1]]);
    expect(filterArtifacts(artifacts, 'không tồn tại')).toEqual([]);
  });

  it('lọc theo tên địa điểm', () => {
    expect(filterArtifacts(artifacts, 'bảo tàng')).toHaveLength(2);
  });
});
