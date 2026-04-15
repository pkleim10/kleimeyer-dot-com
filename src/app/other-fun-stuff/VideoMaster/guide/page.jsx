import VideoMasterShell from '../VideoMasterShell'
import UserGuideArticle from '../UserGuideArticle'

export const metadata = {
  title: 'VideoMaster — User guide',
  description:
    'Full user guide for VideoMaster on macOS: libraries, filter strip, grid and list, tags, collections, settings, shortcuts, and glossary.',
}

export default function VideoMasterUserGuidePage() {
  return (
    <VideoMasterShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <a href="/other-fun-stuff/VideoMaster" className="hover:underline">
              VideoMaster
            </a>{' '}
            / User guide
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">VideoMaster user guide</h1>
        </div>
        <article className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-6 py-8 sm:px-10 text-gray-700 dark:text-gray-300 leading-relaxed">
          <UserGuideArticle />
        </article>
      </div>
    </VideoMasterShell>
  )
}
