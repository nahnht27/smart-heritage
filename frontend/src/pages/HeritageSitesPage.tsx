import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest } from '../services/apiClient'
import type { PageResponse } from '../types/api'
import './HeritageSitesPage.css'

interface HeritageSite {
  siteId: number
  name: string
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

interface SiteForm {
  name: string
  description: string
  address: string
  latitude: string
  longitude: string
}

const emptyForm: SiteForm = {
  name: '',
  description: '',
  address: '',
  latitude: '',
  longitude: '',
}

const PAGE_SIZE = 10

function HeritageSitesPage() {
  const [sites, setSites] = useState<HeritageSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState('')

  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [editingSite, setEditingSite] = useState<HeritageSite | null>(null)
  const [form, setForm] = useState<SiteForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [viewingSite, setViewingSite] = useState<HeritageSite | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadHeritageSites() {
      setError('')
      setLoading(true)

      try {
        const params = new URLSearchParams()
        const trimmedKeyword = search.trim()

        if (trimmedKeyword) {
          params.set('keyword', trimmedKeyword)
        }
        params.set('page', String(page))
        params.set('size', String(PAGE_SIZE))

        const query = params.toString()
        const endpoint = query
          ? `/api/heritage-sites?${query}`
          : '/api/heritage-sites'

        type ResponseData = HeritageSite[] | PageResponse<HeritageSite>
        const response = await apiRequest<ResponseData>(endpoint)

        if (!cancelled) {
          const resData = response.data
          if (Array.isArray(resData)) {
            // Dual compatibility: client-side fallback if backend returns unpaginated List<T>
            const keywordLower = trimmedKeyword.toLowerCase()
            const filtered = keywordLower
              ? resData.filter(
                  (site) =>
                    site.name.toLowerCase().includes(keywordLower) ||
                    (site.address ?? '').toLowerCase().includes(keywordLower) ||
                    (site.description ?? '').toLowerCase().includes(keywordLower),
                )
              : resData

            setTotalElements(filtered.length)
            setTotalPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
            setSites(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))
          } else if (resData && Array.isArray(resData.content)) {
            // Backend PageResponse<T> from M2 contract
            setSites(resData.content)
            setTotalElements(resData.totalElements)
            setTotalPages(Math.max(1, resData.totalPages))
          } else {
            setSites([])
            setTotalElements(0)
            setTotalPages(1)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSites([])
          setTotalElements(0)
          setTotalPages(1)
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load heritage sites.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadHeritageSites()

    return () => {
      cancelled = true
    }
  }, [page, search, reloadKey])

  function openAddForm() {
    setEditingSite(null)
    setForm(emptyForm)
    setFormError('')
    setMessage('')
    setShowForm(true)
  }

  function openEditForm(site: HeritageSite) {
    setEditingSite(site)
    setForm({
      name: site.name,
      description: site.description ?? '',
      address: site.address ?? '',
      latitude: site.latitude == null ? '' : String(site.latitude),
      longitude: site.longitude == null ? '' : String(site.longitude),
    })
    setFormError('')
    setMessage('')
    setShowForm(true)
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingSite(null)
    setForm(emptyForm)
    setFormError('')
  }

  function updateField(field: keyof SiteForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  async function handleViewDetails(site: HeritageSite) {
    setViewingSite(null)
    setDetailError('')
    setDetailLoading(true)

    try {
      const response = await apiRequest<HeritageSite>(
        `/api/heritage-sites/${site.siteId}`,
      )

      setViewingSite(response.data ?? null)
    } catch (err) {
      setDetailError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load heritage site details.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetails() {
    setViewingSite(null)
    setDetailError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const name = form.name.trim()
    const latitudeText = form.latitude.trim()
    const longitudeText = form.longitude.trim()

    const latitude = latitudeText === '' ? null : Number(latitudeText)
    const longitude = longitudeText === '' ? null : Number(longitudeText)

    if (!name) {
      setFormError('Please enter the heritage site name.')
      return
    }

    if (
      latitude !== null &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    ) {
      setFormError('Latitude must be a number from -90 to 90.')
      return
    }

    if (
      longitude !== null &&
      (!Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180)
    ) {
      setFormError('Longitude must be a number from -180 to 180.')
      return
    }

    const payload = {
      name,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      latitude,
      longitude,
    }

    setSaving(true)
    setFormError('')
    setMessage('')
    setError('')

    try {
      if (editingSite) {
        await apiRequest<HeritageSite>(
          `/api/heritage-sites/${editingSite.siteId}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
        )

        setMessage('Heritage site updated successfully.')
      } else {
        await apiRequest<HeritageSite>('/api/heritage-sites', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setMessage('Heritage site created successfully.')
      }

      setShowForm(false)
      setEditingSite(null)
      setForm(emptyForm)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Unable to save the heritage site.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(site: HeritageSite) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${site.name}"?`,
    )

    if (!confirmed || deletingId !== null) return

    setDeletingId(site.siteId)
    setMessage('')
    setError('')

    try {
      await apiRequest<unknown>(
        `/api/heritage-sites/${site.siteId}`,
        { method: 'DELETE' },
      )

      setMessage('Heritage site deleted successfully.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete the heritage site.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="heritage-page">
      <header className="heritage-header">
        <div>
          <p className="heritage-eyebrow">CONTENT MANAGEMENT</p>
          <h1>Heritage Sites</h1>
          <p className="heritage-description">
            Manage heritage site information and locations.
          </p>
        </div>

        <button
          type="button"
          className="heritage-primary-button"
          onClick={openAddForm}
        >
          <span aria-hidden="true">＋</span> Add Heritage Site
        </button>
      </header>

      {message && (
        <div className="heritage-notice success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="heritage-notice error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="heritage-text-button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      )}

      <div className="heritage-toolbar">
        <div>
          <h2>All heritage sites</h2>
          <p>View and maintain registered heritage locations.</p>
        </div>

        <span className="heritage-count">
          {search.trim()
            ? `${totalElements} matching ${totalElements === 1 ? 'site' : 'sites'}`
            : `${totalElements} ${totalElements === 1 ? 'site' : 'sites'}`}
        </span>
      </div>

      <div className="heritage-search">
        <input
          type="search"
          aria-label="Search heritage sites"
          placeholder="Search by name, address, or description..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(0)
          }}
        />
      </div>

      <div className="heritage-table-card">
        {loading ? (
          <div className="heritage-state" role="status">
            <span className="heritage-spinner" />
            <p>Loading heritage sites...</p>
          </div>
        ) : error ? (
          <div className="heritage-state">
            <h3>Unable to display heritage sites</h3>
            <p>Check the backend connection and try again.</p>
          </div>
        ) : totalElements === 0 ? (
          search.trim() ? (
            <div className="heritage-state">
              <h3>No matching heritage sites</h3>
              <p>Try a different name, address, or description.</p>

              <button
                type="button"
                className="heritage-secondary-button"
                onClick={() => {
                  setSearch('')
                  setPage(0)
                }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="heritage-state">
              <div className="heritage-empty-icon" aria-hidden="true">
                <span>⌖</span>
              </div>

              <h3>No heritage sites yet</h3>
              <p>
                Heritage sites will appear here once they are available.
              </p>

              <button
                type="button"
                className="heritage-secondary-button"
                onClick={openAddForm}
              >
                Add your first site
              </button>
            </div>
          )
        ) : (
          <>
            <div className="heritage-table-scroll">
              <table className="heritage-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Address</th>
                    <th>Description</th>
                    <th>Coordinates</th>
                    <th className="heritage-actions-heading">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sites.map((site) => (
                    <tr key={site.siteId}>
                      <td>
                        <div className="heritage-site-name">
                          <span className="heritage-site-icon" aria-hidden="true">
                            ⌖
                          </span>

                          <div>
                            <strong>{site.name}</strong>
                            <span>ID: {site.siteId}</span>
                          </div>
                        </div>
                      </td>

                      <td>{site.address || '—'}</td>
                      <td className="heritage-description-cell">
                        {site.description || '—'}
                      </td>
                      <td className="heritage-coordinates">
                        {site.latitude ?? '—'}, {site.longitude ?? '—'}
                      </td>

                      <td>
                        <div className="heritage-row-actions">
                          <button
                            type="button"
                            className="heritage-action-button"
                            onClick={() => void handleViewDetails(site)}
                            disabled={detailLoading || deletingId !== null}
                            aria-label={`View ${site.name}`}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="heritage-action-button"
                            onClick={() => openEditForm(site)}
                            disabled={saving || deletingId !== null}
                            aria-label={`Edit ${site.name}`}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="heritage-action-button delete"
                            onClick={() => void handleDelete(site)}
                            disabled={deletingId !== null || saving}
                            aria-label={`Delete ${site.name}`}
                          >
                            {deletingId === site.siteId ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalElements > 0 && (
              <nav
                className="heritage-pagination"
                aria-label="Heritage sites pagination"
              >
                <span>
                  Showing page {page + 1} of {totalPages} ({totalElements}{' '}
                  {totalElements === 1 ? 'site' : 'sites'})
                </span>
                <div className="heritage-pagination-buttons">
                  <button
                    type="button"
                    className="heritage-page-button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="heritage-page-button"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1 || loading}
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>

      {detailLoading && (
        <div className="heritage-modal-backdrop">
          <section
            className="heritage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="heritage-detail-title"
          >
            <div className="heritage-state" role="status">
              <span className="heritage-spinner" />
              <p>Loading heritage site details...</p>
            </div>
          </section>
        </div>
      )}

      {detailError && !detailLoading && (
        <div className="heritage-modal-backdrop">
          <section
            className="heritage-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="heritage-detail-error-title"
          >
            <header className="heritage-modal-header">
              <div>
                <h2 id="heritage-detail-error-title">Unable to load details</h2>
                <p>{detailError}</p>
              </div>
              <button
                type="button"
                className="heritage-close-button"
                onClick={closeDetails}
                aria-label="Close details"
              >
                ×
              </button>
            </header>
            <footer className="heritage-modal-footer">
              <button
                type="button"
                className="heritage-secondary-button"
                onClick={closeDetails}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {viewingSite && !detailLoading && (
        <div
          className="heritage-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails()
          }}
        >
          <section
            className="heritage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="heritage-detail-title"
          >
            <header className="heritage-modal-header">
              <div>
                <p className="heritage-eyebrow">HERITAGE DETAILS</p>
                <h2 id="heritage-detail-title">{viewingSite.name}</h2>
                <p>View the registered heritage site information.</p>
              </div>

              <button
                type="button"
                className="heritage-close-button"
                onClick={closeDetails}
                aria-label="Close details"
              >
                ×
              </button>
            </header>

            <div className="heritage-form-body">
              <p><strong>Site ID:</strong> {viewingSite.siteId}</p>
              <p><strong>Name:</strong> {viewingSite.name}</p>
              <p><strong>Address:</strong> {viewingSite.address || '—'}</p>
              <p><strong>Description:</strong> {viewingSite.description || '—'}</p>
              <p><strong>Latitude:</strong> {viewingSite.latitude ?? '—'}</p>
              <p><strong>Longitude:</strong> {viewingSite.longitude ?? '—'}</p>
            </div>

            <footer className="heritage-modal-footer">
              <button
                type="button"
                className="heritage-secondary-button"
                onClick={closeDetails}
              >
                Close
              </button>
              <button
                type="button"
                className="heritage-primary-button"
                onClick={() => {
                  if (!viewingSite) return

                  const site = viewingSite
                  closeDetails()
                  openEditForm(site)
                }}
              >
                Edit site
              </button>
            </footer>
          </section>
        </div>
      )}

      {showForm && (
        <div
          className="heritage-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="heritage-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="heritage-form-title"
          >
            <header className="heritage-modal-header">
              <div>
                <p className="heritage-eyebrow">HERITAGE MANAGEMENT</p>
                <h2 id="heritage-form-title">
                  {editingSite ? 'Edit Heritage Site' : 'Add Heritage Site'}
                </h2>
                <p>Enter the details for this heritage location.</p>
              </div>

              <button
                type="button"
                className="heritage-close-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="heritage-form-body">
                <label className="heritage-field">
                  <span>Site name <b>*</b></span>
                  <input
                    autoFocus
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder="Enter heritage site name"
                    maxLength={255}
                    required
                  />
                </label>

                <label className="heritage-field">
                  <span>Address</span>
                  <input
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    placeholder="Enter full address (optional)"
                    maxLength={500}
                  />
                </label>

                <label className="heritage-field">
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateField('description', event.target.value)}
                    placeholder="Describe this heritage site (optional)"
                    rows={4}
                  />
                </label>

                <div className="heritage-coordinate-fields">
                  <label className="heritage-field">
                    <span>Latitude</span>
                    <input
                      type="number"
                      value={form.latitude}
                      onChange={(event) => updateField('latitude', event.target.value)}
                      placeholder="10.7626"
                      min="-90"
                      max="90"
                      step="any"
                    />
                  </label>

                  <label className="heritage-field">
                    <span>Longitude</span>
                    <input
                      type="number"
                      value={form.longitude}
                      onChange={(event) => updateField('longitude', event.target.value)}
                      placeholder="106.6602"
                      min="-180"
                      max="180"
                      step="any"
                    />
                  </label>
                </div>

                {formError && (
                  <p className="heritage-form-error" role="alert">
                    {formError}
                  </p>
                )}
              </div>

              <footer className="heritage-modal-footer">
                <button
                  type="button"
                  className="heritage-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="heritage-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingSite
                      ? 'Save changes'
                      : 'Create site'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default HeritageSitesPage
