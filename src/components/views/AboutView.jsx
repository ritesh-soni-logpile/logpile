import { useState } from 'react'
import { ShieldCheck, Key, Code, Coffee, CupSoda, Github, Copy, Check, Heart, ExternalLink } from 'lucide-react'

export function AboutView() {
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  const cryptoWallets = [
    { key: 'btc', name: 'Bitcoin', symbol: 'BTC', address: 'bc1qcf9f3fd5q5n9gxkjz5fh74qgdv2dgryqkkdmlk' },
    { key: 'eth', name: 'Ethereum', symbol: 'ETH', address: '0xE3e9e4Dfb4c87B6101700c70F73790a903f92Ef0' },
    { key: 'usdt', name: 'Tether USD', symbol: 'USDT (ERC-20)', address: '0xE3e9e4Dfb4c87B6101700c70F73790a903f92Ef0' },
    { key: 'sol', name: 'Solana', symbol: 'SOL', address: 'F8aPJG3tUtbLHbhdfxeNFmcv8b2GK7anY3EmTr6CcHkS' },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto px-8 py-10 fade-in custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full space-y-12">
        
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                  Logpile Desktop
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]">
                  v1.2.0 Sanctuary Edition
                </span>
              </div>
              <p className="text-lg text-[var(--text-secondary)] mt-1.5">An offline-first, private personal game sanctuary &amp; library manager.</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--text-muted)]">Current build: 1.2.0</span>
                <a
                  href="https://github.com/corporateintrovertgamer/logpile/releases"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[var(--text-primary)] border border-[rgba(255,255,255,0.1)] hover:border-[var(--accent)] shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-all cursor-pointer group"
                >
                  <span>Check for updates</span>
                  <ExternalLink size={13} className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" />
                </a>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Direct release channel on GitHub
              </p>
            </div>
          </div>
        </div>

        {/* Support the Developer */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-rose-400 border-b border-[rgba(255,255,255,0.08)] pb-3">
            <Heart size={22} className="text-rose-400" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Support Independent Development</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Logpile is free, open source, and 100% offline-first with zero advertisements, telemetry, or user tracking. If it helps bring order and beauty to your game library, consider supporting independent software craftsmanship.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://ko-fi.com/corporateintrovertgamer"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-5 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] hover:border-amber-500/50 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-all duration-200 group cursor-pointer hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_14px_rgba(245,158,11,0.2)]">
                  <Coffee size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">Ko-fi</h3>
                  <p className="text-xs text-[var(--text-muted)]">Tip or buy a coffee</p>
                </div>
              </div>
              <ExternalLink size={15} className="text-[var(--text-muted)] group-hover:text-amber-400 transition-colors" />
            </a>

            <a
              href="https://buymeacoffee.com/Corporateintrovertgamer"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-5 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] hover:border-yellow-500/50 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-all duration-200 group cursor-pointer hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_14px_rgba(234,179,8,0.2)]">
                  <CupSoda size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">Buy Me a Coffee</h3>
                  <p className="text-xs text-[var(--text-muted)]">One-time contribution</p>
                </div>
              </div>
              <ExternalLink size={15} className="text-[var(--text-muted)] group-hover:text-yellow-400 transition-colors" />
            </a>

            <a
              href="https://github.com/corporateintrovertgamer"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-5 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.08)] hover:border-purple-500/50 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.3)] transition-all duration-200 group cursor-pointer hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_14px_rgba(168,85,247,0.2)]">
                  <Github size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">GitHub Sponsors</h3>
                  <p className="text-xs text-[var(--text-muted)]">Sponsor on GitHub</p>
                </div>
              </div>
              <ExternalLink size={15} className="text-[var(--text-muted)] group-hover:text-purple-400 transition-colors" />
            </a>
          </div>

          {/* Crypto Wallets */}
          <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 space-y-4 shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
            <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-secondary)] flex items-center gap-2">
              Crypto Donations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cryptoWallets.map((wallet) => {
                const isCopied = copiedKey === wallet.key
                return (
                  <div key={wallet.key} className="p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.15)] rounded-xl space-y-2 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{wallet.name}</span>
                      <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[var(--accent)] border border-[rgba(255,255,255,0.08)]">
                        {wallet.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <code className="text-xs text-[var(--text-muted)] truncate select-all font-mono">
                        {wallet.address}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(wallet.key, wallet.address)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[var(--text-primary)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-all shrink-0 cursor-pointer"
                        title="Copy address"
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Legal Disclaimer */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[var(--accent)] border-b border-[rgba(255,255,255,0.08)] pb-3">
            <ShieldCheck size={22} />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Legal Disclaimer &amp; Privacy</h2>
          </div>
          <div className="space-y-4 text-[var(--text-secondary)] text-sm leading-relaxed bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
            <p>
              Logpile is an offline-first library manager designed to organize locally installed applications. 
              <strong> Logpile does not provide, distribute, or host any game files, and does not condone piracy.</strong> Users must legally own and provide their own software.
            </p>
            <p>
              Internet connectivity is solely used to query public APIs (IGDB and SteamGridDB) to retrieve metadata and artwork for the user's personal display. 
              Logpile does not collect, store, or transmit telemetry or personal data to any external servers. All library data is stored locally on your machine.
            </p>
            <p>
              All game titles, artwork, logos, and trademarks are the property of their respective copyright holders.
            </p>
            <div className="mt-4 p-4 bg-[rgba(0,0,0,0.3)] rounded-xl text-xs text-[var(--text-muted)] uppercase tracking-wide border border-[rgba(255,255,255,0.06)] leading-relaxed">
              <p>THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
            </div>
          </div>
        </section>

        {/* API Setup Guide */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-[var(--text-primary)] border-b border-[rgba(255,255,255,0.08)] pb-3">
            <Key size={22} className="text-amber-400" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">How to Get Your API Keys</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Logpile requires personal API keys to automatically fetch high-quality artwork and metadata for your games. 
            Because Logpile is a local app without a central backend server, you must provide your own keys to use these public services.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 space-y-4 shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs shadow-[0_0_10px_rgba(59,130,246,0.2)]">1</span>
                SteamGridDB <span className="text-xs font-normal text-[var(--text-muted)]">(High-Res Artwork)</span>
              </h3>
              <ol className="list-decimal list-outside ml-4 space-y-2 text-[var(--text-secondary)] text-sm leading-relaxed">
                <li>Create a free account at <strong>steamgriddb.com</strong>.</li>
                <li>Click your profile picture in the top right, then go to <strong>Preferences &rarr; API</strong>.</li>
                <li>Click <strong>Generate API Key</strong>.</li>
                <li>Copy the key and paste it into Logpile's <strong>Settings</strong> panel.</li>
              </ol>
            </div>

            <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 space-y-4 shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 font-bold text-xs shadow-[0_0_10px_rgba(168,85,247,0.2)]">2</span>
                IGDB <span className="text-xs font-normal text-[var(--text-muted)]">(Game Metadata)</span>
              </h3>
              <ol className="list-decimal list-outside ml-4 space-y-2 text-[var(--text-secondary)] text-sm leading-relaxed">
                <li>Log into <strong>dev.twitch.tv/console</strong> with a Twitch account (requires 2FA).</li>
                <li>Go to <strong>Applications</strong> and click <strong>Register Your Application</strong>.</li>
                <li>Set Name: <em>Logpile</em>, Category: <em>Application Integration</em>, and OAuth Redirect: <em>http://localhost</em>.</li>
                <li>Click <strong>Manage</strong> on your new app to reveal your <strong>Client ID</strong>.</li>
                <li>Click <strong>New Secret</strong> to generate your <strong>Client Secret</strong>.</li>
                <li>Paste both into Logpile's <strong>Settings</strong> panel.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Open Source Credits */}
        <section className="space-y-4 pb-12">
          <div className="flex items-center gap-3 text-[var(--text-primary)] border-b border-[rgba(255,255,255,0.08)] pb-3">
            <Code size={22} className="text-emerald-400" />
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Open Source &amp; Credits</h2>
          </div>
          <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 text-[var(--text-secondary)] text-sm space-y-3 shadow-[0_16px_36px_rgba(0,0,0,0.3)]">
            <p><strong className="text-[var(--text-primary)]">Developed by:</strong> Corporate Introvert Gamer (Ritesh Soni)</p>
            <p><strong className="text-[var(--text-primary)]">Built with:</strong> React, Vite, Electron, Tailwind CSS, and better-sqlite3</p>
            <p><strong className="text-[var(--text-primary)]">Branding &amp; Icons:</strong> Generated via ChatGPT, upscaled via Seed-VR2</p>
            <p><strong className="text-[var(--text-primary)]">Artwork provided by:</strong> SteamGridDB</p>
            <p><strong className="text-[var(--text-primary)]">Game data:</strong> IGDB</p>
            <p className="text-xs text-[var(--text-muted)] pt-3 border-t border-[rgba(255,255,255,0.06)] leading-relaxed">
              All game titles, storefront names, and logos are trademarks or registered trademarks of their respective owners. Logpile is an independent open-source project and is not affiliated with, sponsored by, or endorsed by Valve, Epic Games, CD Projekt, Electronic Arts, or Ubisoft.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
