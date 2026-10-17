/**
 * Smart Heritage - Mock Data Repository
 *
 * Clearly separated from real API services to satisfy Sprint 2 requirements:
 * "Use placeholder content if APIs are not ready; label mock data clearly and keep it easy to replace."
 */

export interface HeritageSiteMock {
  id: number;
  name: string;
  tagline: string;
  location: string;
  openHours: string;
  ticketPrice: string;
  description: string;
  heroImageUrl: string;
}

export interface ArtifactMock {
  id: string;
  name: string;
  era: string;
  category: string;
  description: string;
  locationInMuseum: string;
  imageUrl: string;
  isFeatured?: boolean;
}

export const MOCK_HERITAGE_SITE: HeritageSiteMock = {
  id: 1,
  name: 'Bảo tàng Lịch sử Quốc gia',
  tagline: 'Khám phá dòng chảy lịch sử và văn hóa ngàn năm',
  location: 'Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
  openHours: '08:00 - 17:00 (Thứ 3 - Chủ Nhật)',
  ticketPrice: '40.000 VNĐ / vé người lớn',
  description:
    'Nơi lưu giữ, trưng bày và giới thiệu lịch sử Việt Nam từ thời tiền sử đến năm 1945 thông qua hàng vạn tài liệu, hiện vật quý giá.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1590059390046-67a6839a85f8?auto=format&fit=crop&w=1000&q=80',
};

export const MOCK_ARTIFACTS: ArtifactMock[] = [
  {
    id: '101',
    name: 'Trống Đồng Đông Sơn',
    era: 'Thế kỷ VII TCN - Thế kỷ I SCN',
    category: 'Bảo vật Quốc gia',
    description:
      'Hiện vật tiêu biểu của nền văn hóa Đông Sơn, biểu tượng cho quyền lực và đời sống tâm linh, văn hóa đúc đồng đỉnh cao của người Việt cổ.',
    locationInMuseum: 'Phòng trưng bày Kim loại & Thời kỳ Hùng Vương - Tủ số 1',
    imageUrl:
      'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=600&q=80',
    isFeatured: true,
  },
  {
    id: '102',
    name: 'Kiếm Cổ Thời Trần',
    era: 'Thế kỷ XIII - XIV',
    category: 'Vũ khí cổ',
    description:
      'Minh chứng hào hùng cho tinh thần Đông A trong các cuộc kháng chiến bảo vệ giang sơn thời nhà Trần.',
    locationInMuseum: 'Gian trưng bày Lịch sử Quân sự Đại Việt - Tủ số 4',
    imageUrl:
      'https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=600&q=80',
    isFeatured: true,
  },
  {
    id: '103',
    name: 'Bình Gốm Hoa Lam Chu Đậu',
    era: 'Thế kỷ XV - XVI',
    category: 'Gốm sứ cổ',
    description:
      'Tuyệt tác gốm Chu Đậu nổi tiếng với men lam tro trấu truyền thống và kỹ thuật khắc họa hoa sen thanh thoát.',
    locationInMuseum: 'Phòng Mỹ thuật & Đồ gốm Cổ truyền - Kệ B2',
    imageUrl:
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
    isFeatured: true,
  },
  {
    id: '104',
    name: 'Bia Tiến Sĩ Văn Miếu',
    era: 'Thế kỷ XV - XVIII',
    category: 'Di sản tư liệu UNESCO',
    description:
      'Bia đá ghi danh các bậc hiền tài đỗ đạt qua các kỳ thi Nho học thời Lê - Mạc.',
    locationInMuseum: 'Khu vực trưng bày Văn hóa Giáo dục Cố đô',
    imageUrl:
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80',
    isFeatured: false,
  },
];

export const MOCK_VISIT_HISTORY = [
  {
    id: 'h1',
    artifactId: '101',
    artifactName: 'Trống Đồng Đông Sơn',
    visitedAt: 'Hôm nay, 10:15',
    type: 'BEACON_TRIGGER',
  },
  {
    id: 'h2',
    artifactId: '102',
    artifactName: 'Kiếm Cổ Thời Trần',
    visitedAt: 'Hôm qua, 15:40',
    type: 'MANUAL_VIEW',
  },
];

export const MOCK_FAVORITES = [
  {
    id: 'f1',
    artifactId: '101',
    artifactName: 'Trống Đồng Đông Sơn',
    savedAt: '12/10/2026',
  },
  {
    id: 'f2',
    artifactId: '103',
    artifactName: 'Bình Gốm Hoa Lam Chu Đậu',
    savedAt: '14/10/2026',
  },
];
