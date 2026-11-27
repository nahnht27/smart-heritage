import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../services/apiClient'
import {
  getAllFeedback,
  moderateFeedback,
  createFeedbackItem,
  updateFeedbackItem,
  deleteFeedbackItem,
} from '../services/feedbackService'
import type {
  FeedbackItem,
  FeedbackType,
  FeedbackStatus,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
} from '../types/feedback'
import './FeedbackPage.css'

interface ContentFormData {
  type: FeedbackType
  title: string
  content: string
  user: string
  status: FeedbackStatus
}

const emptyFormData: ContentFormData = {
  type: 'CONTENT',
  title: '',
  content: '',
  user: 'Admin',
  status: 'PUBLISHED',
}

const PAGE_SIZE = 5

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [isDemo, setIsDemo] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Pagination
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  // View Modal
  const [viewingItem, setViewingItem] = useState<FeedbackItem | null>(null)

  // Add/Edit Content Modal
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingItem, setEditingItem] = useState<FeedbackItem | null>(null)
  const [formData, setFormData] = useState<ContentFormData>(emptyFormData)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Moderating / deleting
  const [moderatingId, setModeratingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Fetch feedback
  useEffect(() => {
    let cancelled = false

    async function fetchItems() {
      setLoading(true)
      setError('')

      try {
        const result = await getAllFeedback({
          q: search,
          status: statusFilter,
          type: typeFilter,
          page,
          size: PAGE_SIZE,
        })

        if (!cancelled) {
          setItems(result.items)
          setIsDemo(result.isDemo)
          setTotalElements(result.totalElements)
          setTotalPages(Math.max(1, result.totalPages))
        }
      } catch (err) {
        if (!cancelled) {
          setItems([])
          setIsDemo(false)
          setTotalElements(0)
          setTotalPages(1)
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load feedback. Please check backend connection.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchItems()
    return () => {
      cancelled = true
    }
  }, [search, statusFilter, typeFilter, page, reloadKey])

  // Moderate action (Approve / Reject)
  async function handleModerate(
    item: FeedbackItem,
    action: 'APPROVE' | 'REJECT',
  ) {
    if (moderatingId !== null) return

    setModeratingId(item.id)
    setError('')
    setMessage('')

    try {
      const updated = await moderateFeedback(item.id, action)
      setMessage(
        `Feedback "${item.title}" ${
          action === 'APPROVE' ? 'approved' : 'rejected'
        } successfully.`,
      )
      if (viewingItem && viewingItem.id === item.id) {
        setViewingItem(updated)
      }
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to moderate feedback. Please try again.',
      )
    } finally {
      setModeratingId(null)
    }
  }

  // Delete
  async function handleDelete(item: FeedbackItem) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        item.type === 'FEEDBACK' ? 'feedback' : 'content'
      } "${item.title}"?`,
    )
    if (!confirmed || deletingId !== null) return

    setDeletingId(item.id)
    setError('')
    setMessage('')

    try {
      await deleteFeedbackItem(item.id)
      setMessage(`Item "${item.title}" deleted successfully.`)
      if (viewingItem && viewingItem.id === item.id) {
        setViewingItem(null)
      }
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete item. Please try again.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  // Form modal handlers
  function openCreateModal() {
    setEditingItem(null)
    setFormData(emptyFormData)
    setFormError('')
    setShowFormModal(true)
  }

  function openEditModal(item: FeedbackItem) {
    setEditingItem(item)
    setFormData({
      type: item.type,
      title: item.title,
      content: item.content || item.comment || '',
      user: item.user,
      status: item.status,
    })
    setFormError('')
    setShowFormModal(true)
  }

  function closeFormModal() {
    if (saving) return
    setShowFormModal(false)
    setEditingItem(null)
    setFormData(emptyFormData)
    setFormError('')
  }

  useEffect(() => {
    if (!showFormModal && !viewingItem) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showFormModal && !saving) {
          setShowFormModal(false)
          setEditingItem(null)
          setFormData(emptyFormData)
          setFormError('')
        } else if (viewingItem) {
          setViewingItem(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFormModal, viewingItem, saving])

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return

    if (!formData.title.trim()) {
      setFormError('Title is required.')
      return
    }

    setSaving(true)
    setFormError('')
    setMessage('')
    setError('')

    try {
      if (editingItem) {
        const updatePayload: UpdateFeedbackRequest = {
          title: formData.title.trim(),
          content: formData.type === 'CONTENT' ? formData.content.trim() : undefined,
          comment: formData.type === 'FEEDBACK' ? formData.content.trim() : undefined,
          status: formData.status,
        }
        await updateFeedbackItem(editingItem.id, updatePayload)
        setMessage(`Item "${formData.title}" updated successfully.`)
      } else {
        const createPayload: CreateFeedbackRequest = {
          type: formData.type,
          title: formData.title.trim(),
          content: formData.type === 'CONTENT' ? formData.content.trim() : undefined,
          comment: formData.type === 'FEEDBACK' ? formData.content.trim() : undefined,
          user: formData.user.trim() || 'Admin',
          status: formData.status,
        }
        await createFeedbackItem(createPayload)
        setMessage(`Content "${formData.title}" created successfully.`)
      }
      setShowFormModal(false)
      setEditingItem(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Failed to save content item.')
      } else {
        setFormError('Unable to save item. Please check connection.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="feedback-page">
      {/* Header */}
      <header className="feedback-header">
        <div>
          <p className="feedback-eyebrow">FEEDBACK & CONTENT MANAGEMENT</p>
          <h1 className="feedback-title">Feedback / Content Management</h1>
          <p className="feedback-subtitle">Manage user feedback and website content</p>
        </div>
        <button
          type="button"
          className="feedback-primary-button"
          onClick={openCreateModal}
        >
          <span>+ Add Content</span>
        </button>
      </header>

      {/* Alerts */}
      {isDemo && (
        <div className="feedback-alert feedback-alert--demo" role="status" data-testid="demo-mode-notice">
          <span>Demo mode — backend endpoint is not implemented. Changes are temporary and reset when the application reloads.</span>
        </div>
      )}

      {message && (
        <div className="feedback-alert feedback-alert--success" role="status">
          <span>{message}</span>
          <button
            type="button"
            className="feedback-alert-close"
            onClick={() => setMessage('')}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="feedback-alert feedback-alert--error" role="alert">
          <span>{error}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="feedback-retry-button"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Retry
            </button>
            <button
              type="button"
              className="feedback-alert-close"
              onClick={() => setError('')}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="feedback-toolbar">
        <div className="feedback-search-box">
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
            className="feedback-search-input"
            placeholder="Search feedback..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
          {search && (
            <button
              type="button"
              className="feedback-clear-search"
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

        <div className="feedback-filters">
          <select
            className="feedback-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            aria-label="Filter by status"
          >
            <option value="ALL">Status: All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>

          <select
            className="feedback-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(0)
            }}
            aria-label="Filter by type"
          >
            <option value="ALL">Type: All</option>
            <option value="FEEDBACK">Feedback</option>
            <option value="CONTENT">Content</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="feedback-card">
        <div className="feedback-table-wrapper">
          <table className="feedback-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>ID</th>
                <th style={{ width: '100px' }}>Type</th>
                <th>Title / Content</th>
                <th>User</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="feedback-loading-state">
                    Loading feedback items…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="feedback-empty-state">
                    No items found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td className="feedback-code-cell">{item.code}</td>
                    <td>
                      <span
                        className={`feedback-type-badge ${
                          item.type === 'FEEDBACK'
                            ? 'feedback-type-badge--feedback'
                            : 'feedback-type-badge--content'
                        }`}
                      >
                        {item.type === 'FEEDBACK' ? 'Feedback' : 'Content'}
                      </span>
                    </td>
                    <td className="feedback-content-cell">
                      <div className="feedback-title-text">{item.title}</div>
                      {item.rating && (
                        <div className="feedback-rating-stars" aria-label={`Rating ${item.rating} out of 5 stars`}>
                          {'★'.repeat(item.rating)}
                          {'☆'.repeat(5 - item.rating)}
                        </div>
                      )}
                    </td>
                    <td className="feedback-user-cell">{item.user}</td>
                    <td>{item.date}</td>
                    <td>
                      <span
                        className={`feedback-status-badge ${
                          item.status === 'PENDING'
                            ? 'feedback-status-badge--pending'
                            : item.status === 'APPROVED' || item.status === 'PUBLISHED'
                            ? 'feedback-status-badge--approved'
                            : item.status === 'REJECTED'
                            ? 'feedback-status-badge--rejected'
                            : 'feedback-status-badge--draft'
                        }`}
                      >
                        {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="feedback-actions">
                        {/* View Eye */}
                        <button
                          type="button"
                          className="feedback-icon-btn"
                          onClick={() => setViewingItem(item)}
                          title="View details"
                          aria-label={`View ${item.code}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        {/* Edit Pencil */}
                        <button
                          type="button"
                          className="feedback-icon-btn"
                          onClick={() => openEditModal(item)}
                          title="Edit"
                          aria-label={`Edit ${item.code}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        {/* Delete Trash */}
                        <button
                          type="button"
                          className="feedback-icon-btn feedback-icon-btn--delete"
                          onClick={() => handleDelete(item)}
                          title="Delete"
                          aria-label={`Delete ${item.code}`}
                          disabled={deletingId === item.id}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>

                        {/* Quick Moderation for Pending */}
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              className="feedback-icon-btn feedback-icon-btn--approve"
                              onClick={() => handleModerate(item, 'APPROVE')}
                              title="Approve feedback"
                              aria-label={`Approve ${item.code}`}
                              disabled={moderatingId === item.id}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="feedback-icon-btn feedback-icon-btn--reject"
                              onClick={() => handleModerate(item, 'REJECT')}
                              title="Reject feedback"
                              aria-label={`Reject ${item.code}`}
                              disabled={moderatingId === item.id}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="feedback-footer">
          <span>
            Showing {items.length > 0 ? page * PAGE_SIZE + 1 : 0}–
            {Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements} items
          </span>
          <div className="feedback-pagination">
            <button
              type="button"
              className="feedback-page-button"
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
                className={`feedback-page-button ${page === idx ? 'active' : ''}`}
                onClick={() => setPage(idx)}
              >
                {idx + 1}
              </button>
            ))}
            <button
              type="button"
              className="feedback-page-button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* View Item Modal */}
      {viewingItem && (
        <div
          className="feedback-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingItem(null)
          }}
        >
          <div
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-view-title"
          >
            <div className="feedback-modal-header">
              <div>
                <h2 id="feedback-view-title">
                  {viewingItem.type === 'FEEDBACK' ? 'Feedback Details' : 'Content Details'} — {viewingItem.code}
                </h2>
                <p>Submitted on {viewingItem.date}</p>
              </div>
              <button
                type="button"
                className="feedback-modal-close"
                onClick={() => setViewingItem(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="feedback-modal-body">
              <div className="feedback-detail-row">
                <span className="feedback-detail-label">Title</span>
                <span className="feedback-detail-value" style={{ fontWeight: 600 }}>
                  {viewingItem.title}
                </span>
              </div>

              <div className="feedback-detail-row">
                <span className="feedback-detail-label">Type & Status</span>
                <span className="feedback-detail-value" style={{ display: 'flex', gap: '8px' }}>
                  <span className={`feedback-type-badge feedback-type-badge--${viewingItem.type.toLowerCase()}`}>
                    {viewingItem.type}
                  </span>
                  <span
                    className={`feedback-status-badge ${
                      viewingItem.status === 'PENDING'
                        ? 'feedback-status-badge--pending'
                        : viewingItem.status === 'APPROVED' || viewingItem.status === 'PUBLISHED'
                        ? 'feedback-status-badge--approved'
                        : viewingItem.status === 'REJECTED'
                        ? 'feedback-status-badge--rejected'
                        : 'feedback-status-badge--draft'
                    }`}
                  >
                    {viewingItem.status}
                  </span>
                </span>
              </div>

              <div className="feedback-detail-row">
                <span className="feedback-detail-label">Submitted By</span>
                <span className="feedback-detail-value">
                  {viewingItem.user} {viewingItem.userEmail && `(${viewingItem.userEmail})`}
                </span>
              </div>

              {viewingItem.rating && (
                <div className="feedback-detail-row">
                  <span className="feedback-detail-label">Rating</span>
                  <span className="feedback-detail-value feedback-rating-stars">
                    {'★'.repeat(viewingItem.rating)}
                    {'☆'.repeat(5 - viewingItem.rating)} ({viewingItem.rating}/5)
                  </span>
                </div>
              )}

              {viewingItem.targetName && (
                <div className="feedback-detail-row">
                  <span className="feedback-detail-label">Target</span>
                  <span className="feedback-detail-value">
                    {viewingItem.targetName} ({viewingItem.targetType})
                  </span>
                </div>
              )}

              <div>
                <span className="feedback-detail-label">
                  {viewingItem.type === 'FEEDBACK' ? 'User Comment' : 'Content Body'}
                </span>
                <div className="feedback-detail-text-box">
                  {viewingItem.comment || viewingItem.content || 'No text provided.'}
                </div>
              </div>
            </div>

            <div className="feedback-modal-footer">
              {viewingItem.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px', marginRight: 'auto' }}>
                  <button
                    type="button"
                    className="feedback-primary-button"
                    style={{ background: '#16a34a', borderColor: '#16a34a' }}
                    onClick={() => handleModerate(viewingItem, 'APPROVE')}
                    disabled={moderatingId === viewingItem.id}
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    className="feedback-secondary-button"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => handleModerate(viewingItem, 'REJECT')}
                    disabled={moderatingId === viewingItem.id}
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
              <button
                type="button"
                className="feedback-secondary-button"
                onClick={() => setViewingItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Content Modal */}
      {showFormModal && (
        <div
          className="feedback-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeFormModal()
          }}
        >
          <div
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-form-modal-title"
          >
            <div className="feedback-modal-header">
              <div>
                <h2 id="feedback-form-modal-title">
                  {editingItem ? 'Edit Item' : 'Add Content / Announcement'}
                </h2>
                <p>Manage announcements, guidelines, and heritage feedback.</p>
              </div>
              <button
                type="button"
                className="feedback-modal-close"
                onClick={closeFormModal}
                disabled={saving}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="feedback-modal-body">
                <div className="feedback-form-row">
                  <label className="feedback-field">
                    <span>Item Type <b>*</b></span>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value as FeedbackType,
                        }))
                      }
                    >
                      <option value="CONTENT">Content / Announcement</option>
                      <option value="FEEDBACK">Feedback Record</option>
                    </select>
                  </label>

                  <label className="feedback-field">
                    <span>Status <b>*</b></span>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as FeedbackStatus,
                        }))
                      }
                    >
                      {formData.type === 'CONTENT' ? (
                        <>
                          <option value="PUBLISHED">Published</option>
                          <option value="DRAFT">Draft</option>
                        </>
                      ) : (
                        <>
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </>
                      )}
                    </select>
                  </label>
                </div>

                <label className="feedback-field">
                  <span>Title <b>*</b></span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter title or topic"
                    maxLength={255}
                    required
                  />
                </label>

                <label className="feedback-field">
                  <span>Author / Submitter</span>
                  <input
                    type="text"
                    value={formData.user}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, user: e.target.value }))
                    }
                    placeholder="Author name (e.g. Admin)"
                  />
                </label>

                <label className="feedback-field">
                  <span>{formData.type === 'CONTENT' ? 'Content Body' : 'Feedback Comment'}</span>
                  <textarea
                    rows={4}
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Enter detailed content, guidelines, or commentary..."
                  />
                </label>

                {formError && (
                  <p className="feedback-alert feedback-alert--error" role="alert" style={{ margin: 0 }}>
                    {formError}
                  </p>
                )}
              </div>

              <div className="feedback-modal-footer">
                <button
                  type="button"
                  className="feedback-secondary-button"
                  onClick={closeFormModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="feedback-primary-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
