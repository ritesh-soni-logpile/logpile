import React, { useState, useEffect, useMemo } from 'react'
import {
  Cpu,
  Check,
  RotateCw,
  Archive,
  HardDrive,
  Folder,
  Clock,
  Sliders,
  Terminal,
  Save,
  RotateCcw,
  Bookmark,
  Play,
  Gamepad2,
  Camera,
} from 'lucide-react'

export function PcgwTechSyncButton({ game, onGameUpdated }) {
  const [loading, setLoading] = useState(false)
  const hasSavePath = Boolean(game?.save_dir_path)

  const handleSync = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading || !game?.id) return

    setLoading(true)
    try {
      const res = await window.api?.pcgw?.fetchManual?.(game.id)

      if (res?.success) {
        onGameUpdated?.({
          ...game,
          save_dir_path: res.saveDirPath || game.save_dir_path,
        })
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  if (hasSavePath) {
    return (
      <button
        type="button"
        className="hero-ghost-btn"
        style={{ borderColor: 'rgba(74, 222, 128, 0.35)', color: '#4ade80' }}
        title={`PCGW save path & technical fixes indexed:\n${game.save_dir_path}\nClick to re-sync.`}
        onClick={handleSync}
        disabled={loading}
      >
        {loading ? (
          <>
            <RotateCw size={14} className="spin-icon" />
            <span>Syncing PCGW...</span>
          </>
        ) : (
          <>
            <Cpu size={14} style={{ color: '#4ade80' }} />
            <span>Tech Data Ready</span>
            <Check size={13} style={{ color: '#4ade80', marginLeft: '-2px' }} />
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="hero-ghost-btn"
      title={`Locate Windows save directory and technical fixes via PCGamingWiki for ${game?.canonical_title}`}
      onClick={handleSync}
      disabled={loading}
    >
      {loading ? (
        <>
          <RotateCw size={14} className="spin-icon" />
          <span>Syncing PCGW...</span>
        </>
      ) : (
        <>
          <Cpu size={14} />
          <span>Sync PCGW Tech Data</span>
        </>
      )}
    </button>
  )
}

export function SaveBackupsPanel({ game, onGameUpdated }) {
  const [backups, setBackups] = useState([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [syncingPcgw, setSyncingPcgw] = useState(false)
  const [notice, setNotice] = useState(null)

  const fetchBackups = async () => {
    if (!game?.id) return
    setLoadingBackups(true)
    try {
      const list = await window.api?.saves?.list?.(game.id)
      setBackups(Array.isArray(list) ? list : [])
    } catch {} finally {
      setLoadingBackups(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [game?.id, game?.save_dir_path])

  const handleManualBackup = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (backingUp || !game?.id || !game?.save_dir_path) return

    setBackingUp(true)
    setNotice(null)
    try {
      const res = await window.api?.saves?.backupNow?.(game.id)

      if (res?.success) {
        setNotice({ type: 'success', text: 'Backup created successfully!' })
        await fetchBackups()
      } else if (res?.reason) {
        setNotice({ type: 'info', text: res.reason })
      } else {
        setNotice({ type: 'error', text: res?.error || 'Backup failed' })
      }
    } catch (err) {
      setNotice({ type: 'error', text: err?.message || 'Backup failed' })
    } finally {
      setBackingUp(false)
      setTimeout(() => setNotice(null), 4000)
    }
  }

  const [restoringId, setRestoringId] = useState(null)

  const handleRestore = async (b) => {
    if (!b?.id || restoringId) return
    const conf = window.confirm(`Restore save backup from ${formatTimestamp(b.timestamp)}?\n\nThis will overwrite files in:\n${game.save_dir_path}`)
    if (!conf) return
    setRestoringId(b.id)
    try {
      const res = await window.api?.saves?.restore?.(game.id, b.id)
      if (res?.success) {
        setNotice({ type: 'success', text: 'Save backup restored to disk successfully.' })
      } else {
        setNotice({ type: 'error', text: res?.error || 'Restore failed.' })
      }
    } catch (err) {
      setNotice({ type: 'error', text: err?.message || 'Restore error' })
    } finally {
      setRestoringId(null)
      setTimeout(() => setNotice(null), 4000)
    }
  }

  const handleInlinePcgwSync = async () => {
    if (syncingPcgw || !game?.id) return
    setSyncingPcgw(true)
    try {
      const res = await window.api?.pcgw?.fetchManual?.(game.id)
      if (res?.success && res.saveDirPath) {
        onGameUpdated?.({
          ...game,
          save_dir_path: res.saveDirPath,
        })
      }
    } catch {} finally {
      setSyncingPcgw(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 KB'
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  const formatTimestamp = (rawTimestamp) => {
    if (!rawTimestamp) return 'Recent'
    try {
      const d = new Date(rawTimestamp.endsWith?.('Z') ? rawTimestamp : rawTimestamp + 'Z')
      if (isNaN(d.getTime())) return rawTimestamp
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return rawTimestamp
    }
  }

  const hasSavePath = Boolean(game?.save_dir_path)

  return (
    <div
      className="cinematic-save-backups-sheet"
      style={{
        marginTop: '16px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h4
          className="cinematic-dossier-heading"
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Archive size={15} style={{ color: 'var(--accent, #d6ff4b)' }} />
          <span>Save Backups</span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted, #a1a1aa)',
              fontWeight: 500,
            }}
          >
            Max 3 · FIFO Cap
          </span>
        </h4>

        <button
          type="button"
          className="hero-ghost-btn"
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            height: '26px',
            borderColor: hasSavePath ? 'rgba(214, 255, 75, 0.35)' : 'rgba(255, 255, 255, 0.1)',
            color: hasSavePath ? 'var(--accent, #d6ff4b)' : 'var(--text-muted, #71717a)',
            cursor: hasSavePath && !backingUp ? 'pointer' : 'default',
          }}
          title={
            hasSavePath
              ? 'Manually force an immediate zip snapshot of your save folder'
              : 'Save path not located yet. Sync PCGW Tech Data first.'
          }
          onClick={handleManualBackup}
          disabled={!hasSavePath || backingUp}
        >
          {backingUp ? (
            <>
              <RotateCw size={11} className="spin-icon" />
              <span>Backing up...</span>
            </>
          ) : (
            <>
              <HardDrive size={11} />
              <span>Backup Now</span>
            </>
          )}
        </button>
      </div>

      <div
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '8px',
          padding: '8px 10px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
        }}
      >
        <Folder size={13} style={{ color: 'var(--accent, #d6ff4b)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: 'var(--text-muted, #71717a)', marginRight: '6px' }}>Save Path:</span>
          {hasSavePath ? (
            <span
              style={{
                fontFamily: 'monospace',
                color: 'var(--text-primary, #ffffff)',
                wordBreak: 'break-all',
              }}
              title={game.save_dir_path}
            >
              {game.save_dir_path}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted, #71717a)', fontStyle: 'italic' }}>
              Sync PCGW Tech Data to locate saves.
            </span>
          )}
        </div>

        {!hasSavePath && (
          <button
            type="button"
            onClick={handleInlinePcgwSync}
            disabled={syncingPcgw}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent, #d6ff4b)',
              textDecoration: 'underline',
              fontSize: '11px',
              fontWeight: 600,
              cursor: syncingPcgw ? 'default' : 'pointer',
              flexShrink: 0,
            }}
          >
            {syncingPcgw ? 'Locating...' : 'Locate Now'}
          </button>
        )}
      </div>

      {notice && (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            marginBottom: '10px',
            background:
              notice.type === 'success'
                ? 'rgba(74, 222, 128, 0.15)'
                : notice.type === 'error'
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
            color:
              notice.type === 'success'
                ? '#4ade80'
                : notice.type === 'error'
                ? '#f87171'
                : '#fbbf24',
            border: `1px solid ${
              notice.type === 'success'
                ? 'rgba(74, 222, 128, 0.3)'
                : notice.type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(245, 158, 11, 0.3)'
            }`,
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loadingBackups ? (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted, #71717a)', fontSize: '11px' }}>
            <RotateCw size={12} className="spin-icon" style={{ display: 'inline', marginRight: '6px' }} />
            Loading backups...
          </div>
        ) : backups.length === 0 ? (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: 'var(--text-muted, #71717a)',
              fontSize: '11px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
            }}
          >
            {hasSavePath
              ? "No backups created yet. Click 'Backup Now' or play and exit to auto-save."
              : 'Save directory not yet located. Sync PCGW Tech Data to enable backups.'}
          </div>
        ) : (
          backups.map((b, idx) => (
            <div
              key={b.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Clock size={12} style={{ color: 'var(--accent, #d6ff4b)', flexShrink: 0 }} />
                <span
                  style={{
                    color: 'var(--text-primary, #ffffff)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={b.archive_path}
                >
                  {formatTimestamp(b.timestamp)}
                </span>
                {idx === 0 && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(74, 222, 128, 0.15)',
                      color: '#4ade80',
                      fontWeight: 600,
                    }}
                  >
                    Latest
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    color: 'var(--text-muted, #a1a1aa)',
                    fontSize: '11px',
                  }}
                >
                  {formatFileSize(b.sizeBytes)}
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: b.exists ? 'rgba(255, 255, 255, 0.06)' : 'rgba(239, 68, 68, 0.15)',
                    color: b.exists ? 'var(--text-muted, #a1a1aa)' : '#f87171',
                  }}
                >
                  {b.exists ? '.ZIP' : 'Missing'}
                </span>
                {b.exists && hasSavePath && (
                  <button
                    type="button"
                    onClick={() => handleRestore(b)}
                    disabled={restoringId === b.id}
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 600,
                      cursor: restoringId === b.id ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                    title="Restore this backup into local save folder"
                  >
                    <RotateCcw size={10} className={restoringId === b.id ? 'spin-icon' : ''} />
                    <span>{restoringId === b.id ? 'Restoring...' : 'Restore'}</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function ModProfilePanel({ game, onGameUpdated }) {
  const [profileText, setProfileText] = useState(game?.active_mod_profile || '')
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    setProfileText(game?.active_mod_profile || '')
    setSavedNotice(false)
  }, [game?.id, game?.active_mod_profile])

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (saving || !game?.id) return

    setSaving(true)
    try {
      const cleanValue = profileText.trim()
      const res = await window.api?.games?.updateModProfile?.(game.id, cleanValue)

      if (res) {
        onGameUpdated?.({
          ...game,
          active_mod_profile: cleanValue || null,
        })
        setSavedNotice(true)
        setTimeout(() => setSavedNotice(false), 2500)
      }
    } catch {} finally {
      setSaving(false)
    }
  }

  const isDirty = (profileText || '') !== (game?.active_mod_profile || '')

  return (
    <div
      className="cinematic-mod-profile-sheet"
      style={{
        marginTop: '16px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h4
          className="cinematic-dossier-heading"
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sliders size={15} style={{ color: 'var(--accent, #d6ff4b)' }} />
          <span>Launch Arguments / Mod Profile</span>
        </h4>

        {game?.active_mod_profile && (
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '12px',
              background: 'rgba(74, 222, 128, 0.15)',
              color: '#4ade80',
              fontWeight: 600,
            }}
          >
            Active Profile
          </span>
        )}
      </div>

      <p
        style={{
          margin: '0 0 10px 0',
          fontSize: '11px',
          color: 'var(--text-muted, #71717a)',
          lineHeight: '1.4',
        }}
      >
        Custom executable flags, mod parameters, or renderer directives (e.g. <code>-dx11</code>, <code>-mod=ColdWar</code>, <code>-novid</code>). Appended automatically to the command when clicking Play.
      </p>

      <form
        onSubmit={handleSave}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Terminal
            size={13}
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--text-muted, #71717a)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={profileText}
            onChange={(e) => {
              setProfileText(e.target.value)
              setSavedNotice(false)
            }}
            placeholder="e.g. -dx11 -mod=ColdWar -novid"
            spellCheck="false"
            autoComplete="off"
            style={{
              width: '100%',
              padding: '7px 10px 7px 30px',
              fontSize: '11px',
              fontFamily: 'monospace',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-primary, #ffffff)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          className="hero-ghost-btn"
          disabled={saving || (!isDirty && !savedNotice)}
          style={{
            padding: '4px 12px',
            fontSize: '11px',
            height: '30px',
            flexShrink: 0,
            borderColor: savedNotice ? 'rgba(74, 222, 128, 0.4)' : isDirty ? 'var(--accent, #d6ff4b)' : 'rgba(255, 255, 255, 0.1)',
            color: savedNotice ? '#4ade80' : isDirty ? 'var(--accent, #d6ff4b)' : 'var(--text-muted, #71717a)',
            cursor: isDirty || savedNotice ? 'pointer' : 'default',
          }}
          title={isDirty ? 'Save launch arguments to database' : 'Arguments are up to date'}
        >
          {saving ? (
            <>
              <RotateCw size={11} className="spin-icon" />
              <span>Saving...</span>
            </>
          ) : savedNotice ? (
            <>
              <Check size={12} style={{ color: '#4ade80' }} />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save size={12} />
              <span>Save</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export function JumpBackInCard({ game, onPlay }) {
  const [captures, setCaptures] = useState([])
  const [cheatSheet, setCheatSheet] = useState([])

  const isStale = useMemo(() => {
    if (!game?.last_played) return false
    const d = new Date(game.last_played).getTime()
    return !Number.isNaN(d) && (Date.now() - d > 14 * 24 * 60 * 60 * 1000)
  }, [game?.last_played])

  const hasCheckpoint = Boolean(game?.last_checkpoint_note && game.last_checkpoint_note.trim().length > 0)

  useEffect(() => {
    if (!game?.id || (!isStale && !hasCheckpoint)) return
    let active = true

    async function loadData() {
      try {
        const [caps, guideResults] = await Promise.all([
          window.api?.games?.getCaptures ? window.api.games.getCaptures(game.id) : [],
          window.api?.guides?.search ? window.api.guides.search(game.id, 'controls combat mechanics actions keys') : [],
        ])

        if (!active) return

        if (Array.isArray(caps) && caps.length > 0) {
          setCaptures(caps)
        }

        if (Array.isArray(guideResults) && guideResults.length > 0) {
          const bullets = []
          for (const chunk of guideResults) {
            const lines = (chunk.content || '').split(/\r?\n/)
            for (const line of lines) {
              const trimmed = line.trim().replace(/^[-*•]\s*/, '')
              if (trimmed.length >= 15 && trimmed.length <= 110 && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
                bullets.push(trimmed)
                if (bullets.length >= 4) break
              }
            }
            if (bullets.length >= 4) break
          }
          setCheatSheet(bullets)
        }
      } catch {}
    }

    loadData()
    return () => { active = false }
  }, [game?.id, isStale, hasCheckpoint])

  if (!isStale && !hasCheckpoint) return null

  const latestCapture = captures[0]
  const captureUrl = latestCapture?.file_path
    ? (latestCapture.file_path.startsWith('http') || latestCapture.file_path.startsWith('local-file://')
        ? latestCapture.file_path
        : `local-file://${latestCapture.file_path.replace(/\\/g, '/')}`)
    : null

  const daysAgo = game?.last_played ? Math.floor((Date.now() - new Date(game.last_played).getTime()) / (1000 * 60 * 60 * 24)) : null

  const formatNoteDate = (raw) => {
    if (!raw) return ''
    try {
      const d = new Date(raw.endsWith?.('Z') ? raw : raw + 'Z')
      return isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return raw
    }
  }

  return (
    <div
      className="cinematic-jump-back-in-card"
      style={{
        margin: '0 0 20px 0',
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(214, 255, 75, 0.05) 0%, rgba(20, 20, 25, 0.6) 100%)',
        border: '1px solid rgba(214, 255, 75, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 9px',
              borderRadius: '20px',
              background: 'rgba(214, 255, 75, 0.15)',
              color: 'var(--accent, #d6ff4b)',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Bookmark size={11} fill="currentColor" />
            Where Was I?
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #a1a1aa)' }}>
            {daysAgo ? `Last played ${daysAgo} days ago` : 'Session Checkpoint'}
          </span>
        </div>

        {onPlay && game?.is_installed && (
          <button
            type="button"
            className="primary-button"
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              height: '30px',
              borderRadius: '6px',
              background: 'var(--accent, #d6ff4b)',
              color: '#000000',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => onPlay(game)}
          >
            <Play size={12} fill="currentColor" />
            Jump Back In
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: captureUrl ? '1fr 200px' : '1fr', gap: '20px', alignItems: 'start' }}>
        <div>
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: cheatSheet.length > 0 ? '12px' : 0,
            }}
          >
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent, #d6ff4b)', fontWeight: 600, marginBottom: '4px' }}>
              Last Checkpoint Note
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#ffffff', fontStyle: hasCheckpoint ? 'normal' : 'italic', lineHeight: '1.4' }}>
              {hasCheckpoint ? `“${game.last_checkpoint_note}”` : "You haven't played in over two weeks. Here is your quick refresher before jumping back in."}
            </p>
            {game?.last_checkpoint_at && (
              <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted, #71717a)' }}>
                Recorded {formatNoteDate(game.last_checkpoint_at)}
              </div>
            )}
          </div>

          {cheatSheet.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #a1a1aa)', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Gamepad2 size={12} />
                <span>Controls & Mechanics Refresher</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '6px 16px' }}>
                {cheatSheet.map((bullet, idx) => (
                  <li key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary, #d4d4d8)', lineHeight: '1.4' }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {captureUrl && (
          <div
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.4)',
              position: 'relative',
            }}
          >
            <img
              src={captureUrl}
              alt="Last gameplay capture"
              style={{ width: '100%', height: '115px', objectFit: 'cover', display: 'block' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '4px 8px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                fontSize: '9.5px',
                color: '#e4e4e7',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Camera size={10} />
              <span>Last Screenshot</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default {
  PcgwTechSyncButton,
  SaveBackupsPanel,
  ModProfilePanel,
  JumpBackInCard,
}
