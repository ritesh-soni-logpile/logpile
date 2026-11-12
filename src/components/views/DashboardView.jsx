import { useMemo, useState, useEffect } from 'react'
import {
  Trophy,
  Clock,
  Flame,
  Gamepad2,
  HardDrive,
  ArrowRight,
  TrendingUp,
  RotateCw,
  X,
  BookOpen,
  Search,
} from 'lucide-react'
import { normalizeArtworkUrl } from '../../utils/artworkUrl'
import { SourceIcon } from '../SourceIcons'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatHours(seconds) {
  const h = Math.round((seconds || 0) / 3600)
  return `${h.toLocaleString()}h`
}

function formatDays(seconds) {
  const d = ((seconds || 0) / 86400).toFixed(1)
  return `${d} days`
}

export function DashboardView({
  games = [],
  stats = {},
  onSelectGame,
  onLaunchGame,
  onNavigateView,
  onRefreshLibrary,
  layoutTheme = 'cinematic',
  guideSyncStatus = { running: false, progress: null },
  onCancelGuideSync,
  onFilterMissingGuides,
}) {
  const [activeChartSlice, setActiveChartSlice] = useState(null)
  const [syncingHltb, setSyncingHltb] = useState(false)
  const [hltbProgress, setHltbProgress] = useState(null)
  const [syncNotice, setSyncNotice] = useState(null)

  useEffect(() => {
    const unsub = window.api?.games?.onHltbProgress?.((prog) => {
      setHltbProgress(prog)
    })
    return () => unsub?.()
  }, [])

  const handleSyncHltb = async (forceAll = false) => {
    if (syncingHltb) return
    setSyncingHltb(true)
    setHltbProgress(null)
    setSyncNotice({
      type: 'info',
      message: forceAll
        ? 'Updating story campaign hours for all games in your library...'
        : 'Fetching missing story hours from HowLongToBeat...'
    })
    try {
      const res = await window.api?.games?.syncHltb?.({ forceAll })
      if (res?.success) {
        setSyncNotice({
          type: 'success',
          message: res.synced > 0
            ? `Successfully synced story hours for ${res.synced} titles${res.cancelled ? ' (stopped early)' : ''}!`
            : (res.cancelled ? 'Sync cancelled.' : 'Checked HowLongToBeat: library is already up to date.')
        })
        if (onRefreshLibrary) {
          await onRefreshLibrary()
        }
      } else {
        const rawErr = res?.error || ''
        const friendlyMessage = rawErr.includes('column') || rawErr.includes('syntax')
          ? 'Could not complete story hours sync. Some titles may not have registered campaign hours or service rate limit was reached.'
          : (rawErr || 'Could not fetch from HowLongToBeat. Please check your internet connection.')
        setSyncNotice({
          type: 'error',
          message: friendlyMessage
        })
      }
    } catch (err) {
      setSyncNotice({
        type: 'error',
        message: err.message || 'Error communicating with HowLongToBeat service.'
      })
    } finally {
      setSyncingHltb(false)
      setHltbProgress(null)
      setTimeout(() => setSyncNotice(null), 6000)
    }
  }

  const handleCancelSync = async () => {
    try {
      await window.api?.games?.cancelHltbSync?.()
    } catch {}
  }

  const [syncingGuides, setSyncingGuides] = useState(false)
  const [guideProgress, setGuideProgress] = useState(null)
  const [guideNotice, setGuideNotice] = useState(null)

  useEffect(() => {
    let isMounted = true
    if (window.api?.guides?.getStatus) {
      window.api.guides.getStatus().then((st) => {
        if (isMounted && st?.running) {
          setSyncingGuides(true)
          if (st.progress) setGuideProgress(st.progress)
        }
      }).catch(() => {})
    }
    const unsub = window.api?.guides?.onBatchProgress?.((prog) => {
      if (!isMounted) return
      if (prog && typeof prog.running === 'boolean') {
        setSyncingGuides(prog.running)
        if (prog.progress) setGuideProgress(prog.progress)
      } else if (prog) {
        setSyncingGuides(true)
        setGuideProgress(prog)
      }
    })
    return () => {
      isMounted = false
      unsub?.()
    }
  }, [])

  const isSyncingGuides = Boolean(guideSyncStatus?.running || syncingGuides)
  const currentGuideProgress = guideSyncStatus?.progress || guideProgress

  const handleSyncGuides = async (installedOnly = true) => {
    if (isSyncingGuides) return
    setSyncingGuides(true)
    setGuideProgress(null)
    setGuideNotice({
      type: 'info',
      message: installedOnly
        ? 'Downloading offline walkthrough guides for installed games from StrategyWiki...'
        : 'Downloading offline walkthrough guides for your library from StrategyWiki...'
    })
    try {
      const res = await window.api?.guides?.downloadBatch?.({ installedOnly })
      if (res?.success) {
        setGuideNotice({
          type: 'success',
          message: res.synced > 0
            ? `Successfully downloaded and indexed ${res.synced} guides${res.cancelled ? ' (stopped early)' : ''}!`
            : (res.cancelled ? 'Guide sync cancelled.' : 'Offline strategy guides are already up to date.')
        })
        if (onRefreshLibrary) {
          await onRefreshLibrary()
        }
      } else {
        setGuideNotice({
          type: 'error',
          message: res?.error || 'Guide sync failed. Check console.'
        })
      }
    } catch (err) {
      setGuideNotice({
        type: 'error',
        message: err?.message || 'Guide sync failed. Check console.'
      })
    } finally {
      setSyncingGuides(false)
      setGuideProgress(null)
      setTimeout(() => setGuideNotice(null), 6000)
    }
  }

  const handleCancelGuideSync = async () => {
    try {
      if (onCancelGuideSync) {
        await onCancelGuideSync()
      } else {
        await window.api?.guides?.cancelBatch?.()
      }
      setSyncingGuides(false)
      setGuideProgress(null)
    } catch {}
  }

  const [missingTab, setMissingTab] = useState('installed')
  const [missingSearch, setMissingSearch] = useState('')
  const [downloadingGameId, setDownloadingGameId] = useState(null)

  const guideStats = useMemo(() => {
    const validGames = games.filter((g) => !g.is_utility && !g.is_dlc && !g.is_hidden)
    const installed = validGames.filter((g) => g.is_installed)

    const withGuides = validGames.filter((g) => Boolean(g.has_guide))
    const installedWithGuides = installed.filter((g) => Boolean(g.has_guide))
    const missingGuides = validGames.filter((g) => !g.has_guide)
    const missingInstalledGuides = installed.filter((g) => !g.has_guide)

    const totalValid = validGames.length || 1
    const coveragePct = Math.round((withGuides.length / totalValid) * 100)
    const installedTotal = installed.length || 1
    const installedCoveragePct = Math.round((installedWithGuides.length / installedTotal) * 100)

    return {
      totalGames: validGames.length,
      withGuides: withGuides.length,
      missingGuides: missingGuides.length,
      coveragePct,
      installedTotal: installed.length,
      installedWithGuides: installedWithGuides.length,
      missingInstalledGuides: missingInstalledGuides.length,
      installedCoveragePct,
      missingList: missingGuides,
      missingInstalledList: missingInstalledGuides,
    }
  }, [games])

  const displayedMissingList = useMemo(() => {
    const source = missingTab === 'installed' ? guideStats.missingInstalledList : guideStats.missingList
    if (!missingSearch.trim()) return source
    const q = missingSearch.trim().toLowerCase()
    return source.filter((g) => (g.canonical_title || '').toLowerCase().includes(q))
  }, [missingTab, guideStats, missingSearch])

  const handleDownloadSingleGuide = async (game) => {
    if (!game || downloadingGameId) return
    setDownloadingGameId(game.id)
    try {
      const res = await window.api?.guides?.downloadForGame?.(game.id, game.canonical_title)
      if (res?.success) {
        if (onRefreshLibrary) {
          await onRefreshLibrary()
        }
      }
    } catch (err) {
      console.warn('[Dashboard] Single guide download error:', err)
    } finally {
      setDownloadingGameId(null)
    }
  }

  // 1. Backlog Status Distribution
  const backlogStats = useMemo(() => {
    let completed = 0
    let playing = 0
    let paused = 0
    let unplayed = 0

    games.forEach((g) => {
      if (g.is_utility || g.is_dlc) return
      const s = String(g.status || g.backlog_status || 'unplayed').toLowerCase()
      if (s === 'completed') completed++
      else if (s === 'playing') playing++
      else if (s === 'paused' || s === 'dropped') paused++
      else unplayed++
    })

    const total = completed + playing + paused + unplayed
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      completed,
      playing,
      paused,
      unplayed,
      total,
      completionRate,
    }
  }, [games])

  // 2. Playtime Metrics & Histogram Buckets
  const playtimeStats = useMemo(() => {
    let totalSeconds = 0
    let topPlayed = []

    const buckets = [
      { id: 'taste', label: '< 2 hrs', count: 0, min: 0, max: 2 * 3600 },
      { id: 'short', label: '2 – 10 hrs', count: 0, min: 2 * 3600, max: 10 * 3600 },
      { id: 'medium', label: '10 – 30 hrs', count: 0, min: 10 * 3600, max: 30 * 3600 },
      { id: 'deep', label: '30 – 80 hrs', count: 0, min: 30 * 3600, max: 80 * 3600 },
      { id: 'epic', label: '80+ hrs', count: 0, min: 80 * 3600, max: Infinity },
    ]

    const validGames = games.filter((g) => !g.is_utility && !g.is_dlc)

    validGames.forEach((g) => {
      const sec = Number(g.play_time_seconds || 0)
      totalSeconds += sec

      if (sec > 0) {
        for (const b of buckets) {
          if (sec >= b.min && sec < b.max) {
            b.count++
            break
          }
        }
      }
    })

    topPlayed = [...validGames]
      .filter((g) => (g.play_time_seconds || 0) > 0)
      .sort((a, b) => (b.play_time_seconds || 0) - (a.play_time_seconds || 0))
      .slice(0, 5)

    const maxBucketCount = Math.max(1, ...buckets.map((b) => b.count))

    return {
      totalSeconds,
      buckets,
      maxBucketCount,
      topPlayed,
    }
  }, [games])

  // 3. HowLongToBeat Backlog Debt & Quick Wins
  const hltbStats = useMemo(() => {
    let unplayedStoryHours = 0
    let unplayedWithHltb = 0
    let totalWithHltb = 0
    const quickWins = []

    const buckets = [
      { id: 'quick', label: '< 5h (Bite-sized)', count: 0, min: 0, max: 5 },
      { id: 'standard', label: '5 – 15h (Standard)', count: 0, min: 5, max: 15 },
      { id: 'long', label: '15 – 35h (Deep)', count: 0, min: 15, max: 35 },
      { id: 'massive', label: '35h+ (Epic)', count: 0, min: 35, max: Infinity },
    ]

    games.forEach((g) => {
      if (g.is_utility || g.is_dlc) return
      const s = String(g.status || g.backlog_status || 'unplayed').toLowerCase()
      const hours = Number(g.hltb_main_hours || 0)

      if (hours > 0) {
        totalWithHltb++
        for (const b of buckets) {
          if (hours >= b.min && hours < b.max) {
            b.count++
            break
          }
        }
      }

      if (s === 'unplayed' && hours > 0) {
        unplayedStoryHours += hours
        unplayedWithHltb++
        if (hours <= 6 && quickWins.length < 4) {
          quickWins.push(g)
        }
      }
    })

    const maxHltbCount = Math.max(1, ...buckets.map((b) => b.count))

    return {
      unplayedStoryHours: Math.round(unplayedStoryHours),
      unplayedWithHltb,
      totalWithHltb,
      buckets,
      maxHltbCount,
      quickWins,
    }
  }, [games])

  // 4. Store Distribution
  const storeDistribution = useMemo(() => {
    const counts = {}
    games.forEach((g) => {
      if (g.is_utility || g.is_dlc) return
      const store = (g.sources && g.sources[0]?.sourceName) || g.store_name || 'Custom'
      counts[store] = (counts[store] || 0) + 1
    })

    const items = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const total = items.reduce((acc, i) => acc + i.count, 0) || 1
    return items.map((i) => ({ ...i, percent: Math.round((i.count / total) * 100) }))
  }, [games])

  // Helper for generating SVG Donut paths
  const donutSlices = useMemo(() => {
    const rawData = [
      { key: 'completed', label: 'Completed', count: backlogStats.completed, color: '#10b981' },
      { key: 'playing', label: 'Playing', count: backlogStats.playing, color: '#38bdf8' },
      { key: 'paused', label: 'On Pause', count: backlogStats.paused, color: '#f59e0b' },
      { key: 'unplayed', label: 'Unplayed', count: backlogStats.unplayed, color: '#64748b' },
    ]

    const total = backlogStats.total || 1
    let cumulative = 0

    return rawData.map((slice) => {
      const fraction = slice.count / total
      const startAngle = cumulative * 2 * Math.PI
      const endAngle = (cumulative + fraction) * 2 * Math.PI
      cumulative += fraction

      const r = 40
      const cx = 50
      const cy = 50

      const x1 = cx + r * Math.sin(startAngle)
      const y1 = cy - r * Math.cos(startAngle)
      const x2 = cx + r * Math.sin(endAngle)
      const y2 = cy - r * Math.cos(endAngle)

      const largeArc = fraction > 0.5 ? 1 : 0
      const d = fraction >= 0.999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
        : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`

      return {
        ...slice,
        fraction,
        percent: Math.round(fraction * 100),
        d,
      }
    })
  }, [backlogStats])

  return (
    <div className={`dashboard-container layout-${layoutTheme}`}>
      {/* 1. Header & Quick Summary */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-eyebrow">
            <TrendingUp size={14} />
            <span>LIBRARY INTELLIGENCE &amp; ANALYTICS</span>
          </div>
          <h1 className="dashboard-title">Sanctuary Dashboard</h1>
          <p className="dashboard-subtitle">
            Comprehensive breakdown of your gaming journey, backlog debt, and playtime investments.
          </p>
        </div>
      </div>

      {/* 2. Top Metric Cards Strip */}
      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card">
          <div className="kpi-icon-wrap kpi-accent">
            <Clock size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">TOTAL TIME LOGGED</span>
            <strong className="kpi-value">{formatHours(playtimeStats.totalSeconds)}</strong>
            <span className="kpi-sub">Across {games.filter((g) => g.play_time_seconds > 0).length} played titles ({formatDays(playtimeStats.totalSeconds)})</span>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-icon-wrap kpi-emerald">
            <Trophy size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">COMPLETION RATE</span>
            <strong className="kpi-value">{backlogStats.completionRate}%</strong>
            <span className="kpi-sub">{backlogStats.completed} of {backlogStats.total} playable games finished</span>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-icon-wrap kpi-amber">
            <Flame size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">BACKLOG STORY DEBT</span>
            <strong className="kpi-value">
              {hltbStats.totalWithHltb > 0 ? `~${hltbStats.unplayedStoryHours.toLocaleString()}h` : '—'}
            </strong>
            <span className="kpi-sub">
              {hltbStats.totalWithHltb > 0
                ? `${hltbStats.unplayedWithHltb} unplayed campaigns calculated`
                : 'Sync HLTB to calculate campaign hours'}
            </span>
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-icon-wrap kpi-blue">
            <HardDrive size={18} />
          </div>
          <div className="kpi-body">
            <span className="kpi-label">INSTALLED FOOTPRINT</span>
            <strong className="kpi-value">{stats.totalStorageGb ? `${stats.totalStorageGb} GB` : '0 GB'}</strong>
            <span className="kpi-sub">{stats.installedGames || 0} installed titles on drive</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Tier: Backlog Donut Chart & Playtime Histogram */}
      <div className="dashboard-row-split">
        {/* Backlog Sanctuary Status Donut */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="card-heading">Backlog Sanctuary Status</h3>
              <p className="card-sub">Visual distribution of your active library backlog</p>
            </div>
          </div>

          <div className="donut-chart-wrap">
            <div className="donut-svg-container">
              <svg viewBox="0 0 100 100" className="donut-svg">
                {donutSlices.map((slice) => (
                  <path
                    key={slice.key}
                    d={slice.d}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={activeChartSlice === slice.key ? '13' : '10'}
                    className="donut-slice"
                    onMouseEnter={() => setActiveChartSlice(slice.key)}
                    onMouseLeave={() => setActiveChartSlice(null)}
                  />
                ))}
              </svg>
              <div className="donut-center-label">
                <span className="donut-center-pct">{backlogStats.completionRate}%</span>
                <span className="donut-center-sub">COMPLETED</span>
              </div>
            </div>

            <div className="donut-legend">
              {donutSlices.map((slice) => (
                <div
                  key={slice.key}
                  className={`donut-legend-item ${activeChartSlice === slice.key ? 'active' : ''}`}
                  onMouseEnter={() => setActiveChartSlice(slice.key)}
                  onMouseLeave={() => setActiveChartSlice(null)}
                >
                  <span className="legend-dot" style={{ backgroundColor: slice.color }} />
                  <span className="legend-label">{slice.label}</span>
                  <strong className="legend-count">{slice.count}</strong>
                  <span className="legend-pct">({slice.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Playtime Distribution Histogram */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="card-heading">Playtime Distribution</h3>
              <p className="card-sub">Number of titles by hours invested</p>
            </div>
          </div>

          <div className="histogram-container">
            <div className="histogram-bars-row">
              {playtimeStats.buckets.map((b) => {
                const heightPct = Math.max(6, Math.round((b.count / playtimeStats.maxBucketCount) * 100))
                return (
                  <div key={b.id} className="histogram-col">
                    <span className="histogram-count-label">{b.count}</span>
                    <div className="histogram-bar-track">
                      <div
                        className="histogram-bar-fill"
                        style={{ height: `${heightPct}%` }}
                        title={`${b.count} titles with ${b.label} played`}
                      />
                    </div>
                    <span className="histogram-axis-label">{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Lower Tier: Store Share & Story Length Breakdown */}
      <div className="dashboard-row-split">
        {/* Platform & Store Share */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="card-heading">Storefront &amp; Source Distribution</h3>
              <p className="card-sub">Where your library catalog is hosted</p>
            </div>
          </div>

          <div className="store-bars-list">
            {storeDistribution.map((item) => (
              <div key={item.name} className="store-bar-row">
                <div className="store-bar-header">
                  <div className="store-title-wrap">
                    <SourceIcon source={item.name.toLowerCase()} size={14} />
                    <span>{item.name}</span>
                  </div>
                  <span className="store-count-badge">
                    {item.count} {item.count === 1 ? 'title' : 'titles'} ({item.percent}%)
                  </span>
                </div>
                <div className="store-bar-track">
                  <div
                    className="store-bar-fill"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Story Campaign Lengths (HLTB) */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="card-heading">Story Campaign Lengths</h3>
                {hltbStats.totalWithHltb > 0 && (
                  <span className="card-badge-neutral">{hltbStats.totalWithHltb} synced</span>
                )}
              </div>
              <p className="card-sub">Distribution of games by HowLongToBeat main story hours</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {syncingHltb ? (
                <button
                  type="button"
                  className="dashboard-sync-btn dashboard-sync-cancel-btn"
                  onClick={handleCancelSync}
                  title="Stop syncing story hours"
                >
                  <X size={12} />
                  <span>Cancel</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="dashboard-sync-btn"
                    onClick={() => handleSyncHltb(false)}
                    title="Fetch story hours for all games that don't have them yet"
                  >
                    <RotateCw size={12} />
                    <span>{hltbStats.totalWithHltb === 0 ? 'Sync Story Hours' : 'Sync Missing Hours'}</span>
                  </button>
                  <button
                    type="button"
                    className="dashboard-sync-btn dashboard-sync-secondary"
                    onClick={() => handleSyncHltb(true)}
                    title="Force refresh story hours for all games across your entire library"
                  >
                    <span>Update All Games</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {syncNotice && (
            <div className={cn('dashboard-notice-banner', `notice-${syncNotice.type}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span>{syncNotice.message}</span>
              <button
                type="button"
                onClick={() => setSyncNotice(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '2px 6px', fontSize: '13px' }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {syncingHltb && hltbProgress && (
            <div className="hltb-sync-progress-box">
              <div className="hltb-sync-progress-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RotateCw size={13} className="spin-icon" style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Syncing HLTB: {hltbProgress.current} / {hltbProgress.total} titles ({hltbProgress.synced} updated)
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {hltbProgress.gameTitle}
                </span>
              </div>
              <div className="hltb-sync-progress-bar-track">
                <div
                  className="hltb-sync-progress-bar-fill"
                  style={{ width: `${Math.round((hltbProgress.current / Math.max(1, hltbProgress.total)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {hltbStats.totalWithHltb === 0 && !syncingHltb ? (
            <div className="dashboard-empty-state-card">
              <Clock size={32} style={{ color: '#f59e0b', opacity: 0.85 }} />
              <div className="dashboard-empty-state-copy">
                <strong>No Story Estimates Synced Yet</strong>
                <p>
                  Logpile is 100% offline-first and never scrapes unprompted. Fetch story hours on demand from HowLongToBeat to categorize your titles into bite-sized, standard, deep, and epic campaigns.
                </p>
              </div>
              <button
                type="button"
                className="dashboard-primary-action-btn"
                onClick={() => handleSyncHltb(true)}
                disabled={syncingHltb}
              >
                <Clock size={13} className={cn(syncingHltb && 'animate-spin')} />
                <span>Update All Games (HowLongToBeat)</span>
              </button>
            </div>
          ) : (
            <div className="histogram-container">
              <div className="histogram-bars-row">
                {hltbStats.buckets.map((b) => {
                  const heightPct = Math.max(6, Math.round((b.count / hltbStats.maxHltbCount) * 100))
                  return (
                    <div key={b.id} className="histogram-col">
                      <span className="histogram-count-label">{b.count}</span>
                      <div className="histogram-bar-track">
                        <div
                          className="histogram-bar-fill histogram-amber-fill"
                          style={{ height: `${heightPct}%` }}
                          title={`${b.count} titles in ${b.label}`}
                        />
                      </div>
                      <span className="histogram-axis-label">{b.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Offline Strategy Guides & Knowledge Sync */}
      <div className="dashboard-card" style={{ marginBottom: '24px' }}>
        <div className="dashboard-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} style={{ color: 'var(--accent, #d6ff4b)' }} />
              <h3 className="card-heading">Knowledge &amp; Strategy Guides</h3>
            </div>
            <p className="card-sub">Local walkthroughs and boss tips indexed into SQLite FTS5 for offline AI companion Q&amp;A</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isSyncingGuides ? (
              <button
                type="button"
                className="dashboard-sync-btn dashboard-sync-cancel-btn"
                onClick={handleCancelGuideSync}
                title="Stop downloading guides"
              >
                <X size={12} />
                <span>Cancel Sync</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="dashboard-sync-btn"
                  onClick={() => handleSyncGuides(true)}
                  disabled={guideStats.missingInstalledGuides === 0}
                  title="Download walkthroughs for installed games missing guides"
                >
                  <BookOpen size={12} />
                  <span>
                    {guideStats.missingInstalledGuides > 0
                      ? `Sync Missing (Installed: ${guideStats.missingInstalledGuides})`
                      : 'All Installed Ready ✓'}
                  </span>
                </button>
                <button
                  type="button"
                  className="dashboard-sync-btn dashboard-sync-secondary"
                  onClick={() => handleSyncGuides(false)}
                  disabled={guideStats.missingGuides === 0}
                  title="Download walkthroughs for all library games missing guides"
                >
                  <span>
                    {guideStats.missingGuides > 0
                      ? `Sync Missing (All: ${guideStats.missingGuides})`
                      : 'All Library Ready ✓'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Knowledge Coverage KPI Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginTop: '16px',
          marginBottom: '16px',
        }}>
          {/* Card 1: Library Knowledge Coverage */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Library Coverage
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent, #d6ff4b)' }}>
                {guideStats.coveragePct}%
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {guideStats.withGuides} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {guideStats.totalGames} games</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${guideStats.coveragePct}%`, background: 'var(--accent, #d6ff4b)', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Card 2: Installed Coverage */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Installed Ready
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80' }}>
                {guideStats.installedCoveragePct}%
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {guideStats.installedWithGuides} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {guideStats.installedTotal} installed</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${guideStats.installedCoveragePct}%`, background: '#4ade80', borderRadius: '2px', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Card 3: Missing Guides */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Missing Guides
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: guideStats.missingInstalledGuides > 0 ? '#f59e0b' : '#94a3b8' }}>
                {guideStats.missingInstalledGuides} installed
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: guideStats.missingGuides > 0 ? '#f87171' : '#4ade80', marginBottom: '4px' }}>
              {guideStats.missingGuides} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>unindexed</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {guideStats.missingGuides === 0 ? 'Full offline guide coverage' : 'Auto-fetches StrategyWiki & Wikipedia'}
            </div>
          </div>
        </div>

        {guideNotice && (
          <div className={cn('dashboard-notice-banner', guideNotice.type ? `notice-${guideNotice.type}` : 'notice-error')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
            <span>{typeof guideNotice === 'string' ? guideNotice : (guideNotice.message || 'Guide sync error')}</span>
            <button
              type="button"
              onClick={() => setGuideNotice(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.7, padding: '2px 6px', fontSize: '13px' }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {isSyncingGuides && currentGuideProgress && (
          <div className="hltb-sync-progress-box" style={{ marginTop: '12px', marginBottom: '16px' }}>
            <div className="hltb-sync-progress-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCw size={13} className="spin-icon" style={{ color: 'var(--accent, #d6ff4b)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Downloading Guides: {currentGuideProgress.current} / {currentGuideProgress.total} titles ({currentGuideProgress.synced || 0} saved)
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentGuideProgress.title}
              </span>
            </div>
            <div className="hltb-sync-progress-bar-track">
              <div
                className="hltb-sync-progress-bar-fill"
                style={{
                  width: `${Math.round((currentGuideProgress.current / Math.max(1, currentGuideProgress.total)) * 100)}%`,
                  background: 'var(--accent, #d6ff4b)',
                }}
              />
            </div>
          </div>
        )}

        {/* "Look for Missing Now" Interactive Browser */}
        {guideStats.missingGuides > 0 && (
          <div style={{
            marginTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Missing Guides:
                </span>
                <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setMissingTab('installed')}
                    style={{
                      background: missingTab === 'installed' ? 'var(--accent, #d6ff4b)' : 'transparent',
                      color: missingTab === 'installed' ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Installed ({guideStats.missingInstalledGuides})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMissingTab('all')}
                    style={{
                      background: missingTab === 'all' ? 'var(--accent, #d6ff4b)' : 'transparent',
                      color: missingTab === 'all' ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    All Library ({guideStats.missingGuides})
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search missing..."
                    value={missingSearch}
                    onChange={(e) => setMissingSearch(e.target.value)}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#fff',
                      padding: '4px 8px 4px 24px',
                      fontSize: '11px',
                      width: '150px',
                      outline: 'none',
                    }}
                  />
                </div>
                {onFilterMissingGuides && (
                  <button
                    type="button"
                    onClick={() => onFilterMissingGuides(missingTab === 'installed')}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="View these missing games in the main library grid"
                  >
                    <span>View in Grid</span>
                    <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* List of Missing Titles (Scrollable Grid) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}>
              {displayedMissingList.slice(0, 60).map((game) => {
                const isDownloading = downloadingGameId === game.id
                const cover = game.cover_url ? normalizeArtworkUrl(game.cover_url) : null
                return (
                  <div
                    key={game.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, cursor: 'pointer', flex: 1 }}
                      onClick={() => onSelectGame?.(game)}
                      title={`Open details for ${game.canonical_title}`}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt=""
                          style={{ width: '24px', height: '32px', objectFit: 'cover', borderRadius: '3px', flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <div style={{ width: '24px', height: '32px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Gamepad2 size={12} style={{ opacity: 0.5 }} />
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {game.canonical_title}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {game.is_installed ? 'Installed' : 'Ready'} {game.genre ? `• ${game.genre.split(',')[0]}` : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isDownloading || isSyncingGuides}
                      onClick={() => handleDownloadSingleGuide(game)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: 'var(--accent, #d6ff4b)',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        padding: '4px 8px',
                        cursor: isDownloading || isSyncingGuides ? 'default' : 'pointer',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isDownloading ? (
                        <>
                          <RotateCw size={10} className="spin-icon" />
                          <span>Fetching...</span>
                        </>
                      ) : (
                        <>
                          <BookOpen size={10} />
                          <span>Get Guide</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
              {displayedMissingList.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                  {missingSearch ? `No missing games match "${missingSearch}"` : 'All games in this category have offline strategy guides!'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Bottom Tier: Hall of Fame (Top 5) & Quick Wins */}
      <div className="dashboard-row-split">
        {/* Top 5 Most Played Leaderboard */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="card-heading">Hall of Fame (Most Played)</h3>
              <p className="card-sub">Your all-time most played titles</p>
            </div>
          </div>

          <div className="top-played-list">
            {playtimeStats.topPlayed.length === 0 ? (
              <div className="dashboard-empty-note">No play session time logged yet.</div>
            ) : (
              playtimeStats.topPlayed.map((game, idx) => {
                const maxSec = playtimeStats.topPlayed[0]?.play_time_seconds || 1
                const barWidth = Math.round(((game.play_time_seconds || 0) / maxSec) * 100)
                const cover = game.cover_url ? normalizeArtworkUrl(game.cover_url) : null

                return (
                  <div
                    key={game.id}
                    className="top-played-item"
                    onClick={() => onSelectGame?.(game)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="rank-badge">#{idx + 1}</span>
                    <div className="rank-cover-wrap">
                      {cover ? (
                        <img src={cover} alt="" className="rank-cover-img" />
                      ) : (
                        <div className="rank-cover-fallback">?</div>
                      )}
                    </div>
                    <div className="rank-item-info">
                      <div className="rank-item-header">
                        <strong className="rank-game-title truncate">{game.canonical_title}</strong>
                        <span className="rank-hours">{formatHours(game.play_time_seconds)}</span>
                      </div>
                      <div className="rank-bar-track">
                        <div className="rank-bar-fill" style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Quick Wins Shelf (Under 5h to beat) */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div>
              <h3 className="card-heading">Backlog Quick Wins (&lt; 5 Hours)</h3>
              <p className="card-sub">Short, high-impact titles ready to finish this weekend</p>
            </div>
          </div>

          <div className="quick-wins-grid">
            {hltbStats.quickWins.length === 0 ? (
              <div className="dashboard-empty-note">
                {hltbStats.totalWithHltb === 0
                  ? 'Sync HLTB story hours above to detect quick, high-impact titles you can finish in a weekend.'
                  : 'No unplayed titles under 5 hours detected in your library.'}
              </div>
            ) : (
              hltbStats.quickWins.map((game) => {
                const cover = game.cover_url ? normalizeArtworkUrl(game.cover_url) : null
                return (
                  <div
                    key={game.id}
                    className="quick-win-card"
                    onClick={() => onSelectGame?.(game)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="quick-win-art">
                      {cover ? (
                        <img src={cover} alt="" className="quick-win-img" />
                      ) : (
                        <div className="quick-win-fallback">?</div>
                      )}
                      <span className="quick-win-time-badge">
                        ⏱ ~{game.hltb_main_hours}h
                      </span>
                    </div>
                    <div className="quick-win-info">
                      <strong className="quick-win-title truncate">{game.canonical_title}</strong>
                      <span className="quick-win-status">Unplayed Backlog</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
