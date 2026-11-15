import type { InteractionSummary } from '../types/analytics'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Format a Date object into YYYY-MM-DD UTC string.
 */
function formatUtcYmd(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Escape a single cell value for CSV (RFC 4180 compliant)
 * and mitigate CSV formula injection (OWASP guideline).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }

  // Pure numbers are safe from formula injection
  if (typeof value === 'number') {
    return Number.isFinite(value) ? `"${value}"` : '""'
  }

  let str = String(value)

  // Prevent CSV formula injection:
  // If the cell value starts with =, +, -, @, \t, or \r (including leading whitespace),
  // prefix with a single quote (') so spreadsheet applications interpret it purely as text.
  const trimmed = str.trimStart()
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    str = `'${str}`
  }

  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""')
  return `"${escaped}"`
}

/**
 * Human-readable label for interaction types in Vietnamese.
 * Safe fallback for BEACON_TRIGGER and unknown types.
 */
export function getInteractionTypeLabel(type: string): string {
  const upper = type.toUpperCase()
  switch (upper) {
    case 'VIEW':
      return 'Lượt xem hiện vật'
    case 'AUDIO_PLAY':
      return 'Nghe thuyết minh audio'
    case 'SCAN':
      return 'Quét QR/Beacon'
    case 'BEACON_TRIGGER':
      return 'Kích hoạt Beacon'
    default:
      return type
  }
}

/**
 * Determine reporting period text for the export in Vietnamese.
 * Handles UTC bounded dates [from, to) where to is exclusive end instant.
 */
export function formatReportingPeriod(from: string | null, to: string | null): string {
  if (!from || !to) {
    return 'Toàn thời gian'
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return 'Toàn thời gian'
  }

  // Backend contract is [from, to) with exclusive end instant (start of next day).
  // Display the inclusive calendar day in the summary.
  const inclusiveEnd = new Date(toDate.getTime() - MS_PER_DAY)

  return `${formatUtcYmd(fromDate)} đến ${formatUtcYmd(inclusiveEnd)} (UTC)`
}

/**
 * Generate a descriptive filename for the exported CSV based on the reporting range.
 */
export function getAnalyticsCsvFilename(from: string | null, to: string | null): string {
  if (!from || !to) {
    return 'analytics-summary_all-time.csv'
  }

  const fromDate = new Date(from)
  const toDate = new Date(to)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return 'analytics-summary_all-time.csv'
  }

  const inclusiveEnd = new Date(toDate.getTime() - MS_PER_DAY)
  return `analytics-summary_${formatUtcYmd(fromDate)}_to_${formatUtcYmd(inclusiveEnd)}.csv`
}

/**
 * Generate RFC 4180 compliant CSV string representing the InteractionSummary data.
 */
export function generateAnalyticsCsv(
  summary: InteractionSummary,
  options?: { exportedAt?: Date },
): string {
  const lines: string[] = []
  const exportedAt = options?.exportedAt ?? new Date()
  const periodText = formatReportingPeriod(summary.from, summary.to)
  const exportedAtText = `${formatUtcYmd(exportedAt)} ${String(exportedAt.getUTCHours()).padStart(2, '0')}:${String(exportedAt.getUTCMinutes()).padStart(2, '0')}:${String(exportedAt.getUTCSeconds()).padStart(2, '0')} UTC`

  // Section 1: Metadata (Thông tin báo cáo)
  lines.push(`${escapeCsvCell('BÁO CÁO PHÂN TÍCH TƯƠNG TÁC — SMART HERITAGE')}`)
  lines.push(`${escapeCsvCell('Khoảng thời gian báo cáo')},${escapeCsvCell(periodText)}`)
  lines.push(`${escapeCsvCell('Thời điểm xuất báo cáo (UTC)')},${escapeCsvCell(exportedAtText)}`)
  lines.push('')

  // Section 2: Key Performance Indicators (Chỉ số hiệu quả chính)
  const avgEngagement =
    summary.uniqueVisitors > 0
      ? (summary.totalInteractions / summary.uniqueVisitors).toFixed(1)
      : '0.0'

  lines.push(`${escapeCsvCell('[1] CHỈ SỐ HIỆU QUẢ CHÍNH (KPIs)')}`)
  lines.push(
    `${escapeCsvCell('Chỉ số')},${escapeCsvCell('Giá trị')},${escapeCsvCell('Đơn vị tính')}`,
  )
  lines.push(
    `${escapeCsvCell('Tổng lượt tương tác')},${escapeCsvCell(summary.totalInteractions)},${escapeCsvCell('lượt')}`,
  )
  lines.push(
    `${escapeCsvCell('Khách truy cập duy nhất')},${escapeCsvCell(summary.uniqueVisitors)},${escapeCsvCell('khách')}`,
  )
  lines.push(
    `${escapeCsvCell('Tương tác trung bình / khách')},${escapeCsvCell(avgEngagement)},${escapeCsvCell('lượt / khách')}`,
  )
  lines.push('')

  // Section 3: Interaction Breakdown (Phân loại tương tác)
  lines.push(`${escapeCsvCell('[2] CHI TIẾT THEO LOẠI TƯƠNG TÁC')}`)
  lines.push(
    `${escapeCsvCell('Mã tương tác')},${escapeCsvCell('Tên hiển thị')},${escapeCsvCell('Số lượng')},${escapeCsvCell('Tỷ lệ')}`,
  )

  if (!summary.interactionTypes || summary.interactionTypes.length === 0) {
    lines.push(
      `${escapeCsvCell('N/A')},${escapeCsvCell('Chưa có tương tác ghi nhận trong kỳ')},${escapeCsvCell(0)},${escapeCsvCell('0%')}`,
    )
  } else {
    for (const item of summary.interactionTypes) {
      const pct =
        summary.totalInteractions > 0
          ? Math.round((item.count / summary.totalInteractions) * 100)
          : 0
      lines.push(
        `${escapeCsvCell(item.interactionType)},${escapeCsvCell(getInteractionTypeLabel(item.interactionType))},${escapeCsvCell(item.count)},${escapeCsvCell(`${pct}%`)}`,
      )
    }
  }
  lines.push('')

  // Section 4: Popular Artifacts (Hiện vật phổ biến)
  lines.push(`${escapeCsvCell('[3] DANH SÁCH HIỆN VẬT PHỔ BIẾN')}`)
  lines.push(
    `${escapeCsvCell('Thứ hạng')},${escapeCsvCell('Mã hiện vật')},${escapeCsvCell('Tên hiện vật')},${escapeCsvCell('Số lượt tương tác')}`,
  )

  if (!summary.popularArtifacts || summary.popularArtifacts.length === 0) {
    lines.push(
      `${escapeCsvCell('N/A')},${escapeCsvCell('N/A')},${escapeCsvCell('Chưa có hiện vật nào ghi nhận tương tác trong kỳ')},${escapeCsvCell(0)}`,
    )
  } else {
    summary.popularArtifacts.forEach((artifact, index) => {
      lines.push(
        `${escapeCsvCell(index + 1)},${escapeCsvCell(artifact.artifactId)},${escapeCsvCell(artifact.artifactName)},${escapeCsvCell(artifact.interactionCount)}`,
      )
    })
  }

  // RFC 4180 uses CRLF
  return lines.join('\r\n')
}

/**
 * Triggers a browser download for the analytics CSV file.
 * Adds UTF-8 BOM (\uFEFF) to guarantee correct rendering of Vietnamese text in Microsoft Excel.
 */
export function exportAnalyticsSummaryToCsv(
  summary: InteractionSummary,
  options?: { exportedAt?: Date },
): void {
  const csvContent = generateAnalyticsCsv(summary, options)
  const filename = getAnalyticsCsvFilename(summary.from, summary.to)

  // Prepend UTF-8 BOM for Excel / Vietnamese text compatibility
  const blob = new Blob(['\uFEFF', csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  // Support environments with window / document
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
