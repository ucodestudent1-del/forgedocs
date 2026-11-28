export const metadata = {
  title: "Offline - ForgeDocs",
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-1.343 3-3v-6c0-1.657-1.343-3-3-3H3c-1.657 0-3 1.343-3 3v6c0 1.657 1.343 3 3 3z"></path>
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">You're offline</h1>
        <p className="text-muted-foreground mb-6">
          ForgeDocs works best with an internet connection. Some features may be limited while offline.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
