import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  escapeCsvCell,
  getInteractionTypeLabel,
  formatReportingPeriod,
  getAnalyticsCsvFilename,
  generateAnalyticsCsv,
  exportAnalyticsSummaryToCsv,
} from '../analyticsCsv'
import type { InteractionSummary } from '../../types/analytics'

describe('analyticsCsv utility', () => {
  describe('escapeCsvCell', () => {
    it('handles null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('""')
      expect(escapeCsvCell(undefined)).toBe('""')
    })

    it('formats numbers without formula injection prefix', () => {
      expect(escapeCsvCell(42)).toBe('"42"')
      expect(escapeCsvCell(0)).toBe('"0"')
      expect(escapeCsvCell(1420)).toBe('"1420"')
    })

    it('escapes standard text and quotes', () => {
      expect(escapeCsvCell('Dong Son Drum')).toBe('"Dong Son Drum"')
      expect(escapeCsvCell('Artifact "Royal" Seal')).toBe('"Artifact ""Royal"" Seal"')
      expect(escapeCsvCell('Hanoi, Vietnam')).toBe('"Hanoi, Vietnam"')
    })

    it('mitigates CSV formula injection starting with =, +, -, @', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"')
      expect(escapeCsvCell('+12345')).toBe('"\'+12345"')
      expect(escapeCsvCell('-cmd|calc')).toBe('"\' -cmd|calc"'.replace(' ', ''))
      expect(escapeCsvCell('@HYPERLINK("http://attacker.com")')).toBe(
        '"\'@HYPERLINK(""http://attacker.com"")"',
      )
    })

    it('mitigates formula injection with leading whitespace, tab or carriage return', () => {
      expect(escapeCsvCell('   =1+1')).toBe('"\'   =1+1"')
      expect(escapeCsvCell('\t=2+2')).toBe('"\'\t=2+2"')
      expect(escapeCsvCell('\r-3')).toBe('"\'\r-3"')
    })
  })

  describe('getInteractionTypeLabel', () => {
    it('returns friendly Vietnamese labels for standard types', () => {
      expect(getInteractionTypeLabel('VIEW')).toBe('Lượt xem hiện vật')
      expect(getInteractionTypeLabel('AUDIO_PLAY')).toBe('Nghe thuyết minh audio')
      expect(getInteractionTypeLabel('SCAN')).toBe('Quét QR/Beacon')
      expect(getInteractionTypeLabel('BEACON_TRIGGER')).toBe('Kích hoạt Beacon')
    })

    it('returns raw type safely for unknown types', () => {
      expect(getInteractionTypeLabel('UNKNOWN_ACTION')).toBe('UNKNOWN_ACTION')
      expect(getInteractionTypeLabel('3D_MODEL_INTERACT')).toBe('3D_MODEL_INTERACT')
    })
  })

  describe('formatReportingPeriod & filename', () => {
    it('formats UTC bounded range with inclusive calendar end date in Vietnamese', () => {
      const from = '2026-10-08T00:00:00Z'
      const toExclusive = '2026-11-07T00:00:00Z'

      expect(formatReportingPeriod(from, toExclusive)).toBe(
        '2026-10-08 đến 2026-11-06 (UTC)',
      )
      expect(getAnalyticsCsvFilename(from, toExclusive)).toBe(
        'analytics-summary_2026-10-08_to_2026-11-06.csv',
      )
    })

    it('formats unbounded All Time range correctly in Vietnamese', () => {
      expect(formatReportingPeriod(null, null)).toBe('Toàn thời gian')
      expect(getAnalyticsCsvFilename(null, null)).toBe('analytics-summary_all-time.csv')
    })

    it('handles invalid date strings gracefully', () => {
      expect(formatReportingPeriod('invalid-from', 'invalid-to')).toBe('Toàn thời gian')
      expect(getAnalyticsCsvFilename('invalid-from', 'invalid-to')).toBe(
        'analytics-summary_all-time.csv',
      )
    })
  })

  describe('generateAnalyticsCsv', () => {
    const mockSummary: InteractionSummary = {
      from: '2026-10-08T00:00:00Z',
      to: '2026-11-07T00:00:00Z',
      totalInteractions: 1420,
      uniqueVisitors: 350,
      interactionTypes: [
        { interactionType: 'VIEW', count: 900 },
        { interactionType: 'BEACON_TRIGGER', count: 320 },
        { interactionType: 'SCAN', count: 200 },
      ],
      popularArtifacts: [
        {
          artifactId: 101,
          artifactName: 'Trống đồng Đông Sơn',
          interactionCount: 520,
        },
        {
          artifactId: 102,
          artifactName: 'Thạp đồng Đào Thịnh',
          interactionCount: 310,
        },
      ],
    }

    it('generates CSV with all sections, KPIs, breakdown, and popular artifacts in Vietnamese', () => {
      const fixedExportDate = new Date('2026-11-11T07:00:00Z')
      const csv = generateAnalyticsCsv(mockSummary, { exportedAt: fixedExportDate })

      // Header metadata
      expect(csv).toContain('"BÁO CÁO PHÂN TÍCH TƯƠNG TÁC — SMART HERITAGE"')
      expect(csv).toContain('"Khoảng thời gian báo cáo","2026-10-08 đến 2026-11-06 (UTC)"')
      expect(csv).toContain('"Thời điểm xuất (UTC)","2026-11-11 07:00:00 UTC"')

      // KPIs
      expect(csv).toContain('"[1] CHỈ SỐ HIỆU QUẢ CHÍNH (KPIs)"')
      expect(csv).toContain('"Chỉ số","Giá trị","Đơn vị tính"')
      expect(csv).toContain('"Tổng lượt tương tác","1420","lượt"')
      expect(csv).toContain('"Khách truy cập duy nhất","350","khách"')
      expect(csv).toContain('"Tương tác trung bình / khách","4.1","lượt / khách"')

      // Breakdown with BEACON_TRIGGER
      expect(csv).toContain('"[2] CHI TIẾT THEO LOẠI TƯƠNG TÁC"')
      expect(csv).toContain('"BEACON_TRIGGER","Kích hoạt Beacon","320","23%"')
      expect(csv).toContain('"VIEW","Lượt xem hiện vật","900","63%"')

      // Popular artifacts with Vietnamese characters
      expect(csv).toContain('"[3] DANH SÁCH HIỆN VẬT PHỔ BIẾN"')
      expect(csv).toContain('"1","101","Trống đồng Đông Sơn","520"')
      expect(csv).toContain('"2","102","Thạp đồng Đào Thịnh","310"')
    })

    it('handles empty interactionTypes and popularArtifacts gracefully in Vietnamese', () => {
      const emptySummary: InteractionSummary = {
        from: null,
        to: null,
        totalInteractions: 0,
        uniqueVisitors: 0,
        interactionTypes: [],
        popularArtifacts: [],
      }

      const csv = generateAnalyticsCsv(emptySummary)
      expect(csv).toContain('"Khoảng thời gian báo cáo","Toàn thời gian"')
      expect(csv).toContain('"Tổng lượt tương tác","0","lượt"')
      expect(csv).toContain('"Khách truy cập duy nhất","0","khách"')
      expect(csv).toContain('"Tương tác trung bình / khách","0.0","lượt / khách"')
      expect(csv).toContain(
        '"N/A","Chưa có tương tác ghi nhận trong kỳ","0","0%"',
      )
      expect(csv).toContain(
        '"N/A","N/A","Chưa có hiện vật nào ghi nhận tương tác trong kỳ","0"',
      )
    })
  })

  describe('exportAnalyticsSummaryToCsv', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('creates object URL, appends anchor, clicks it, and revokes URL with UTF-8 BOM', () => {
      let createdBlob: Blob | null = null
      const mockCreateObjectURL = vi.fn((blob: Blob) => {
        createdBlob = blob
        return 'blob:http://localhost/test-uuid'
      })
      const mockRevokeObjectURL = vi.fn()

      window.URL.createObjectURL = mockCreateObjectURL
      window.URL.revokeObjectURL = mockRevokeObjectURL

      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')

      const summary: InteractionSummary = {
        from: null,
        to: null,
        totalInteractions: 10,
        uniqueVisitors: 5,
        interactionTypes: [{ interactionType: 'VIEW', count: 10 }],
        popularArtifacts: [{ artifactId: 1, artifactName: 'Drum', interactionCount: 10 }],
      }

      exportAnalyticsSummaryToCsv(summary)

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-uuid')
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(createdBlob).not.toBeNull()
      expect((createdBlob as Blob | null)?.type).toBe('text/csv;charset=utf-8;')
    })
  })
})
