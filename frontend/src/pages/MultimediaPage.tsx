
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest } from '../services/apiClient'
import './MultimediaPage.css'

interface Multimedia {
  multimediaId: number
  artifactId: number
  artifactName: string
  type: string
  title: string | null
  url: string
}

interface ArtifactOption {
  artifactId: number
  name: string
}

interface MultimediaForm {
  artifactId: string
  type: string
  title: string
  url: string
}

const ENDPOINT = '/api/multimedia'
const ARTIFACT_ENDPOINT = '/api/artifacts'

const emptyForm: MultimediaForm = {
  artifactId: '',
  type: 'IMAGE',
  title: '',
  url: '',
}

function MultimediaPage() {
  const [items, setItems] = useState<Multimedia[]>([])
  const [artifacts, setArtifacts] = useState<ArtifactOption[]>([])
  const [loading, setLoading] = useState(true)
  const [artifactsLoading, setArtifactsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [artifactFilter, setArtifactFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Multimedia | null>(null)
  const [form, setForm] = useState<MultimediaForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadArtifacts() {
      setArtifactsLoading(true)

      try {
        const response = await apiRequest<ArtifactOption[]>(ARTIFACT_ENDPOINT)

        if (!cancelled) {
          setArtifacts(response.data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          setArtifacts([])
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load artifacts.',
          )
        }
      } finally {
        if (!cancelled) {
          setArtifactsLoading(false)
        }
      }
    }

    void loadArtifacts()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadItems() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (artifactFilter) {
          params.set('artifactId', artifactFilter)
        }

        const query = params.toString()
        const endpoint = query ? `${ENDPOINT}?${query}` : ENDPOINT
        const response = await apiRequest<Multimedia[]>(endpoint)

        if (!cancelled) {
          setItems(response.data ?? [])
        }
      } catch (err) {
        if (!cancelled) {
          setItems([])
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load multimedia resources.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [artifactFilter, reloadKey])

  function openAddForm() {
    setEditingItem(null)
    setForm(emptyForm)
    setFormError('')
    setMessage('')
    setShowForm(true)
  }

  async function openEditForm(item: Multimedia) {
    setError('')
    setMessage('')
    setFormError('')

    try {
      const response = await apiRequest<Multimedia>(
        `${ENDPOINT}/${item.multimediaId}`,
      )
      const detail = response.data

      if (!detail) {
        throw new Error('Multimedia details were not returned.')
      }

      setEditingItem(detail)
      setForm({
        artifactId: String(detail.artifactId),
        type: detail.type,
        title: detail.title ?? '',
        url: detail.url,
      })
      setShowForm(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load multimedia details.',
      )
    }
  }

  function closeForm() {
    if (saving) return

    setShowForm(false)
    setEditingItem(null)
    setForm(emptyForm)
    setFormError('')
  }

  function updateField<K extends keyof MultimediaForm>(
    field: K,
    value: MultimediaForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const artifactId = Number(form.artifactId)
    const type = form.type.trim()
    const title = form.title.trim()
    const url = form.url.trim()

    if (
      !form.artifactId ||
      !Number.isSafeInteger(artifactId) ||
      artifactId < 1
    ) {
      setFormError('Please select an artifact.')
      return
    }

    if (!type) {
      setFormError('Please enter a multimedia type.')
      return
    }

    if (type.length > 20) {
      setFormError('Multimedia type must not exceed 20 characters.')
      return
    }

    if (title.length > 255) {
      setFormError('Title must not exceed 255 characters.')
      return
    }

    if (!url) {
      setFormError('Please enter a multimedia URL.')
      return
    }

    setSaving(true)
    setFormError('')
    setError('')
    setMessage('')

    try {
      const body = JSON.stringify({
        artifactId,
        type,
        title: title || null,
        url,
      })

      if (editingItem) {
        await apiRequest<Multimedia>(
          `${ENDPOINT}/${editingItem.multimediaId}`,
          {
            method: 'PUT',
            body,
          },
        )
        setMessage('Multimedia updated successfully.')
      } else {
        await apiRequest<Multimedia>(ENDPOINT, {
          method: 'POST',
          body,
        })
        setMessage('Multimedia created successfully.')
      }

      setShowForm(false)
      setEditingItem(null)
      setForm(emptyForm)
      setReloadKey((key) => key + 1)
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'Unable to save the multimedia resource.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Multimedia) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.title || item.url}"?`,
    )

    if (!confirmed || deletingId !== null) return

    setDeletingId(item.multimediaId)
    setError('')
    setMessage('')

    try {
      await apiRequest<unknown>(
        `${ENDPOINT}/${item.multimediaId}`,
        { method: 'DELETE' },
      )

      setMessage('Multimedia deleted successfully.')
      setReloadKey((key) => key + 1)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete the multimedia resource.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const visibleItems = typeFilter
    ? items.filter(
        (item) => item.type.toUpperCase() === typeFilter,
      )
    : items

  return (
    <section className="multimedia-page">
      <header className="multimedia-header">
        <div>
          <p className="multimedia-eyebrow">CONTENT MANAGEMENT</p>
          <h1>Multimedia Management</h1>
          <p>Manage multimedia resources linked to heritage artifacts.</p>
        </div>

        <button
          type="button"
          className="multimedia-primary-button"
          onClick={openAddForm}
        >
          <span aria-hidden="true">＋</span> Add Multimedia
        </button>
      </header>

      {message && (
        <div className="multimedia-notice success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="multimedia-notice error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="multimedia-text-button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      )}

      <div className="multimedia-toolbar">
        <select
          aria-label="Filter by artifact"
          value={artifactFilter}
          onChange={(event) => setArtifactFilter(event.target.value)}
        >
          <option value="">All artifacts</option>
          {artifacts.map((artifact) => (
            <option
              key={artifact.artifactId}
              value={artifact.artifactId}
            >
              {artifact.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by media type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="">All media types</option>
          <option value="IMAGE">Images</option>
          <option value="VIDEO">Videos</option>
          <option value="AUDIO">Audio</option>
        </select>
      </div>

      <div className="multimedia-list-heading">
        <div>
          <h2>All multimedia</h2>
          <p>Browse and maintain multimedia resources.</p>
        </div>
        <span>
          {visibleItems.length}{' '}
          {visibleItems.length === 1 ? 'resource' : 'resources'}
        </span>
      </div>

      <div className="multimedia-table-wrapper">
        {loading ? (
          <div className="multimedia-state" role="status">
            <p>Loading multimedia...</p>
          </div>
        ) : !error && visibleItems.length === 0 ? (
          <div className="multimedia-state">
            <div className="multimedia-empty-icon" aria-hidden="true">
              ▧
            </div>
            <h3>No multimedia found</h3>
            <p>Add a multimedia resource and link it to an artifact.</p>
            <button
              type="button"
              className="multimedia-secondary-button"
              onClick={openAddForm}
            >
              Add multimedia
            </button>
          </div>
        ) : !error ? (
          <div className="multimedia-table-scroll">
            <table className="multimedia-table">
              <thead>
                <tr>
                  <th>Title / URL</th>
                  <th>Type</th>
                  <th>Artifact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.multimediaId}>
                    <td>
                      <div className="multimedia-resource">
                        <span
                          className="multimedia-file-icon"
                          aria-hidden="true"
                        >
                          {item.type.toUpperCase() === 'IMAGE'
                            ? '▧'
                            : item.type.toUpperCase() === 'VIDEO'
                              ? '▷'
                              : '♫'}
                        </span>
                        <div>
                          <strong>{item.title || 'Untitled'}</strong>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            title={item.url}
                          >
                            {item.url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`multimedia-type ${item.type.toLowerCase()}`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td>
                      {item.artifactName} (#{item.artifactId})
                    </td>
                    <td className="multimedia-actions">
                      <button
                        type="button"
                        onClick={() => void openEditForm(item)}
                        disabled={deletingId !== null || saving}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId !== null || saving}
                      >
                        {deletingId === item.multimediaId
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {showForm && (
        <div
          className="multimedia-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="multimedia-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="multimedia-form-title"
          >
            <header className="multimedia-modal-header">
              <div>
                <p className="multimedia-eyebrow">CONTENT MANAGEMENT</p>
                <h2 id="multimedia-form-title">
                  {editingItem ? 'Edit Multimedia' : 'Add Multimedia'}
                </h2>
                <p>
                  Link a multimedia URL to an artifact.
                </p>
              </div>
              <button
                type="button"
                className="multimedia-close-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="multimedia-form-body">
                <label>
                  <span>Artifact *</span>
                  <select
                    required
                    value={form.artifactId}
                    disabled={artifactsLoading || saving}
                    onChange={(event) =>
                      updateField('artifactId', event.target.value)
                    }
                  >
                    <option value="">
                      {artifactsLoading
                        ? 'Loading artifacts...'
                        : 'Select an artifact'}
                    </option>
                    {artifacts.map((artifact) => (
                      <option
                        key={artifact.artifactId}
                        value={artifact.artifactId}
                      >
                        {artifact.name} (#{artifact.artifactId})
                      </option>
                    ))}
                  </select>
                  {!artifactsLoading && artifacts.length === 0 && (
                    <small>
                      No artifacts available. Check the Artifact API before
                      creating multimedia.
                    </small>
                  )}
                </label>

                <label>
                  <span>Type *</span>
                  <input
                    required
                    maxLength={20}
                    value={form.type}
                    onChange={(event) =>
                      updateField('type', event.target.value)
                    }
                    placeholder="e.g. IMAGE, VIDEO, AUDIO"
                  />
                </label>

                <label>
                  <span>Title</span>
                  <input
                    maxLength={255}
                    value={form.title}
                    onChange={(event) =>
                      updateField('title', event.target.value)
                    }
                    placeholder="Enter multimedia title"
                  />
                </label>

                <label>
                  <span>URL *</span>
                  <input
                    required
                    type="url"
                    value={form.url}
                    onChange={(event) =>
                      updateField('url', event.target.value)
                    }
                    placeholder="https://example.com/media"
                  />
                </label>

                {formError && (
                  <p className="multimedia-form-error" role="alert">
                    {formError}
                  </p>
                )}
              </div>

              <footer className="multimedia-form-actions">
                <button
                  type="button"
                  className="multimedia-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="multimedia-primary-button"
                  disabled={
                    saving ||
                    artifactsLoading ||
                    artifacts.length === 0
                  }
                >
                  {saving
                    ? 'Saving...'
                    : editingItem
                      ? 'Save changes'
                      : 'Create multimedia'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default MultimediaPage
