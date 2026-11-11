import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest } from '../services/apiClient'
import type { PageResponse } from '../types/api'
import './ArtifactsPage.css'

interface HeritageSite {
  siteId: number
  name: string
}

interface Artifact {
  artifactId: number
  siteId: number
  siteName: string
  name: string
  description: string | null
}

interface ArtifactForm {
  name: string
  siteId: string
  description: string
}

const emptyForm: ArtifactForm = {
  name: '',
  siteId: '',
  description: '',
}

const ARTIFACTS_ENDPOINT = '/api/artifacts'
const SITES_ENDPOINT = '/api/heritage-sites'
const PAGE_SIZE = 10

function ArtifactsPage() {
  const [sites, setSites] = useState<HeritageSite[]>([])
  const [sitesLoading, setSitesLoading] = useState(true)
  const [sitesError, setSitesError] = useState('')

  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [siteFilter, setSiteFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const [showForm, setShowForm] = useState(false)
  const [editingArtifact, setEditingArtifact] =
    useState<Artifact | null>(null)
  const [form, setForm] = useState<ArtifactForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // GET /api/heritage-sites (no page/size to get full list for dropdown)
  useEffect(() => {
    let cancelled = false

    async function fetchSites() {
      setSitesLoading(true)
      setSitesError('')

      try {
        type SitesData = HeritageSite[] | PageResponse<HeritageSite>
        const response = await apiRequest<SitesData>(SITES_ENDPOINT)

        if (!cancelled) {
          const resData = response.data
          if (Array.isArray(resData)) {
            setSites(resData)
          } else if (resData && Array.isArray(resData.content)) {
            setSites(resData.content)
          } else {
            setSites([])
          }
        }
      } catch (err) {
        if (!cancelled) {
          setSites([])

          setSitesError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load heritage sites.',
          )
        }
      } finally {
        if (!cancelled) {
          setSitesLoading(false)
        }
      }
    }

    void fetchSites()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // The filter is picked from the loaded sites, so it is always a valid ID.
  // If the selected site no longer exists (e.g. deleted elsewhere), fall back
  // to "all sites" instead of requesting a missing site (404).
  const activeSiteFilter =
    siteFilter && sites.some((site) => String(site.siteId) === siteFilter)
      ? siteFilter
      : ''

  // GET /api/artifacts with siteId, keyword, page, size
  useEffect(() => {
    let cancelled = false

    async function fetchArtifacts() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (activeSiteFilter) {
          params.set('siteId', activeSiteFilter)
        }

        const trimmedSearch = search.trim()
        if (trimmedSearch) {
          params.set('keyword', trimmedSearch)
        }

        params.set('page', String(page))
        params.set('size', String(PAGE_SIZE))

        const query = params.toString()
        const endpoint = query
          ? `${ARTIFACTS_ENDPOINT}?${query}`
          : ARTIFACTS_ENDPOINT

        type ArtifactData = Artifact[] | PageResponse<Artifact>
        const response = await apiRequest<ArtifactData>(endpoint)

        if (!cancelled) {
          const resData = response.data
          if (Array.isArray(resData)) {
            // Dual compatibility: client-side fallback if backend returns unpaginated List<T>
            const keywordLower = trimmedSearch.toLowerCase()
            const filtered = keywordLower
              ? resData.filter(
                  (artifact) =>
                    artifact.name.toLowerCase().includes(keywordLower) ||
                    (artifact.description ?? '').toLowerCase().includes(keywordLower) ||
                    (artifact.siteName ?? '').toLowerCase().includes(keywordLower),
                )
              : resData

            setTotalElements(filtered.length)
            setTotalPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
            setArtifacts(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE))
          } else if (resData && Array.isArray(resData.content)) {
            // Backend PageResponse<T> from M2 contract
            setArtifacts(resData.content)
            setTotalElements(resData.totalElements)
            setTotalPages(Math.max(1, resData.totalPages))
          } else {
            setArtifacts([])
            setTotalElements(0)
            setTotalPages(1)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setArtifacts([])
          setTotalElements(0)
          setTotalPages(1)

          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load artifacts.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchArtifacts()

    return () => {
      cancelled = true
    }
  }, [activeSiteFilter, search, page, reloadKey])

  function openAddForm() {
    setEditingArtifact(null)
    setForm(emptyForm)
    setFormError('')
    setMessage('')
    setShowForm(true)
  }

  // GET /api/artifacts/{artifactId}
  async function openArtifactDetail(artifact: Artifact) {
    setError('')
    setMessage('')
    setFormError('')

    try {
      const response = await apiRequest<Artifact>(
        `${ARTIFACTS_ENDPOINT}/${artifact.artifactId}`,
      )

      const detail = response.data

      if (!detail) {
        throw new Error('Artifact details were not returned.')
      }

      setEditingArtifact(detail)
      setForm({
        name: detail.name ?? '',
        siteId: String(detail.siteId ?? ''),
        description: detail.description ?? '',
      })
      setShowForm(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load artifact details.',
      )
    }
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingArtifact(null)
    setForm(emptyForm)
    setFormError('')
  }

  function updateField(field: keyof ArtifactForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  // POST /api/artifacts
  // PUT /api/artifacts/{artifactId}
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saving) return

    if (!form.name.trim()) {
      setFormError('Please enter the artifact name.')
      return
    }

    const siteId = Number(form.siteId)

    if (
      !form.siteId ||
      !Number.isSafeInteger(siteId) ||
      siteId < 1 ||
      !sites.some((site) => site.siteId === siteId)
    ) {
      setFormError('Please select a valid Heritage Site.')
      return
    }

    const payload = {
      name: form.name.trim(),
      siteId,
      description: form.description.trim() || null,
    }

    setSaving(true)
    setFormError('')
    setMessage('')
    setError('')

    try {
      if (editingArtifact) {
        await apiRequest<Artifact>(
          `${ARTIFACTS_ENDPOINT}/${editingArtifact.artifactId}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
        )

        setMessage('Artifact updated successfully.')
      } else {
        await apiRequest<Artifact>(ARTIFACTS_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setMessage('Artifact created successfully.')
      }

      setShowForm(false)
      setEditingArtifact(null)
      setForm(emptyForm)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Unable to save the artifact.',
      )
    } finally {
      setSaving(false)
    }
  }

  // DELETE /api/artifacts/{artifactId}
  async function handleDelete(artifact: Artifact) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${artifact.name}"?`,
    )

    if (!confirmed || deletingId !== null) return

    setDeletingId(artifact.artifactId)
    setMessage('')
    setError('')

    try {
      await apiRequest<unknown>(
        `${ARTIFACTS_ENDPOINT}/${artifact.artifactId}`,
        { method: 'DELETE' },
      )

      setMessage('Artifact deleted successfully.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete the artifact.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="artifacts-page">
      <header className="artifacts-header">
        <div>
          <p className="artifacts-eyebrow">CONTENT MANAGEMENT</p>
          <h1>Artifact Management</h1>
          <p>Manage artifacts associated with heritage sites.</p>
        </div>

        <button
          type="button"
          className="artifact-primary-button"
          onClick={openAddForm}
        >
          <span aria-hidden="true">＋</span> Add Artifact
        </button>
      </header>

      {message && (
        <div className="artifact-notice success" role="status">
          {message}
        </div>
      )}

      {sitesError && (
        <div className="artifact-notice error" role="alert">
          <span>Unable to load Heritage Sites: {sitesError}</span>
          <button
            type="button"
            className="artifact-text-button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {error && (
        <div className="artifact-notice error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="artifact-text-button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="artifact-toolbar">
        <input
          aria-label="Search artifacts"
          placeholder="Search artifacts..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(0)
          }}
        />

        <select
          aria-label="Filter by Heritage Site"
          value={activeSiteFilter}
          onChange={(event) => {
            setSiteFilter(event.target.value)
            setPage(0)
          }}
          disabled={sitesLoading || !!sitesError}
        >
          <option value="">
            {sitesLoading
              ? 'Loading Heritage Sites...'
              : sitesError
                ? 'Heritage Sites unavailable'
                : 'All Heritage Sites'}
          </option>

          {sites.map((site) => (
            <option key={site.siteId} value={String(site.siteId)}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      <div className="artifact-list-heading">
        <div>
          <h2>All artifacts</h2>
          <p>View and maintain registered artifacts.</p>
        </div>

        <span>
          {search.trim()
            ? `${totalElements} matching ${totalElements === 1 ? 'artifact' : 'artifacts'}`
            : `${totalElements} ${totalElements === 1 ? 'artifact' : 'artifacts'}`}
        </span>
      </div>

      <div className="artifact-table-wrapper">
        {loading ? (
          <div className="artifact-state" role="status">
            <p>Loading artifacts...</p>
          </div>
        ) : error ? null : totalElements === 0 ? (
          <div className="artifact-state">
            <h3>No artifacts found</h3>
            <p>
              {search || activeSiteFilter
                ? 'Try changing your search or Heritage Site filter.'
                : 'Artifacts will appear here once they are available.'}
            </p>

            {!search && !activeSiteFilter && (
              <button
                type="button"
                className="artifact-secondary-button"
                onClick={openAddForm}
              >
                Add your first artifact
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="artifact-table-scroll">
              <table className="artifact-table">
                <thead>
                  <tr>
                    <th>Artifact</th>
                    <th>Heritage Site</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {artifacts.map((artifact) => (
                    <tr key={artifact.artifactId}>
                      <td>{artifact.name}</td>
                      <td>
                        {artifact.siteName || `Site #${artifact.siteId}`}
                      </td>
                      <td>{artifact.description || '—'}</td>
                      <td className="artifact-actions">
                        <button
                          type="button"
                          onClick={() => void openArtifactDetail(artifact)}
                          disabled={deletingId !== null || loading}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(artifact)}
                          disabled={deletingId !== null || loading}
                        >
                          {deletingId === artifact.artifactId
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalElements > 0 && (
              <nav
                className="artifact-pagination"
                aria-label="Artifacts pagination"
              >
                <span>
                  Showing page {page + 1} of {totalPages} ({totalElements}{' '}
                  {totalElements === 1 ? 'artifact' : 'artifacts'})
                </span>
                <div className="artifact-pagination-buttons">
                  <button
                    type="button"
                    className="artifact-page-button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="artifact-page-button"
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

      {showForm && (
        <div
          className="artifact-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="artifact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="artifact-form-title"
          >
            <header className="artifact-modal-header">
              <div>
                <p className="artifacts-eyebrow">CONTENT MANAGEMENT</p>
                <h2 id="artifact-form-title">
                  {editingArtifact ? 'Edit Artifact' : 'Add Artifact'}
                </h2>
                <p>Enter the details for this artifact.</p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="artifact-form-body">
                <label>
                  <span>Artifact name *</span>
                  <input
                    autoFocus
                    required
                    maxLength={255}
                    value={form.name}
                    onChange={(event) =>
                      updateField('name', event.target.value)
                    }
                    placeholder="Enter artifact name"
                  />
                </label>

                <label>
                  <span>Heritage Site *</span>
                  <select
                    required
                    value={form.siteId}
                    onChange={(event) =>
                      updateField('siteId', event.target.value)
                    }
                    disabled={sitesLoading || !!sitesError || saving}
                  >
                    <option value="">
                      {sitesLoading
                        ? 'Loading Heritage Sites...'
                        : sitesError
                          ? 'Unable to load Heritage Sites'
                          : 'Select a Heritage Site'}
                    </option>

                    {sites.map((site) => (
                      <option
                        key={site.siteId}
                        value={String(site.siteId)}
                      >
                        {site.name}
                      </option>
                    ))}
                  </select>

                  {sites.length === 0 &&
                    !sitesLoading &&
                    !sitesError && (
                      <small>
                        Create a Heritage Site before adding an artifact.
                      </small>
                    )}
                </label>

                <label>
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField('description', event.target.value)
                    }
                    placeholder="Describe this artifact"
                    rows={4}
                  />
                </label>

                {formError && (
                  <p className="artifact-form-error" role="alert">
                    {formError}
                  </p>
                )}
              </div>

              <footer className="artifact-form-actions">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="artifact-primary-button"
                  disabled={
                    saving ||
                    sitesLoading ||
                    !!sitesError ||
                    sites.length === 0
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingArtifact
                      ? 'Save changes'
                      : 'Create artifact'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default ArtifactsPage
