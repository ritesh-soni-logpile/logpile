const { describe, it, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Database = require('better-sqlite3')

const { clearRegistryCache, parseRegistryTreeOutput } = require('../src/main/services/scanners/scannerUtils.cjs')
const { scanItch } = require('../src/main/services/scanners/itchScanner.cjs')
const { scanRiot } = require('../src/main/services/scanners/riotScanner.cjs')
const { scanLegacy } = require('../src/main/services/scanners/legacyScanner.cjs')
const { scanHumble } = require('../src/main/services/scanners/humbleScanner.cjs')
const { scanHoyoverse } = require('../src/main/services/scanners/hoyoverseScanner.cjs')
const { scanWargaming } = require('../src/main/services/scanners/wargamingScanner.cjs')
const {
  scanBattleNet,
  scanRockstar,
  scanCdProjekt,
  scanNetmarble,
  scanNetEase,
  scanGaijin,
  scanNexon,
  scanKuro,
  scanRoblox,
  scanStandaloneClients,
} = require('../src/main/services/scanners/publisherScanner.cjs')
const { scanCustomFolders, cleanFolderGameTitle } = require('../src/main/services/scanners/customFolderScanner.cjs')
const { inferStoreName, autoLabelCustomStore } = require('../src/main/services/excelImporter.cjs')
const { mergeRecords } = require('../src/main/services/deduplicationService.cjs')
const { normalizeCanonicalTitle } = require('../src/main/services/titleNormalizer.cjs')
const { reconcileSteam } = require('../src/main/services/scanners/steamScanner.cjs')
const { createDatabase, getGames, getLibrarySettings, setLibrarySettings, markSourceUninstalled } = require('../electron/db.cjs')

const tempRoots = []

function makeTempDir(prefix = 'logpile-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  tempRoots.push(dir)
  return dir
}

function makeDummyFile(filePath, content = 'MZ') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  return filePath
}

afterEach(() => {
  clearRegistryCache()
  while (tempRoots.length) {
    const dir = tempRoots.pop()
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

describe('Universal PC Platform Scanners (v1.3.95)', () => {
  it('parses Windows registry tree output accurately', () => {
    const raw = [
      'HKEY_CURRENT_USER\\Software\\Cognosphere\\HYP\\hk4e_global',
      '    GameInstallPath    REG_SZ    D:\\Games\\Genshin Impact',
      '    Version    REG_SZ    5.2.0',
      '',
      'HKEY_CURRENT_USER\\Software\\Cognosphere\\HYP\\hkrpg_global',
      '    GameInstallPath    REG_SZ    D:\\Games\\Star Rail',
    ].join('\r\n')
    const parsed = parseRegistryTreeOutput(raw)
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].GameInstallPath, 'D:\\Games\\Genshin Impact')
    assert.equal(parsed[1].GameInstallPath, 'D:\\Games\\Star Rail')
  })

  it('itchScanner reads butler.db caves & games cleanly', () => {
    const root = makeTempDir()
    const gameDir = path.join(root, 'Crosscode')
    const exePath = makeDummyFile(path.join(gameDir, 'CrossCode.exe'), 'MZ'.repeat(50))
    const butlerPath = path.join(root, 'butler.db')

    const db = new Database(butlerPath)
    db.exec(`
      CREATE TABLE games (id INTEGER PRIMARY KEY, title TEXT, cover_url TEXT, still_cover_url TEXT, short_text TEXT, published_at TEXT);
      CREATE TABLE caves (id TEXT PRIMARY KEY, game_id INTEGER, verdict TEXT, installed_size INTEGER, seconds_run INTEGER, last_touched_at TEXT);
    `)
    db.prepare('INSERT INTO games VALUES (?, ?, ?, ?, ?, ?)').run(4242, 'CrossCode™', 'https://img.itch.zone/cover.jpg', null, 'Retro RPG', '2018-09-20')
    db.prepare('INSERT INTO caves VALUES (?, ?, ?, ?, ?, ?)').run(
      'cave-uuid-1',
      4242,
      JSON.stringify({ basePath: gameDir, totalSize: 900000, candidates: [{ path: 'CrossCode.exe', flavor: 'windows' }] }),
      900000,
      3600,
      '2026-10-01T12:00:00Z'
    )
    db.close()

    const res = scanItch(null, null, { dbPath: butlerPath })
    assert.equal(res.source, 'itch')
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'CrossCode')
    assert.equal(res.records[0].storeName, 'Itch.io')
    assert.equal(res.records[0].executable, exePath)
    assert.equal(res.records[0].launchUri, 'itch://games/4242')
    assert.equal(res.records[0].playTimeSeconds, 3600)
  })

  it('riotScanner reads RiotClientInstalls.json and product_settings.yaml', () => {
    const root = makeTempDir()
    const rcExe = makeDummyFile(path.join(root, 'Riot Client', 'RiotClientServices.exe'))
    const valDir = path.join(root, 'VALORANT', 'live')
    makeDummyFile(path.join(valDir, 'VALORANT.exe'))

    const installsJson = path.join(root, 'RiotClientInstalls.json')
    fs.writeFileSync(installsJson, JSON.stringify({ rc_live: rcExe }))

    const metadataDir = path.join(root, 'Metadata')
    const valMetaDir = path.join(metadataDir, 'valorant.live')
    fs.mkdirSync(valMetaDir, { recursive: true })
    fs.writeFileSync(
      path.join(valMetaDir, 'valorant.live.product_settings.yaml'),
      `product_install_full_path: "${valDir.replace(/\\/g, '\\\\')}"\n`
    )

    const res = scanRiot(null, null, { installsJsonPath: installsJson, metadataDir, entries: [] })
    assert.equal(res.source, 'riot')
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'VALORANT')
    assert.equal(res.records[0].executable, rcExe)
    assert.equal(res.records[0].launchArguments, '--launch-product=valorant --launch-patchline=live')
    assert.equal(res.records[0].launchUri, 'riotclient://')
  })

  it('legacyScanner reads app-state.json installed titles', () => {
    const root = makeTempDir()
    const gameDir = path.join(root, 'LegacyGame')
    const exePath = makeDummyFile(path.join(gameDir, 'MysteryCase.exe'))
    const statePath = path.join(root, 'app-state.json')
    fs.writeFileSync(statePath, JSON.stringify({
      siteData: {
        catalog: [
          { game_id: 'lg-101', game_name: 'Mystery Case Files', game_installed_path: gameDir },
        ],
      },
    }))

    const res = scanLegacy(null, null, { appStatePath: statePath, entries: [] })
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'Mystery Case Files')
    assert.equal(res.records[0].storeName, 'Legacy Games')
    assert.equal(res.records[0].executable, exePath)
  })

  it('humbleScanner reads config.json downloaded titles', () => {
    const root = makeTempDir()
    const gameDir = path.join(root, 'Signalis')
    const exePath = makeDummyFile(path.join(gameDir, 'SIGNALIS.exe'))
    const cfgPath = path.join(root, 'config.json')
    fs.writeFileSync(cfgPath, JSON.stringify({
      'game-collection-4': [
        { machineName: 'signalis_win', gameName: 'SIGNALIS', filePath: gameDir, executablePath: exePath },
      ],
    }))

    const res = scanHumble(null, null, { configPath: cfgPath, entries: [] })
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'SIGNALIS')
    assert.equal(res.records[0].storeName, 'Humble')
    assert.equal(res.records[0].executable, exePath)
  })

  it('hoyoverseScanner reads HYP registry entries and matches preferred executables', () => {
    const root = makeTempDir()
    const giDir = path.join(root, 'Genshin Impact Game')
    const giExe = makeDummyFile(path.join(giDir, 'GenshinImpact.exe'))
    makeDummyFile(path.join(giDir, 'UnityCrashHandler64.exe'))

    const res = scanHoyoverse(null, null, {
      registryEntries: [{ key: 'HKEY_CURRENT_USER\\Software\\Cognosphere\\HYP\\hk4e_global', GameInstallPath: giDir }],
      entries: [],
    })
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'Genshin Impact')
    assert.equal(res.records[0].storeName, 'HoYoPlay')
    assert.equal(res.records[0].executable, giExe)
  })

  it('wargamingScanner reads GameCenter apps directory and game_info.xml', () => {
    const root = makeTempDir()
    const gameDir = path.join(root, 'World_of_Tanks')
    const exePath = makeDummyFile(path.join(gameDir, 'WorldOfTanks.exe'))
    makeDummyFile(path.join(gameDir, 'game_info.xml'), '<protocol><game><id>WOT.ASIA</id><name>World of Tanks</name></game></protocol>')

    const appsDir = path.join(root, 'apps')
    const appSub = path.join(appsDir, 'WOT.ASIA.PRODUCTION')
    fs.mkdirSync(appSub, { recursive: true })
    fs.writeFileSync(path.join(appSub, 'preferences.xml'), `<preferences><path>${gameDir}</path></preferences>`)

    const res = scanWargaming(null, null, { appsDir, entries: [] })
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'World of Tanks')
    assert.equal(res.records[0].storeName, 'Wargaming')
    assert.equal(res.records[0].executable, exePath)
  })

  it('publisherScanner handles Battle.net, Rockstar, CD Projekt, Netmarble, NetEase, Gaijin, Nexon, Kuro, Roblox, Standalone', () => {
    const root = makeTempDir()
    const bnetDir = path.join(root, 'Overwatch')
    const bnetExe = makeDummyFile(path.join(bnetDir, 'Overwatch.exe'))
    const rdrDir = path.join(root, 'Red Dead Redemption 2')
    makeDummyFile(path.join(rdrDir, 'RDR2.exe'))
    const cpDir = path.join(root, 'Cyberpunk 2077')
    makeDummyFile(path.join(cpDir, 'bin', 'x64', 'Cyberpunk2077.exe'))
    const nmDir = path.join(root, 'Solo Leveling ARISE')
    makeDummyFile(path.join(nmDir, 'SoloLeveling.exe'))
    const neDir = path.join(root, 'Once Human')
    makeDummyFile(path.join(neDir, 'ONCE_HUMAN.exe'))
    const gjDir = path.join(root, 'War Thunder')
    makeDummyFile(path.join(gjDir, 'aces.exe'))
    const nxDir = path.join(root, 'MapleStory')
    makeDummyFile(path.join(nxDir, 'MapleStory.exe'))
    const krDir = path.join(root, 'Wuthering Waves')
    makeDummyFile(path.join(krDir, 'Wuthering Waves.exe'))
    const rbDir = path.join(root, 'Roblox')
    makeDummyFile(path.join(rbDir, 'RobloxPlayerBeta.exe'))
    const poeDir = path.join(root, 'Path of Exile')
    makeDummyFile(path.join(poeDir, 'PathOfExile.exe'))
    const steamGtaDir = path.join(root, 'SteamLibrary', 'steamapps', 'common', 'Grand Theft Auto V')
    makeDummyFile(path.join(steamGtaDir, 'GTA5.exe'))

    const entries = [
      { key: 'HKLM\\...\\Battle.net', DisplayName: 'Battle.net', Publisher: 'Blizzard Entertainment', InstallLocation: root },
      { key: 'HKLM\\...\\Overwatch', DisplayName: 'Overwatch', Publisher: 'Blizzard Entertainment', InstallLocation: bnetDir, DisplayIcon: `${bnetExe},0`, UninstallString: '"C:\\Battle.net\\Battle.net.exe" --exec="uninstall" --uid=pro' },
      { key: 'HKLM\\...\\Rockstar Games Launcher', DisplayName: 'Rockstar Games Launcher', Publisher: 'Rockstar Games', InstallLocation: root },
      { key: 'HKLM\\...\\RDR2', DisplayName: 'Red Dead Redemption 2', Publisher: 'Rockstar Games', InstallLocation: rdrDir },
      { key: 'HKLM\\...\\SteamApp271590', DisplayName: 'Grand Theft Auto V', Publisher: 'Rockstar Games', InstallLocation: steamGtaDir },
      { key: 'HKLM\\...\\REDlauncher', DisplayName: 'REDlauncher', Publisher: 'CD PROJEKT RED', InstallLocation: root },
      { key: 'HKLM\\...\\CP2077', DisplayName: 'Cyberpunk 2077', Publisher: 'CD PROJEKT RED', InstallLocation: cpDir },
      { key: 'HKLM\\...\\Netmarble Launcher', DisplayName: 'Netmarble Launcher', Publisher: 'Netmarble', InstallLocation: root },
      { key: 'HKLM\\...\\SLA', DisplayName: 'Solo Leveling: ARISE', Publisher: 'Netmarble', InstallLocation: nmDir },
      { key: 'HKLM\\...\\LoadingBay', DisplayName: 'Loading Bay', Publisher: 'NetEase Games', InstallLocation: root },
      { key: 'HKLM\\...\\OnceHuman', DisplayName: 'Once Human', Publisher: 'NetEase Games', InstallLocation: neDir },
      { key: 'HKLM\\...\\WarThunder', DisplayName: 'War Thunder', Publisher: 'Gaijin Entertainment', InstallLocation: gjDir },
      { key: 'HKLM\\...\\MapleStory', DisplayName: 'MapleStory', Publisher: 'NEXON', InstallLocation: nxDir },
      { key: 'HKLM\\...\\WutheringWaves', DisplayName: 'Wuthering Waves', Publisher: 'KURO GAMES', InstallLocation: krDir },
      { key: 'HKCU\\...\\Roblox', DisplayName: 'Roblox Player for user', Publisher: 'Roblox Corporation', InstallLocation: rbDir },
      { key: 'HKLM\\...\\PoE', DisplayName: 'Path of Exile', Publisher: 'Grinding Gear Games', InstallLocation: poeDir },
    ]

    const opts = { entries, rockstarRegistryEntries: [] }
    const bnet = scanBattleNet(null, null, opts)
    assert.equal(bnet.records.length, 1)
    assert.equal(bnet.records[0].platformGameId, 'PRO')
    assert.equal(bnet.records[0].launchUri, 'battlenet://game/PRO')

    const rstar = scanRockstar(null, null, opts)
    assert.equal(rstar.records.length, 1)
    assert.equal(rstar.records[0].canonicalTitle, 'Red Dead Redemption 2')

    assert.equal(scanCdProjekt(null, null, opts).records[0].canonicalTitle, 'Cyberpunk 2077')
    assert.equal(scanNetmarble(null, null, opts).records[0].canonicalTitle, 'Solo Leveling: ARISE')
    assert.equal(scanNetEase(null, null, opts).records[0].canonicalTitle, 'Once Human')
    assert.equal(scanGaijin(null, null, opts).records[0].canonicalTitle, 'War Thunder')
    assert.equal(scanNexon(null, null, opts).records[0].canonicalTitle, 'MapleStory')
    assert.equal(scanKuro(null, null, opts).records[0].canonicalTitle, 'Wuthering Waves')
    assert.equal(scanRoblox(null, null, opts).records[0].launchUri, 'roblox-player://')
    assert.equal(scanStandaloneClients(null, null, opts).records[0].canonicalTitle, 'Path of Exile')
  })

  it('customFolderScanner finds standalone games, skips redist/existing DB folders, and cleans titles', () => {
    const root = makeTempDir()
    const hadesDir = path.join(root, 'Hades [FitGirl Repack] v1.38')
    const hadesExe = makeDummyFile(path.join(hadesDir, 'x64', 'Hades.exe'))
    const alreadyDir = path.join(root, 'Already Indexed Game')
    makeDummyFile(path.join(alreadyDir, 'Game.exe'))
    makeDummyFile(path.join(root, '_Redist', 'vcredist_x64.exe'))

    assert.equal(cleanFolderGameTitle('Hades [FitGirl Repack] v1.38'), 'Hades')

    const res = scanCustomFolders(null, null, {
      folders: [root],
      existingInstallPaths: new Set([path.normalize(alreadyDir).toLowerCase()]),
    })
    assert.equal(res.records.length, 1)
    assert.equal(res.records[0].canonicalTitle, 'Hades')
    assert.equal(res.records[0].storeName, 'Standalone')
    assert.equal(res.records[0].executable, hadesExe)
  })

  it('db + deduplicationService link multi-store games, persist launch_arguments, and store customScanFolders', async () => {
    const root = makeTempDir()
    const dbFile = path.join(root, 'test.db')
    const db = createDatabase(dbFile)

    try {
      const saved = setLibrarySettings(db, {
        customScanFolders: ['D:\\Games', 'd:\\games\\', 'E:\\Portable'],
      })
      assert.deepEqual(saved.customScanFolders, ['D:\\Games', 'E:\\Portable'])
      assert.deepEqual(getLibrarySettings(db).customScanFolders, ['D:\\Games', 'E:\\Portable'])

      const mergeSummary = await mergeRecords(db, [
        {
          canonicalTitle: 'Grand Theft Auto V',
          platform: 'steam',
          platformGameId: '271590',
          platformLaunchId: '271590',
          idSource: 'steam-manifest:appid',
          launchUri: 'steam://rungameid/271590',
          isInstalled: false,
          storeName: 'Steam',
        },
        {
          canonicalTitle: 'Grand Theft Auto V',
          platform: 'rockstar',
          platformGameId: 'Grand Theft Auto V',
          idSource: 'rockstar-registry:uninstall-key',
          isInstalled: true,
          executable: 'D:\\Rockstar\\GTA5\\GTA5.exe',
          storeName: 'Rockstar Games',
        },
        {
          canonicalTitle: 'VALORANT',
          platform: 'riot',
          platformGameId: 'valorant',
          idSource: 'riot-metadata:product-settings',
          isInstalled: true,
          executable: 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
          launchArguments: '--launch-product=valorant --launch-patchline=live',
          launchUri: 'riotclient://',
          storeName: 'Riot Games',
        },
      ])

      assert.equal(mergeSummary.created, 2)
      assert.equal(mergeSummary.linked, 1)

      const games = getGames(db)
      const gta = games.find((g) => g.canonical_title === 'Grand Theft Auto V')
      assert.ok(gta)
      assert.equal(gta.sources.length, 2)
      assert.ok(gta.sources.some((s) => s.platform === 'steam'))
      assert.ok(gta.sources.some((s) => s.sourceName === 'Rockstar Games'))

      const val = games.find((g) => g.canonical_title === 'VALORANT')
      assert.ok(val)
      assert.equal(val.store_name, 'Riot Games')
      assert.equal(val.launch_arguments, '--launch-product=valorant --launch-patchline=live')
    } finally {
      db.close()
    }
  })

  it('excelImporter and platformMeta normalize all new storefronts cleanly', async () => {
    assert.equal(inferStoreName('Sheet1', { Platform: 'battle.net' }), 'Battle.net')
    assert.equal(inferStoreName('Sheet1', { Platform: 'itch.io' }), 'Itch.io')
    assert.equal(inferStoreName('Sheet1', { Platform: 'riot' }), 'Riot Games')
    assert.equal(inferStoreName('Sheet1', { Platform: 'NetEase' }), 'NetEase')
    assert.equal(autoLabelCustomStore('Custom', 'Solo Leveling: ARISE', 'Netmarble', ''), 'Netmarble')

    const meta = await import('../src/utils/platformMeta.mjs')
    for (const label of [
      'Itch.io', 'Battle.net', 'Riot Games', 'Rockstar Games', 'CD Projekt',
      'Netmarble', 'NetEase', 'Legacy Games', 'HoYoPlay', 'Humble',
      'Wargaming', 'Gaijin', 'Nexon', 'Kuro Games', 'Roblox',
    ]) {
      assert.equal(meta.normalizeStoreLabel(label), label)
      const slug = meta.normalizePlatform(label)
      assert.notEqual(slug, 'custom', `Expected dedicated slug for ${label}`)
      assert.equal(meta.platformLabel(slug), label)
    }
    assert.equal(meta.isLauncherUri('battlenet://game/PRO'), true)
    assert.equal(meta.isLauncherUri('itch://games/4242'), true)
    assert.equal(meta.isLauncherUri('riotclient://'), true)
  })

  it('normalizes GTA V Legacy/Enhanced/Premium, Roman numerals, and abbreviations without false merges', async () => {
    const gtaVariants = [
      'Grand Theft Auto V',
      'Grand Theft Auto V Legacy',
      'Grand Theft Auto V Enhanced',
      'Grand Theft Auto V: Premium Edition',
      'GTA V',
      'GTA 5',
    ]
    const normSet = new Set(gtaVariants.map((t) => normalizeCanonicalTitle(t)))
    assert.equal(normSet.size, 1)
    assert.equal([...normSet][0], 'grandtheftauto5')

    assert.equal(normalizeCanonicalTitle('Final Fantasy XIV'), normalizeCanonicalTitle('Final Fantasy 14'))
    assert.equal(normalizeCanonicalTitle('Dark Souls III'), normalizeCanonicalTitle('Dark Souls 3'))
    assert.equal(normalizeCanonicalTitle('The Witcher 3: Wild Hunt'), normalizeCanonicalTitle('Witcher III: Wild Hunt - Complete Edition'))
    assert.equal(normalizeCanonicalTitle('RDR2'), normalizeCanonicalTitle('Red Dead Redemption 2'))

    // Safeguards against over-stripping real game names
    assert.equal(normalizeCanonicalTitle('Hogwarts Legacy'), 'hogwartslegacy')
    assert.equal(normalizeCanonicalTitle('Rogue Legacy 2'), 'roguelegacy2')
    assert.notEqual(normalizeCanonicalTitle('Hogwarts Legacy'), 'hogwarts')
    assert.equal(normalizeCanonicalTitle('V Rising'), 'vrising')

    // Frontend ESM mirror stays in exact parity with backend CJS normalizer
    const esm = await import('../src/utils/titleNormalizer.mjs')
    const cjs = require('../src/main/services/titleNormalizer.cjs')
    for (const sample of [
      ...gtaVariants,
      'The Witcher 3: Wild Hunt - Complete Edition',
      'Hogwarts Legacy',
      'Rogue Legacy 2',
      'V Rising',
      'Deep Silver Project Windfall',
      'Final Fantasy XIV',
      'Red Dead Redemption 2',
    ]) {
      assert.equal(esm.cleanTitlePrefixes(sample), cjs.cleanTitlePrefixes(sample))
      assert.equal(esm.normalizeTitleSpaced(sample), cjs.normalizeTitleSpaced(sample))
      assert.equal(esm.normalizeCanonicalTitle(sample), cjs.normalizeCanonicalTitle(sample))
      assert.equal(esm.getEditionTierScore(sample), cjs.getEditionTierScore(sample))
    }
  })

  it('detects duplicate installed copies across platforms, recommends keep/uninstall, and promotes remaining copy on uninstall', async () => {
    const root = makeTempDir()
    const db = createDatabase(path.join(root, 'dup.db'))
    const advisor = await import('../src/utils/duplicateAdvisor.mjs')

    try {
      const steamDir = path.join(root, 'Steam', 'steamapps', 'common', 'GTAV')
      const epicDir = path.join(root, 'Epic', 'GTAVEnhanced')
      makeDummyFile(path.join(steamDir, 'GTA5.exe'))
      makeDummyFile(path.join(epicDir, 'GTA5_Enhanced.exe'))

      await mergeRecords(db, [
        {
          canonicalTitle: 'Grand Theft Auto V Legacy',
          platform: 'steam',
          platformGameId: '271590',
          platformLaunchId: '271590',
          idSource: 'steam-manifest:appid',
          launchUri: 'steam://rungameid/271590',
          isInstalled: true,
          installPath: steamDir,
          installSizeBytes: 110 * (1024 ** 3),
          playTimeSeconds: 36000,
          executable: path.join(steamDir, 'GTA5.exe'),
          storeName: 'Steam',
        },
        {
          canonicalTitle: 'Grand Theft Auto V Enhanced',
          platform: 'epic',
          platformGameId: 'epic-gta5',
          platformLaunchId: 'epic-gta5',
          idSource: 'epic-manifest:CatalogItemId',
          launchUri: 'com.epicgames.launcher://apps/epic-gta5?action=launch&silent=true',
          isInstalled: true,
          installPath: epicDir,
          installSizeBytes: 95 * (1024 ** 3),
          playTimeSeconds: 0,
          executable: path.join(epicDir, 'GTA5_Enhanced.exe'),
          storeName: 'Epic Games',
        },
        {
          canonicalTitle: 'GTA V',
          platform: 'rockstar',
          platformGameId: 'gtav-rstar',
          idSource: 'rockstar-registry:uninstall-key',
          isInstalled: false,
          storeName: 'Rockstar Games',
        },
      ])

      const games = getGames(db)
      assert.equal(games.length, 1)
      assert.equal(games[0].sources.length, 3)

      const report = advisor.findDuplicateInstalls(games)
      assert.equal(report.totalDuplicateGames, 1)
      assert.equal(report.items[0].keep.storeLabel, 'Steam')
      assert.equal(report.items[0].remove.length, 1)
      assert.equal(report.items[0].remove[0].storeLabel, 'Epic Games')
      assert.equal(report.totalReclaimableGb, 95)

      // Uninstalling Steam copy promotes Epic copy instead of marking the game uninstalled
      await reconcileSteam(db, new Set(), [])
      const afterSteamRemoved = getGames(db)
      assert.equal(afterSteamRemoved[0].is_installed, true)
      assert.equal(afterSteamRemoved[0].install_path, epicDir)
      assert.equal(advisor.findDuplicateInstalls(afterSteamRemoved).totalDuplicateGames, 0)

      // Mark Epic copy uninstalled cleanly updates game to uninstalled
      markSourceUninstalled(db, { gameId: afterSteamRemoved[0].id, platform: 'epic', storeName: 'Epic Games', platformGameId: 'epic-gta5' })
      const afterAllRemoved = getGames(db)
      assert.equal(afterAllRemoved[0].is_installed, false)
    } finally {
      db.close()
    }
  })
})
