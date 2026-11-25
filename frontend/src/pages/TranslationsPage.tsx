import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest } from '../services/apiClient'
import {
  getAllTranslations,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  computeTranslationStats,
} from '../services/translationService'
import type {
  Translation,
  TranslationRequest,
  ContentType,
  LanguageCode,
  TranslationStatus,
} from '../types/translation'
import type { PageResponse } from '../types/api'
import './TranslationsPage.css'

interface SiteOption {
  siteId: number
  name: string
}

interface ArtifactOption {
  artifactId: number
  name: string
}

interface TranslationFormData {
  contentType: ContentType
  contentId: string
  contentName: string
  language: LanguageCode
  title: string
  description: string
  status: TranslationStatus
}

const emptyFormData: TranslationFormData = {
  contentType: 'SITE',
  contentId: '',
  contentName: '',
  language: 'en',
  title: '',
  description: '',
  status: 'PUBLISHED',
}

const PAGE_SIZE = 5

export default function TranslationsPage() {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [artifacts, setArtifacts] = useState<ArtifactOption[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Pagination
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Translation | null>(null)
  const [formData, setFormData] = useState<TranslationFormData>(emptyFormData)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Load sites & artifacts for modal dropdown
  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      try {
        const [sitesRes, artifactsRes] = await Promise.all([
          apiRequest<SiteOption[] | PageResponse<SiteOption>>('/api/heritage-sites').catch(() => null),
          apiRequest<ArtifactOption[] | PageResponse<ArtifactOption>>('/api/artifacts').catch(() => null),
        ])

        if (!cancelled) {
          if (sitesRes?.data) {
            const data = sitesRes.data
            setSites(Array.isArray(data) ? data : data.content || [])
          }
          if (artifactsRes?.data) {
            const data = artifactsRes.data
            setArtifacts(Array.isArray(data) ? data : data.content || [])
          }
        }
      } catch {
        // Dropdown options fallback if backend endpoints not reachable
      }
    }

    void loadOptions()
    return () => {
      cancelled = true
    }
  }, [])

  // Load translations
  useEffect(() => {
    let cancelled = false

    async function fetchTranslations() {
      setLoading(true)
      setError('')

      try {
        const result = await getAllTranslations({
          q: search,
          language: languageFilter,
          contentType: typeFilter,
          status: statusFilter,
          page,
          size: PAGE_SIZE,
        })

        if (!cancelled) {
          setTranslations(result.items)
          setIsDemo(result.isDemo)
          setTotalElements(result.totalElements)
          setTotalPages(Math.max(1, result.totalPages))

          if (result.items.length > 0) {
            // Keep selected if still in list, otherwise select first item
            setSelectedTranslation((prev) => {
              if (prev && result.items.some((t) => t.id === prev.id)) {
                return result.items.find((t) => t.id === prev.id) || result.items[0]
              }
              return result.items[0]
            })
          } else {
            setSelectedTranslation(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setTranslations([])
          setIsDemo(false)
          setTotalElements(0)
          setTotalPages(1)
          setSelectedTranslation(null)
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load translations. Please check backend connection.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchTranslations()
    return () => {
      cancelled = true
    }
  }, [search, languageFilter, typeFilter, statusFilter, page, reloadKey])

  const stats = computeTranslationStats(translations, totalElements)

  function openCreateModal() {
    setEditingItem(null)
    setFormData({
      ...emptyFormData,
      contentId: sites[0] ? String(sites[0].siteId) : '1',
      contentName: sites[0]?.name || 'Imperial Citadel',
    })
    setFormError('')
    setShowModal(true)
  }

  function openEditModal(item: Translation) {
    setEditingItem(item)
    setFormData({
      contentType: item.contentType,
      contentId: String(item.contentId),
      contentName: item.contentName,
      language: item.language,
      title: item.title,
      description: item.description,
      status: item.status,
    })
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
    setEditingItem(null)
    setFormData(emptyFormData)
    setFormError('')
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return

    if (!formData.title.trim()) {
      setFormError('Translation title is required.')
      return
    }

    const payload: TranslationRequest = {
      contentType: formData.contentType,
      contentId: Number(formData.contentId) || 1,
      language: formData.language,
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
    }

    setSaving(true)
    setFormError('')
    setMessage('')
    setError('')

    try {
      if (editingItem) {
        const updated = await updateTranslation(editingItem.id, payload)
        setMessage(`Translation "${updated.title}" updated successfully.`)
        setSelectedTranslation(updated)
      } else {
        const created = await createTranslation(payload)
        setMessage(`Translation "${created.title}" created successfully.`)
        setSelectedTranslation(created)
      }
      setShowModal(false)
      setEditingItem(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Failed to save translation.')
      } else {
        setFormError('Unable to save translation. Please check connection.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Translation) {
    const confirmed = window.confirm(
      `Are you sure you want to delete translation "${item.title}" (${item.language.toUpperCase()})?`,
    )
    if (!confirmed || deletingId !== null) return

    setDeletingId(item.id)
    setError('')
    setMessage('')

    try {
      await deleteTranslation(item.id)
      setMessage(`Translation "${item.title}" deleted successfully.`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete translation. Please try again.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="translations-page">
      {/* Header */}
      <header className="translations-header">
        <div>
          <p className="translations-eyebrow">TRANSLATION MANAGEMENT</p>
          <h1 className="translations-title">Translation</h1>
          <p className="translations-subtitle">Manage multilingual heritage content</p>
        </div>
        <button
          type="button"
          className="translations-primary-button"
          onClick={openCreateModal}
        >
          <span>+ Add Translation</span>
        </button>
      </header>

      {/* Alerts */}
      {isDemo && (
        <div className="translations-alert translations-alert--demo" role="status" data-testid="demo-mode-notice">
          <span>Demo mode — backend endpoint is not implemented. Changes are temporary and reset when the application reloads.</span>
        </div>
      )}

      {message && (
        <div className="translations-alert translations-alert--success" role="status">
          <span>{message}</span>
          <button
            type="button"
            className="translations-alert-close"
            onClick={() => setMessage('')}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="translations-alert translations-alert--error" role="alert">
          <span>{error}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="translations-retry-button"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
            <button
              type="button"
              className="translations-alert-close"
              onClick={() => setError('')}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="translations-toolbar">
        <div className="translations-search-box">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="translations-search-input"
            placeholder="Search content..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
          {search && (
            <button
              type="button"
              className="translations-clear-search"
              onClick={() => {
                setSearch('')
                setPage(0)
              }}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="translations-filters">
          <select
            className="translations-select"
            value={languageFilter}
            onChange={(e) => {
              setLanguageFilter(e.target.value)
              setPage(0)
            }}
            aria-label="Filter by language"
          >
            <option value="ALL">All Languages</option>
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
          </select>

          <select
            className="translations-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(0)
            }}
            aria-label="Filter by content type"
          >
            <option value="ALL">All Types</option>
            <option value="SITE">Site</option>
            <option value="ARTIFACT">Artifact</option>
          </select>

          <select
            className="translations-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            aria-label="Filter by status"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Translations Table Card */}
      <div className="translations-card">
        <div className="translations-table-wrapper">
          <table className="translations-table">
            <thead>
              <tr>
                <th>Content</th>
                <th>Type</th>
                <th>Language</th>
                <th>Status</th>
                <th>Updated At</th>
                <th style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="translations-loading-state">
                    Loading translations…
                  </td>
                </tr>
              ) : translations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="translations-empty-state">
                    No translations found.
                  </td>
                </tr>
              ) : (
                translations.map((item) => {
                  const isSelected = selectedTranslation?.id === item.id
                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? 'translation-row--selected' : ''}
                      onClick={() => setSelectedTranslation(item)}
                    >
                      <td className="translations-content-cell">{item.contentName}</td>
                      <td>
                        <span
                          className={`translation-badge ${
                            item.contentType === 'SITE'
                              ? 'translation-badge--site'
                              : 'translation-badge--artifact'
                          }`}
                        >
                          {item.contentType === 'SITE' ? 'Site' : 'Artifact'}
                        </span>
                      </td>
                      <td>
                        <span className="translation-lang-badge">
                          {item.language === 'en' ? 'English' : 'Vietnamese'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`translation-badge ${
                            item.status === 'PUBLISHED'
                              ? 'translation-badge--published'
                              : 'translation-badge--draft'
                          }`}
                        >
                          {item.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>{item.updatedAt}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="translations-actions">
                          {/* Edit */}
                          <button
                            type="button"
                            className="translations-icon-button"
                            onClick={() => openEditModal(item)}
                            title="Edit translation"
                            aria-label={`Edit ${item.contentName}`}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            className="translations-icon-button translations-icon-button--danger"
                            onClick={() => handleDelete(item)}
                            title="Delete translation"
                            aria-label={`Delete ${item.contentName}`}
                            disabled={deletingId === item.id}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="translations-footer">
          <span>
            Showing {translations.length > 0 ? page * PAGE_SIZE + 1 : 0}–
            {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} translations
          </span>
          <div className="translations-pagination">
            <button
              type="button"
              className="translations-page-button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`translations-page-button ${page === idx ? 'active' : ''}`}
                onClick={() => setPage(idx)}
              >
                {idx + 1}
              </button>
            ))}
            <button
              type="button"
              className="translations-page-button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Split View: Selected Content Preview & Quick Stats */}
      <div className="translations-bottom-split">
        {/* Selected Content Card */}
        <div className="translations-detail-card">
          <div className="translations-detail-header">
            <div>
              <span className="translations-detail-title-label">Selected content</span>
              <h3 className="translations-detail-title-name">
                {selectedTranslation ? selectedTranslation.contentName : 'No content selected'}
              </h3>
            </div>
            {selectedTranslation && (
              <span
                className={`translation-badge ${
                  selectedTranslation.status === 'PUBLISHED'
                    ? 'translation-badge--published'
                    : 'translation-badge--draft'
                }`}
              >
                {selectedTranslation.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
            )}
          </div>

          {selectedTranslation ? (
            <>
              <div className="translations-detail-content">
                <div className="translations-detail-thumbnail">
                  {selectedTranslation.imageUrl ? (
                    <img
                      src={selectedTranslation.imageUrl}
                      alt={selectedTranslation.contentName}
                    />
                  ) : (
                    <div className="translations-thumbnail-fallback">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 9h18L12 4 3 9Z" />
                        <path d="M5 20h14M7 10v8m5-8v8m5-8v8M4 22h16" />
                      </svg>
                      <span>Heritage Item</span>
                    </div>
                  )}
                </div>

                <div className="translations-metadata-grid">
                  <div className="translations-meta-item">
                    <strong>Content Type</strong>
                    <span>
                      {selectedTranslation.contentType === 'SITE'
                        ? 'Heritage Site'
                        : 'Artifact'}
                    </span>
                  </div>
                  <div className="translations-meta-item">
                    <strong>Available Languages</strong>
                    <span>Vietnamese, English</span>
                  </div>
                  <div className="translations-meta-item">
                    <strong>Current Language</strong>
                    <span>
                      {selectedTranslation.language === 'en'
                        ? 'English'
                        : 'Vietnamese'}
                    </span>
                  </div>
                  <div className="translations-meta-item">
                    <strong>Updated</strong>
                    <span>{selectedTranslation.updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Multilingual Comparison */}
              <div className="translations-comparison-grid">
                <div className="translations-lang-box">
                  <h4>
                    <span>Vietnamese</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Tiếng Việt</span>
                  </h4>
                  <p>
                    {selectedTranslation.translations?.vi?.description ||
                      (selectedTranslation.language === 'vi'
                        ? selectedTranslation.description
                        : 'Chưa có bản dịch Tiếng Việt.')}
                  </p>
                </div>

                <div className="translations-lang-box">
                  <h4>
                    <span>English</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Global</span>
                  </h4>
                  <p>
                    {selectedTranslation.translations?.en?.description ||
                      (selectedTranslation.language === 'en'
                        ? selectedTranslation.description
                        : 'No English translation available yet.')}
                  </p>
                </div>
              </div>

              <div className="translations-detail-actions">
                <button
                  type="button"
                  className="translations-primary-button"
                  onClick={() => openEditModal(selectedTranslation)}
                >
                  Edit Translation
                </button>
                <button
                  type="button"
                  className="translations-secondary-button"
                  onClick={() => setMessage(`Saved review for "${selectedTranslation.contentName}".`)}
                >
                  Save Changes
                </button>
              </div>
            </>
          ) : (
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              Select a row in the table above to review translation details.
            </p>
          )}
        </div>

        {/* Quick Stats Column */}
        <aside className="translations-quick-stats">
          <h4 className="translations-quick-stats-heading">Quick Stats</h4>
          <p className="translations-stat-label" data-testid="stats-scope">
            {stats.scope === 'current-page'
              ? `Current page only (${translations.length} of ${totalElements} results)`
              : 'All loaded results'}
          </p>

          <div className="translations-stat-box">
            <div>
              <div className="translations-stat-number">{stats.totalContent}</div>
              <div className="translations-stat-label">Total Content</div>
            </div>
            <div className="translations-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9h18L12 4 3 9Z" />
                <path d="M5 20h14M7 10v8m5-8v8m5-8v8M4 22h16" />
              </svg>
            </div>
          </div>

          <div className="translations-stat-box">
            <div>
              <div className="translations-stat-number">{stats.translated}</div>
              <div className="translations-stat-label">Translated</div>
            </div>
            <div className="translations-stat-icon" style={{ color: '#16a34a' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>

          <div className="translations-stat-box">
            <div>
              <div className="translations-stat-number">{stats.draft}</div>
              <div className="translations-stat-label">Draft</div>
            </div>
            <div className="translations-stat-icon" style={{ color: '#64748b' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
          </div>
        </aside>
      </div>

      {/* Add / Edit Translation Modal */}
      {showModal && (
        <div
          className="translations-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className="translations-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="translations-form-title"
          >
            <div className="translations-modal-header">
              <div>
                <h2 id="translations-form-title">
                  {editingItem ? 'Edit Translation' : 'Add Translation'}
                </h2>
                <p>Manage multilingual content for heritage sites and artifacts.</p>
              </div>
              <button
                type="button"
                className="translations-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="translations-modal-body">
                <div className="translations-form-row">
                  <label className="translations-field">
                    <span>Content Type <b>*</b></span>
                    <select
                      value={formData.contentType}
                      onChange={(e) => {
                        const newType = e.target.value as ContentType
                        setFormData((prev) => ({
                          ...prev,
                          contentType: newType,
                          contentId:
                            newType === 'SITE'
                              ? sites[0] ? String(sites[0].siteId) : '1'
                              : artifacts[0] ? String(artifacts[0].artifactId) : '1',
                        }))
                      }}
                    >
                      <option value="SITE">Heritage Site</option>
                      <option value="ARTIFACT">Artifact</option>
                    </select>
                  </label>

                  <label className="translations-field">
                    <span>Select Content <b>*</b></span>
                    <select
                      value={formData.contentId}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        let name = ''
                        if (formData.contentType === 'SITE') {
                          name = sites.find((s) => String(s.siteId) === selectedId)?.name || ''
                        } else {
                          name = artifacts.find((a) => String(a.artifactId) === selectedId)?.name || ''
                        }
                        setFormData((prev) => ({
                          ...prev,
                          contentId: selectedId,
                          contentName: name || prev.contentName,
                        }))
                      }}
                    >
                      {formData.contentType === 'SITE' ? (
                        sites.length > 0 ? (
                          sites.map((s) => (
                            <option key={s.siteId} value={s.siteId}>
                              {s.name} (ID: {s.siteId})
                            </option>
                          ))
                        ) : (
                          <option value="1">Imperial Citadel (ID: 1)</option>
                        )
                      ) : artifacts.length > 0 ? (
                        artifacts.map((a) => (
                          <option key={a.artifactId} value={a.artifactId}>
                            {a.name} (ID: {a.artifactId})
                          </option>
                        ))
                      ) : (
                        <option value="2">Hall of Supreme Harmony (ID: 2)</option>
                      )}
                    </select>
                  </label>
                </div>

                <div className="translations-form-row">
                  <label className="translations-field">
                    <span>Target Language <b>*</b></span>
                    <select
                      value={formData.language}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          language: e.target.value as LanguageCode,
                        }))
                      }
                    >
                      <option value="en">English (en)</option>
                      <option value="vi">Vietnamese (vi)</option>
                    </select>
                  </label>

                  <label className="translations-field">
                    <span>Publication Status <b>*</b></span>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as TranslationStatus,
                        }))
                      }
                    >
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                    </select>
                  </label>
                </div>

                <label className="translations-field">
                  <span>Translation Title <b>*</b></span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter translated title"
                    maxLength={255}
                    required
                  />
                </label>

                <label className="translations-field">
                  <span>Translation Description</span>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter translated narrative, historical context, or description..."
                  />
                </label>

                {formError && (
                  <p className="beacon-alert beacon-alert--error" role="alert" style={{ margin: 0 }}>
                    {formError}
                  </p>
                )}
              </div>

              <div className="translations-modal-footer">
                <button
                  type="button"
                  className="translations-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="translations-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingItem
                    ? 'Save Changes'
                    : 'Create Translation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
