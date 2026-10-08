import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <div className="text-mint-dark text-xs font-semibold tracking-wider uppercase mb-4">
            eLearningU Accelerator
          </div>
          <h1 className="font-display text-4xl font-bold text-navy mb-4">
            Plan Editor
          </h1>
          <p className="text-muted text-lg">
            Create and edit visual implementation plans for accelerator clients.
          </p>
        </header>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/edit/demo"
            className="block p-6 bg-white rounded-lg border border-navy/10 shadow-card hover:shadow-card-hover hover:border-navy/20 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-mint/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h2 className="font-display text-lg font-semibold text-navy">
                Demo Editor
              </h2>
            </div>
            <p className="text-muted text-sm">
              Try the editor with sample content. Changes won't be saved.
            </p>
          </Link>

          <Link
            href="/assets"
            className="block p-6 bg-white rounded-lg border border-navy/10 shadow-card hover:shadow-card-hover hover:border-navy/20 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-mint/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-display text-lg font-semibold text-navy">
                Asset Library
              </h2>
            </div>
            <p className="text-muted text-sm">
              Browse and manage images, videos, and other assets.
            </p>
          </Link>
        </section>

        {/* Info */}
        <section className="bg-white rounded-lg border border-navy/10 p-6">
          <h2 className="font-display text-lg font-semibold text-navy mb-4">
            Getting Started
          </h2>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex items-start gap-2">
              <span className="text-mint-dark font-bold">1.</span>
              <span>Open an existing client plan from the <strong className="text-navy">My Clients</strong> dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-mint-dark font-bold">2.</span>
              <span>Click <strong className="text-navy">Edit Plan</strong> to open the visual editor</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-mint-dark font-bold">3.</span>
              <span>Add text, images, charts, and videos using the block menu</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-mint-dark font-bold">4.</span>
              <span>Changes are auto-saved and you can view version history anytime</span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
