import { useEffect, useState, useId } from 'react'
import type { FormEvent } from 'react'
import { ApiError, apiRequest } from '../services/apiClient'
import {
  getAllBeacons,
  getBeaconById,
  createBeacon,
  updateBeacon,
  deleteBeacon,
} from '../services/beaconService'
import type { Beacon, BeaconRequest } from '../types/beacon'
import type { PageResponse } from '../types/api'
import './BeaconsPage.css'

interface ArtifactOption {
  artifactId: number
  name: string
  siteId?: number
  siteName?: string
}

interface BeaconFormData {
  name: string
  uuid: string
  major: string
  minor: string
  enabled: boolean
  artifactId: string
}

const emptyFormData: BeaconFormData = {
  name: '',
  uuid: '',
  major: '',
  minor: '',
  enabled: true,
  artifactId: '',
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export default function BeaconsPage() {
  const nameInputId = useId()
  const uuidInputId = useId()
  const majorInputId = useId()
  const minorInputId = useId()
  const enabledInputId = useId()
  const artifactInputId = useId()

  const [beacons, setBeacons] = useState<Beacon[]>([])
  const [artifacts, setArtifacts] = useState<ArtifactOption[]>([])
  const [loading, setLoading] = useState(true)
  const [artifactsLoading, setArtifactsLoading] = useState(false)
  const [artifactsError, setArtifactsError] = useState('')
  const [artifactsReloadKey, setArtifactsReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  // Non-fatal notice that must survive the automatic list reload (e.g. 404).
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Filters & search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [artifactFilter, setArtifactFilter] = useState('')

  // Modal form state
  const [showModal, setShowModal] = useState(false)
  const [editingBeacon, setEditingBeacon] = useState<Beacon | null>(null)
  const [formData, setFormData] = useState<BeaconFormData>(emptyFormData)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 1. Fetch Beacons list
  useEffect(() => {
    let cancelled = false

    async function fetchBeacons() {
      setLoading(true)
      setError('')

      try {
        const data = await getAllBeacons()
        if (!cancelled) {
          setBeacons(data)
        }
      } catch (err) {
        if (!cancelled) {
          setBeacons([])
          setError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load beacons. Please check backend connection.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchBeacons()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // 2. Fetch Artifacts for dropdown selection
  useEffect(() => {
    let cancelled = false

    async function loadArtifacts() {
      setArtifactsLoading(true)
      setArtifactsError('')

      try {
        type ArtifactsPayload = ArtifactOption[] | PageResponse<ArtifactOption>
        // Without page/size the backend returns the complete list, so every
        // Artifact can be mapped (a fixed page size would silently truncate).
        const response = await apiRequest<ArtifactsPayload>('/api/artifacts')

        if (!cancelled) {
          const resData = response.data
          if (Array.isArray(resData)) {
            setArtifacts(resData)
          } else if (resData && Array.isArray(resData.content)) {
            setArtifacts(resData.content)
          } else {
            setArtifacts([])
          }
        }
      } catch (err) {
        if (!cancelled) {
          setArtifacts([])
          setArtifactsError(
            err instanceof ApiError
              ? err.message
              : 'Unable to load artifacts. Please check backend connection.',
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
  }, [artifactsReloadKey])

  // The record (or its Artifact) changed on the server: refresh both lists so
  // the UI never keeps showing stale rows.
  function refreshAll() {
    setReloadKey((k) => k + 1)
    setArtifactsReloadKey((k) => k + 1)
  }

  function openCreateModal() {
    setEditingBeacon(null)
    setFormData(emptyFormData)
    setFormError('')
    setMessage('')
    setNotice('')
    setShowModal(true)
  }

  async function openEditModal(beacon: Beacon) {
    setFormError('')
    setMessage('')
    setNotice('')

    try {
      const detail = await getBeaconById(beacon.beaconId)
      setEditingBeacon(detail)
      setFormData({
        name: detail.name ?? '',
        uuid: detail.uuid ?? '',
        major: detail.major !== undefined ? String(detail.major) : '',
        minor: detail.minor !== undefined ? String(detail.minor) : '',
        enabled: detail.enabled ?? true,
        artifactId: detail.artifactId ? String(detail.artifactId) : '',
      })
      setShowModal(true)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to load beacon details.',
      )
      if (err instanceof ApiError && err.status === 404) {
        setNotice('This beacon no longer exists. The list was refreshed.')
        setReloadKey((k) => k + 1)
      }
    }
  }

  function closeModal() {
    if (saving) return
    setShowModal(false)
    setEditingBeacon(null)
    setFormData(emptyFormData)
    setFormError('')
  }

  function validateForm(): string | null {
    if (!formData.name.trim()) {
      return 'Beacon name is required.'
    }
    if (formData.name.trim().length > 255) {
      return 'Beacon name must not exceed 255 characters.'
    }

    const trimmedUuid = formData.uuid.trim()
    if (!trimmedUuid) {
      return 'Proximity UUID is required.'
    }
    if (!UUID_REGEX.test(trimmedUuid)) {
      return 'Invalid UUID format. Example: e2c56db5-dffb-48d2-b060-d0f5a71096e0'
    }

    if (formData.major === '') {
      return 'Major value is required.'
    }
    const majorNum = Number(formData.major)
    if (!Number.isInteger(majorNum) || majorNum < 0 || majorNum > 65535) {
      return 'Major must be an integer between 0 and 65535.'
    }

    if (formData.minor === '') {
      return 'Minor value is required.'
    }
    const minorNum = Number(formData.minor)
    if (!Number.isInteger(minorNum) || minorNum < 0 || minorNum > 65535) {
      return 'Minor must be an integer between 0 and 65535.'
    }

    if (formData.artifactId) {
      const artId = Number(formData.artifactId)
      if (!Number.isInteger(artId) || artId <= 0) {
        return 'Artifact ID must be a positive integer.'
      }
    }

    return null
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saving) return

    const validationMsg = validateForm()
    if (validationMsg) {
      setFormError(validationMsg)
      return
    }

    const payload: BeaconRequest = {
      name: formData.name.trim(),
      uuid: formData.uuid.trim(),
      major: Number(formData.major),
      minor: Number(formData.minor),
      enabled: formData.enabled,
      artifactId: formData.artifactId ? Number(formData.artifactId) : null,
    }

    setSaving(true)
    setFormError('')
    setMessage('')
    setError('')

    try {
      if (editingBeacon) {
        await updateBeacon(editingBeacon.beaconId, payload)
        setMessage(`Beacon "${payload.name}" updated successfully.`)
      } else {
        await createBeacon(payload)
        setMessage(`Beacon "${payload.name}" created successfully.`)
      }

      setShowModal(false)
      setEditingBeacon(null)
      setFormData(emptyFormData)
      setReloadKey((k) => k + 1)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setFormError(
            err.message ||
              'A beacon with the same UUID, major and minor already exists.',
          )
        } else if (err.status === 400) {
          setFormError(err.message || 'Validation failed. Please check inputs.')
        } else if (err.status === 403) {
          setFormError('You do not have permission to perform this action.')
        } else if (err.status === 404) {
          setFormError(
            `${err.message || 'The beacon or artifact no longer exists.'} The lists were refreshed; please review and try again.`,
          )
          refreshAll()
        } else {
          setFormError(err.message || 'Failed to save beacon.')
        }
      } else {
        setFormError('Unable to save beacon. Please check network connection.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(beacon: Beacon) {
    const confirmed = window.confirm(
      `Are you sure you want to delete beacon "${beacon.name}" (Major: ${beacon.major}, Minor: ${beacon.minor})?\n\nThis will remove the proximity mapping for this hardware device.`,
    )
    if (!confirmed || deletingId !== null) return

    setDeletingId(beacon.beaconId)
    setError('')
    setMessage('')
    setNotice('')

    try {
      await deleteBeacon(beacon.beaconId)
      setMessage(`Beacon "${beacon.name}" deleted successfully.`)
      setReloadKey((k) => k + 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotice(
          `${err.message || 'Beacon no longer exists.'} The list was refreshed.`,
        )
        setReloadKey((k) => k + 1)
      } else if (err instanceof ApiError && err.status === 403) {
        setError('You do not have permission to delete beacons.')
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Unable to delete beacon. Please try again.',
        )
      }
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered list
  const filteredBeacons = beacons.filter((b) => {
    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const matchesName = b.name.toLowerCase().includes(q)
      const matchesUuid = b.uuid.toLowerCase().includes(q)
      const matchesMajor = String(b.major).includes(q)
      const matchesMinor = String(b.minor).includes(q)
      const matchesArtifact = b.artifactName?.toLowerCase().includes(q) ?? false
      if (
        !matchesName &&
        !matchesUuid &&
        !matchesMajor &&
        !matchesMinor &&
        !matchesArtifact
      ) {
        return false
      }
    }

    // Status filter
    if (statusFilter === 'ACTIVE' && !b.enabled) return false
    if (statusFilter === 'INACTIVE' && b.enabled) return false

    // Artifact filter
    if (artifactFilter === 'UNASSIGNED' && b.artifactId !== null) return false
    if (artifactFilter === 'ASSIGNED' && b.artifactId === null) return false
    if (
      artifactFilter &&
      artifactFilter !== 'ALL' &&
      artifactFilter !== 'UNASSIGNED' &&
      artifactFilter !== 'ASSIGNED'
    ) {
      if (String(b.artifactId) !== artifactFilter) return false
    }

    return true
  })

  // The beacon being edited points to an Artifact that is not in the loaded
  // list (failed/partial load or unavailable). Keep showing the real mapping.
  const currentMappingMissing =
    editingBeacon?.artifactId != null &&
    formData.artifactId === String(editingBeacon.artifactId) &&
    !artifacts.some((a) => a.artifactId === editingBeacon.artifactId)

  return (
    <div className="beacons-page">
      {/* Header */}
      <header className="beacons-header">
        <div>
          <p className="beacons-eyebrow">Hardware Management</p>
          <h1 className="beacons-title">Beacon Management</h1>
          <p className="beacons-subtitle">
            Configure BLE iBeacon transmitters, UUID identities, and artifact
            proximity triggers.
          </p>
        </div>

        <button
          type="button"
          className="beacon-primary-button"
          onClick={openCreateModal}
          disabled={loading}
        >
          <span className="beacon-button-icon">+</span>
          <span>Add Beacon</span>
        </button>
      </header>

      {/* Global Alerts */}
      {message && (
        <section
          className="beacon-alert beacon-alert--success"
          role="status"
          aria-live="polite"
        >
          <span>{message}</span>
          <button
            type="button"
            className="beacon-alert-close"
            onClick={() => setMessage('')}
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </section>
      )}

      {notice && (
        <section
          className="beacon-alert beacon-alert--error"
          role="status"
          aria-live="polite"
        >
          <span>{notice}</span>
          <button
            type="button"
            className="beacon-alert-close"
            onClick={() => setNotice('')}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </section>
      )}

      {error && (
        <section
          className="beacon-alert beacon-alert--error"
          role="alert"
          aria-live="assertive"
        >
          <div>
            <strong>Error: </strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="beacon-retry-button"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Retry
          </button>
        </section>
      )}

      {/* Toolbar & Filters */}
      <section className="beacon-toolbar" aria-label="Beacon filters">
        <div className="beacon-search-box">
          <svg
            className="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search by name, UUID, major, minor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="beacon-search-input"
            aria-label="Search beacons"
          />
          {search && (
            <button
              type="button"
              className="search-clear-button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="beacon-filters">
          <label className="filter-group">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')
              }
              className="beacon-filter-select"
              aria-label="Filter by status"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </label>

          <label className="filter-group">
            <span>Artifact:</span>
            <select
              value={artifactFilter}
              onChange={(e) => setArtifactFilter(e.target.value)}
              className="beacon-filter-select"
              aria-label="Filter by artifact mapping"
            >
              <option value="">All Mappings</option>
              <option value="ASSIGNED">Mapped Only</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {artifacts.map((art) => (
                <option key={art.artifactId} value={String(art.artifactId)}>
                  {art.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Main Table / State */}
      {loading ? (
        <div className="beacon-loading-container" aria-label="Loading beacons">
          <div className="beacon-skeleton-row" />
          <div className="beacon-skeleton-row" />
          <div className="beacon-skeleton-row" />
          <p className="loading-text">Loading beacons...</p>
        </div>
      ) : filteredBeacons.length === 0 ? (
        <div className="beacon-empty-container">
          <h3>No beacons found</h3>
          <p>
            {beacons.length === 0
              ? 'No beacon devices have been configured yet.'
              : 'No beacons match the active filter criteria.'}
          </p>
          {beacons.length === 0 && (
            <button
              type="button"
              className="beacon-primary-button"
              onClick={openCreateModal}
            >
              Register First Beacon
            </button>
          )}
        </div>
      ) : (
        <div className="beacon-table-wrapper">
          <table className="beacon-table" aria-label="Beacon devices table">
            <thead>
              <tr>
                <th scope="col">Beacon Name</th>
                <th scope="col">UUID (Proximity)</th>
                <th scope="col">Major / Minor</th>
                <th scope="col">Mapped Artifact</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBeacons.map((beacon) => (
                <tr key={beacon.beaconId}>
                  <td className="beacon-name-cell">
                    <strong>{beacon.name}</strong>
                    <span className="beacon-id-sub">ID: #{beacon.beaconId}</span>
                  </td>
                  <td className="beacon-uuid-cell">
                    <code className="uuid-code">{beacon.uuid}</code>
                  </td>
                  <td className="beacon-identifier-cell">
                    <span className="badge-identity">
                      <span className="badge-tag">M:</span> {beacon.major}
                    </span>
                    <span className="badge-identity">
                      <span className="badge-tag">m:</span> {beacon.minor}
                    </span>
                  </td>
                  <td className="beacon-artifact-cell">
                    {beacon.artifactId ? (
                      <div className="mapped-artifact-info">
                        <span className="artifact-title">
                           {beacon.artifactName}
                        </span>
                        {beacon.siteName && (
                          <span className="site-sub">{beacon.siteName}</span>
                        )}
                      </div>
                    ) : (
                      <span className="unmapped-label">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-pill ${beacon.enabled ? 'status-pill--active' : 'status-pill--inactive'}`}
                    >
                      <span className="status-dot" />
                      {beacon.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="beacon-edit-button"
                        onClick={() => openEditModal(beacon)}
                        aria-label={`Edit ${beacon.name}`}
                        disabled={deletingId === beacon.beaconId}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="beacon-delete-button"
                        onClick={() => handleDelete(beacon)}
                        aria-label={`Delete ${beacon.name}`}
                        disabled={deletingId === beacon.beaconId}
                      >
                        {deletingId === beacon.beaconId ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <footer className="table-footer">
            Showing {filteredBeacons.length} of {beacons.length}{' '}
            {beacons.length === 1 ? 'beacon' : 'beacons'}
          </footer>
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {showModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beacon-modal-title"
          >
            <header className="modal-header">
              <h2 id="beacon-modal-title">
                {editingBeacon ? `Edit Beacon: ${editingBeacon.name}` : 'Register New Beacon'}
              </h2>
              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
              >
                ×
              </button>
            </header>

            <form onSubmit={handleSubmit} className="beacon-form" noValidate>
              {formError && (
                <div
                  className="beacon-alert beacon-alert--error form-alert"
                  role="alert"
                >
                  <span>{formError}</span>
                </div>
              )}

              {/* Beacon Name */}
              <div className="form-group">
                <label htmlFor={nameInputId} className="form-label">
                  Beacon Name <span className="required-star">*</span>
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  className="form-input"
                  placeholder="e.g. Gallery Room 1 Beacon"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  maxLength={255}
                  disabled={saving}
                  required
                />
              </div>

              {/* UUID */}
              <div className="form-group">
                <label htmlFor={uuidInputId} className="form-label">
                  Proximity UUID <span className="required-star">*</span>
                </label>
                <input
                  id={uuidInputId}
                  type="text"
                  className="form-input font-mono"
                  placeholder="e2c56db5-dffb-48d2-b060-d0f5a71096e0"
                  value={formData.uuid}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, uuid: e.target.value }))
                  }
                  disabled={saving}
                  required
                />
                <span className="field-hint">
                  Standard 36-character hexadecimal UUID format.
                </span>
              </div>

              {/* Major & Minor row */}
              <div className="form-row-duo">
                <div className="form-group">
                  <label htmlFor={majorInputId} className="form-label">
                    Major (0 - 65535) <span className="required-star">*</span>
                  </label>
                  <input
                    id={majorInputId}
                    type="number"
                    min={0}
                    max={65535}
                    step={1}
                    className="form-input"
                    placeholder="10"
                    value={formData.major}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, major: e.target.value }))
                    }
                    disabled={saving}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={minorInputId} className="form-label">
                    Minor (0 - 65535) <span className="required-star">*</span>
                  </label>
                  <input
                    id={minorInputId}
                    type="number"
                    min={0}
                    max={65535}
                    step={1}
                    className="form-input"
                    placeholder="20"
                    value={formData.minor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, minor: e.target.value }))
                    }
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              {/* Artifact Mapping */}
              <div className="form-group">
                <label htmlFor={artifactInputId} className="form-label">
                  Associated Artifact (Optional)
                </label>
                <select
                  id={artifactInputId}
                  className="form-select"
                  value={formData.artifactId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      artifactId: e.target.value,
                    }))
                  }
                  disabled={saving || artifactsLoading}
                >
                  <option value="">— No Artifact Assigned (Unmapped) —</option>
                  {currentMappingMissing && editingBeacon?.artifactId != null && (
                    <option value={String(editingBeacon.artifactId)}>
                      {editingBeacon.artifactName ??
                        `Artifact #${editingBeacon.artifactId}`}{' '}
                      (current mapping – not in the loaded list)
                    </option>
                  )}
                  {artifacts.map((art) => (
                    <option key={art.artifactId} value={String(art.artifactId)}>
                      {art.name} {art.siteName ? `(${art.siteName})` : ''}
                    </option>
                  ))}
                </select>
                {artifactsError && (
                  <div className="field-hint" role="alert">
                    Could not load artifacts: {artifactsError}{' '}
                    <button
                      type="button"
                      className="beacon-retry-button"
                      onClick={() => setArtifactsReloadKey((k) => k + 1)}
                      disabled={artifactsLoading}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <span className="field-hint">
                  When visitors approach this beacon, the mobile app will automatically trigger this artifact.
                </span>
              </div>

              {/* Enabled Checkbox */}
              <div className="form-checkbox-group">
                <input
                  id={enabledInputId}
                  type="checkbox"
                  className="form-checkbox"
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                  disabled={saving}
                />
                <label htmlFor={enabledInputId} className="form-checkbox-label">
                  Enable Beacon (allow proximity triggers)
                </label>
              </div>

              <footer className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="beacon-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingBeacon
                      ? 'Save Changes'
                      : 'Create Beacon'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}