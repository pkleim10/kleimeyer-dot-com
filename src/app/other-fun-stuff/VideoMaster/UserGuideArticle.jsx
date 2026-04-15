import Link from 'next/link'

function H2({ id, children }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-600 pb-2 mt-14 first:mt-0"
    >
      {children}
    </h2>
  )
}

function H3({ id, children }) {
  return (
    <h3
      id={id}
      className="scroll-mt-24 text-lg font-semibold text-gray-900 dark:text-white mt-8 mb-3"
    >
      {children}
    </h3>
  )
}

const toc = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'first-launch', label: 'First launch' },
  { id: 'main-window', label: 'Main window' },
  { id: 'everyday', label: 'Everyday tasks' },
  { id: 'settings-ref', label: 'Settings' },
  { id: 'troubleshooting', label: 'If something goes wrong' },
  { id: 'reference', label: 'Reference' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'menu-map', label: 'Menu map' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'where-doc', label: 'Repo paths' },
]

export default function UserGuideArticle() {
  return (
    <>
      <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
        Welcome! This guide is for <strong>people</strong>, not engineers. It mixes a gentle <strong>getting-started</strong>{' '}
        path with a <strong>reference</strong> section you can skim later. Screenshots can be added to the site later; figures
        in the app repo use placeholders until then.
      </p>

      <nav
        aria-label="On this page"
        className="mt-8 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">On this page</p>
        <ul className="flex flex-wrap gap-2">
          {toc.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="inline-block text-sm px-2 py-1 rounded-md text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <H2 id="welcome">Welcome to VideoMaster</H2>
      <p className="mt-4">
        <strong>What it is</strong>
        <br />
        VideoMaster helps you <strong>browse and organize video files</strong> that live in folders on your Mac. It
        doesn&apos;t move your originals into a mystery box: it <strong>indexes</strong> what you point it at, then gives you
        a fast grid or list, search, a <strong>filter strip</strong> (library slices, collections, per-star filter, tags),{' '}
        <strong>tags</strong> and <strong>star ratings</strong>, optional <strong>custom metadata</strong>, and a detail pane
        for each file.
      </p>
      <p className="mt-4">
        <strong>What a library is</strong>
        <br />A <strong>library</strong> is a single database file that remembers your folders, tags, ratings, collections,
        custom field definitions (and values), and what it learned about each video. Your actual videos stay where they are
        on disk. You can have more than one library (for example, work vs. home) and switch between them from the{' '}
        <strong>File</strong> menu.
      </p>
      <p className="mt-4">
        <strong>Who it&apos;s for</strong>
        <br />
        Anyone with lots of clips — editors, archivists, or &ldquo;I have three hard drives of family videos&rdquo; folks —
        who wants one place to <strong>find</strong> and <strong>open</strong> things without hunting in Finder.
      </p>
      <p className="mt-4 text-sm italic text-gray-500 dark:text-gray-400">
        Figure: main window overview — full window with browsing pane, bottom filter strip, and detail (add screenshot when
        ready).
      </p>

      <H2 id="first-launch">First launch: create or open a library</H2>
      <p className="mt-4">
        When you don&apos;t have a library open yet, you&apos;ll see a simple screen with a few big buttons.
      </p>
      <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">Figure: landing screen (add landing.png when ready).</p>
      <p className="mt-4">
        <strong>Typical paths:</strong>
      </p>
      <ol className="mt-3 list-decimal pl-6 space-y-2">
        <li>
          <strong>Create library in default location</strong> — quickest start if you&apos;re fine with the app&apos;s default
          spot.
        </li>
        <li>
          <strong>Create library…</strong> — you choose <strong>where</strong> the library file should live (and what it&apos;s
          called).
        </li>
        <li>
          <strong>Open library…</strong> — open an existing <code className="text-sm bg-gray-100 dark:bg-slate-900 px-1 rounded">.videomaster</code>{' '}
          (or library) file you already have.
        </li>
        <li>
          <strong>Open recent</strong> — shortcuts to libraries you used before.
        </li>
      </ol>
      <p className="mt-4">
        You can do the same things from the menu bar: <strong>File</strong> → <strong>New Library…</strong>,{' '}
        <strong>Open Library…</strong>, <strong>Open Recent</strong>, etc.
      </p>
      <blockquote className="mt-4 border-l-4 border-emerald-500 pl-4 text-gray-700 dark:text-gray-300">
        <strong>Tip:</strong> <strong>Settings → Application</strong> (appearance) is always available. Other tabs need an{' '}
        <strong>open library</strong>.
      </blockquote>

      <H2 id="main-window">Tour of the main window</H2>
      <p className="mt-4">
        The window splits <strong>vertically</strong> into two main areas (drag the <strong>vertical</strong> divider to change
        how wide the browser is vs. the detail pane). Inside the <strong>left</strong> area, a <strong>horizontal</strong>{' '}
        splitter separates the <strong>list or grid</strong> from the <strong>filter strip</strong> below it.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-slate-600">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="text-left p-3 font-semibold">Area</th>
              <th className="text-left p-3 font-semibold">What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Left — Browser</td>
              <td className="p-3">
                <strong>Top:</strong> <strong>Grid</strong> or <strong>list</strong> of videos; <strong>search</strong> is in
                the toolbar here. <strong>Bottom:</strong> <strong>Filter strip</strong> — four columns (
                <strong>Library</strong>, <strong>Collections</strong>, <strong>Rating</strong>, <strong>Tags</strong>) to choose
                which videos appear. You can <strong>collapse</strong> this strip to reclaim space (<strong>View</strong> menu{' '}
                <strong>⌥⌘F</strong>, or context menu on the list/grid). When collapsed, the strip has no height but the{' '}
                <strong>splitter</strong> stays so you can drag it back.
              </td>
            </tr>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Right — Detail</td>
              <td className="p-3">
                <strong>Preview</strong> on top (thumbnail or <strong>filmstrip</strong>), <strong>metadata and actions</strong>{' '}
                below (name, path, tags, ratings, <strong>custom metadata</strong>, play buttons, and more).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4">
        The <strong>toolbar</strong> above the browsing pane has things you&apos;ll use often: <strong>Add Folder</strong>,{' '}
        <strong>Import New</strong>, <strong>List / Grid</strong>, <strong>Surprise Me!</strong>, sorting, and (in list mode){' '}
        <strong>Columns</strong>. The <strong>status bar</strong> at the very bottom shows counts and import progress.
      </p>
      <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">
        Figure: toolbar and browsing area — toolbar.png or crop of main window when ready.
      </p>

      <H2 id="everyday">Everyday tasks</H2>

      <H3>Add folders (data sources)</H3>
      <p>
        VideoMaster only knows about videos inside <strong>folders you add</strong>.
      </p>
      <ol className="mt-3 list-decimal pl-6 space-y-2">
        <li>
          Click <strong>Add Folder</strong> in the toolbar (or <strong>File</strong> → <strong>Add Folder…</strong>, shortcut{' '}
          <strong>⇧⌘O</strong>).
        </li>
        <li>
          Choose one or more folders. The app will <strong>scan</strong> them for video files (see <strong>File extensions</strong>{' '}
          in Settings if something&apos;s missing).
        </li>
      </ol>
      <p className="mt-3">
        <strong>Import New</strong> rescans those folders for <strong>new</strong> files since the last time — handy after
        you&apos;ve dropped more clips onto a drive.
      </p>
      <p className="mt-2 italic text-gray-600 dark:text-gray-400">
        Why it matters: Without a data source, your library stays empty even if you have terabytes of video elsewhere.
      </p>

      <H3>Grid vs. list</H3>
      <p>Use the <strong>segmented control</strong> in the toolbar:</p>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          <strong>Grid</strong> — visual thumbnails; great for skimming.
        </li>
        <li>
          <strong>List</strong> — sortable columns; great for names, dates, and batch selection. Changing sort (toolbar or column
          headers) clears multi-selection; with exactly one video selected, the grid or list scrolls to that item.
        </li>
        <li>
          <strong>List columns</strong> — In <strong>Settings → Library</strong>, choose which standard metadata columns
          (duration, resolution, size, rating, date added, plays, created, last played) and which custom metadata fields appear.
          Name is always shown. <strong>Multiline Text</strong> custom fields are not available as list columns. In list mode,
          the toolbar <strong>Columns</strong> button opens the same options. Up to <strong>16</strong> custom fields can appear
          as columns at once (alphabetical order). You can still reorder and resize columns from the table header.
        </li>
      </ul>
      <p className="mt-3">Your choice is remembered.</p>
      <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">Figures: grid-view.png, list-view.png when ready.</p>

      <H3>Search</H3>
      <p>
        Type in the <strong>search field</strong> above the browsing pane. Search matches <strong>file names</strong> (and uses
        the app&apos;s full-text index when you&apos;re searching). Combine search with <strong>filter strip</strong> choices
        (library slice, collections, rating, tags) to narrow things down.
      </p>

      <H3>Library filter</H3>
      <p>In the <strong>Library</strong> column of the <strong>bottom filter strip</strong>, you&apos;ll see entries like:</p>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          <strong>All Videos</strong> — no extra filter.
        </li>
        <li>
          <strong>Recently Added</strong> / <strong>Recently Played</strong> / <strong>Top Rated</strong> — smart slices (you can
          tune windows and visibility in <strong>Settings → Library</strong>).
        </li>
        <li>
          <strong>Duplicates</strong> — files that look like duplicates by size and duration (a handy cleanup aid).
        </li>
        <li>
          <strong>Corrupt</strong> — files that never got useful duration/resolution metadata (often damaged or wrong type).
        </li>
        <li>
          <strong>Missing</strong> — files the library thinks should exist but aren&apos;t on disk anymore.
        </li>
      </ul>
      <p className="mt-3">
        Choosing <strong>Missing</strong> starts a scan for files that are no longer on disk. You can run{' '}
        <strong>Scan for missing files</strong> again from the toolbar while that filter is active.
      </p>
      <p className="mt-3">
        Which rows appear here is controlled in <strong>Settings → Library</strong> under <strong>Sidebar Filters</strong>.
      </p>

      <H3>Collections</H3>
      <p>
        <strong>Collections</strong> are saved groups built from <strong>rules</strong> (for example, &ldquo;tag contains
        Vacation&rdquo; AND rating ≥ 4). They appear under <strong>COLLECTIONS</strong> in the filter strip.
      </p>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          Click <strong>New Collection</strong> to build one.
        </li>
        <li>
          Right-click a collection to <strong>edit</strong> or <strong>delete</strong> it.
        </li>
      </ul>
      <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">Figure: collection-editor.png when ready.</p>

      <H3>Ratings</H3>
      <p>
        Under <strong>RATING</strong> in the filter strip, pick <strong>1–5 stars</strong> to filter to that rating (this is
        separate from <strong>Top Rated</strong> in the Library column). When a star filter is active,{' '}
        <strong>Remove Filter</strong> appears in the column header; <strong>View → Clear Filters</strong> (<strong>⌥⌘C</strong>)
        clears tag filters and this rating filter together when applicable. In the <strong>detail</strong> pane you can change the
        rating for the current selection (or multiple selected videos).
      </p>

      <H3>Tags</H3>
      <p>
        Under <strong>TAGS</strong> in the filter strip, click a <strong>tag</strong> to filter by it. Next to the header, the
        small <strong>ALL</strong> / <strong>ANY</strong> pill toggles whether videos must have <strong>every</strong> selected
        tag or <strong>at least one</strong>. The <strong>×</strong> button clears tag filters only.{' '}
        <strong>View → Clear Filters</strong> (<strong>⌥⌘C</strong>) clears <strong>both</strong> selected tags and an active
        per-star <strong>rating</strong> filter (when those filters are on).
      </p>
      <p className="mt-3">
        In the <strong>detail</strong> pane, tags show as <strong>chips</strong>: click to add or remove tags for the selected
        video(s). Active tags are easy to spot.
      </p>

      <H3>Play videos</H3>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          <strong>Play Video</strong> / inline player in the detail pane — watch inside the app; <strong>Space</strong> toggles
          play/pause when you&apos;re not typing in a field.
        </li>
        <li>
          <strong>Play in External Player</strong> — <strong>File</strong> menu or context menu; shortcut <strong>⌘Return</strong>{' '}
          opens the default app for that file.
        </li>
        <li>
          <strong>Filmstrip</strong> — switch the preview to a strip of frames; <strong>click a frame</strong> to start inline
          playback from that point.
        </li>
        <li>
          <strong>Surprise Me!</strong> — picks a random video from the <strong>current filtered list</strong>, scrolls to it,
          and can auto-play (see <strong>Settings → Video</strong>).
        </li>
      </ul>

      <H3>Rename</H3>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          <strong>Click the file name</strong> in the detail pane to edit, or press <strong>Return</strong> (Enter) with{' '}
          <strong>exactly one</strong> video selected in grid or list (when you&apos;re not already in a text field).
        </li>
        <li>
          <strong>Escape</strong> cancels rename.
        </li>
      </ul>

      <H3>Delete vs. remove from library</H3>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          <strong>Delete</strong> — moves the <strong>actual file</strong> to the <strong>Trash</strong> (subject to{' '}
          <strong>Confirm deletions</strong> in Settings).
        </li>
        <li>
          <strong>Remove from Library</strong> — removes the entry from the library <strong>without</strong> trashing the file on
          disk.
        </li>
      </ul>
      <p className="mt-3">
        Both are in context menus and the <strong>File</strong> menu. <strong>⌘Delete</strong> triggers delete (with confirmation
        if enabled). <strong>⇧⌘R</strong> removes from library.
      </p>

      <H3>Drag and drop</H3>
      <p>
        You can <strong>drop folders or files</strong> onto the browsing pane to import — useful when you already have Finder
        open.
      </p>

      <H3>Settings</H3>
      <p>
        Open <strong>VideoMaster → Settings…</strong> (standard macOS Settings window).
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-slate-600">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="text-left p-3 font-semibold">Tab</th>
              <th className="text-left p-3 font-semibold">What you&apos;ll find</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Application</td>
              <td className="p-3">
                <strong>Appearance:</strong> <strong>System</strong> (follow macOS light/dark), <strong>Light</strong>, or{' '}
                <strong>Dark</strong> (locks the app to that style).
              </td>
            </tr>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Library</td>
              <td className="p-3">
                Exclude corrupt files from most filters, confirm before delete, which <strong>Library</strong> filter-strip rows
                show (Recently Added, Duplicates, Missing, …) and their options. <strong>List view columns</strong> — which
                standard and custom metadata columns appear in list view (same choices as the toolbar <strong>Columns</strong>{' '}
                button). The bottom <strong>filter strip</strong> can be <strong>expanded</strong> or <strong>collapsed</strong>{' '}
                from the <strong>View</strong> menu (<strong>⌥⌘F</strong>), or via the context menu on the list/grid (when the
                strip has height, you can also use its context menu). Your <strong>saved splitter height</strong> for the strip is
                unchanged when you collapse. When collapsed, the strip has <strong>no height</strong>; the{' '}
                <strong>horizontal splitter</strong> remains so you can drag it to reveal filters again.{' '}
                <em>(Requires an open library.)</em>
              </td>
            </tr>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Video</td>
              <td className="p-3">
                Default <strong>filmstrip</strong> grid (rows × columns), regenerate filmstrips, <strong>Surprise Me!</strong>{' '}
                auto-play, <strong>maximum large preview thumbnail (long-edge)</strong>, <strong>auto adjust video pane</strong>{' '}
                toggle (splitter fits preview to media). <em>(Requires an open library.)</em>
              </td>
            </tr>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Data Sources</td>
              <td className="p-3">
                List of watched folders, add/remove, <strong>Show in Finder</strong>. <em>(Requires an open library.)</em>
              </td>
            </tr>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">File Ext</td>
              <td className="p-3">
                Which extensions count as video when scanning; add custom extensions or reset to defaults.{' '}
                <em>(Requires an open library.)</em>
              </td>
            </tr>
            <tr className="border-t border-gray-200 dark:border-slate-600">
              <td className="p-3 font-medium align-top">Custom Metadata</td>
              <td className="p-3">
                Define field <strong>names</strong> and <strong>types</strong> (String, Text, Number, Date, Date &amp; Time); add
                or remove definitions with <strong>+</strong> / <strong>−</strong>. Enter and edit values in the{' '}
                <strong>detail</strong> pane for selected video(s). Which fields appear as <strong>list</strong> columns is
                configured under <strong>Library</strong> (not here). <em>(Requires an open library.)</em>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">Figure: settings-library.png when ready.</p>

      <H2 id="troubleshooting">If something goes wrong</H2>
      <ul className="mt-4 list-disc pl-6 space-y-2">
        <li>
          <strong>Empty library</strong> — Add a <strong>data source</strong> folder and use <strong>Import New</strong>; check{' '}
          <strong>Settings → File Ext</strong> if your files use an unusual extension.
        </li>
        <li>
          <strong>Videos &ldquo;missing&rdquo;</strong> — You moved or deleted files outside the app; choose the{' '}
          <strong>Missing</strong> filter (it scans automatically), or use <strong>Scan for missing files</strong> in the toolbar
          to refresh, then fix paths or remove stale entries.
        </li>
        <li>
          <strong>Corrupt bucket</strong> — Those files lack normal metadata; they might not be real videos or need re-encoding.
          They&apos;re still visible under <strong>Corrupt</strong> even if hidden elsewhere.
        </li>
        <li>
          <strong>Weird window columns after a crash</strong> — Recent builds <strong>sanitize saved layout</strong>; if it ever
          happens again, drag dividers back once — values are clamped on save now.
        </li>
        <li>
          <strong>List view crashed while deleting</strong> — Update to the latest version; list scrolling was hardened against
          that crash.
        </li>
      </ul>
      <p className="mt-4">
        When in doubt, <strong>File</strong> → <strong>Open Library…</strong> and pick your library file again — you won&apos;t
        lose videos, only the app&apos;s window state might reset.
      </p>

      <H2 id="reference">Reference for experienced users</H2>

      <H3 id="shortcuts">Keyboard shortcuts</H3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-slate-600">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="text-left p-3 font-semibold">Shortcut</th>
              <th className="text-left p-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['⇧⌘S', 'Surprise Me!'],
              [
                '⌥⌘C',
                'Clear Filters — clears selected tag filters and an active per-star rating filter (View menu; disabled when neither applies)',
              ],
              ['⌥⌘T', 'Toggle Thumbnail / Filmstrip in the detail preview (same as the segmented control)'],
              ['⌥⌘F', 'Expand / collapse the bottom filter strip'],
              ['⌘Delete', 'Delete selected video(s) (confirmation if enabled)'],
              ['⇧⌘R', 'Remove selected from library'],
              ['⇧⌘O', 'Add Folder…'],
              ['⌘Return', 'Play in external player'],
              ['Return', 'Start rename (single selection, grid/list, not in a text field)'],
              ['Escape', 'Cancel rename, stop inline playback, or cancel tag rename'],
              ['Space', 'Play/pause inline player (when not typing in a text field)'],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-gray-200 dark:border-slate-600">
                <td className="p-3 font-mono text-xs whitespace-nowrap">{k}</td>
                <td className="p-3">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <strong>No shortcut today:</strong> <strong>Open Library…</strong> and <strong>Show in Finder</strong> are menu-only. On
        many Mac apps <strong>⌘O</strong> means &ldquo;Open…&rdquo; — VideoMaster does <strong>not</strong> assign{' '}
        <strong>⌘O</strong> to <strong>Open Library…</strong> yet; use the menu or landing buttons. <strong>⇧⌘O</strong> is{' '}
        <strong>Add Folder</strong>.
      </p>

      <H3 id="menu-map">Menu map (File-focused)</H3>
      <p className="mt-4">Under <strong>File</strong> (exact labels may vary slightly by OS language):</p>
      <ul className="mt-3 list-disc pl-6 space-y-2">
        <li>
          <strong>Add Folder…</strong> — add watched folder(s).
        </li>
        <li>
          <strong>Delete…</strong> / <strong>Remove from Library</strong> — selection actions.
        </li>
        <li>
          <strong>Play in External Player</strong> / <strong>Show in Finder</strong> / <strong>Open With</strong> — work with the
          current selection.
        </li>
        <li>
          <strong>Create library in default location</strong> / <strong>New Library…</strong> / <strong>Open Library…</strong> /{' '}
          <strong>Open Recent</strong> — library lifecycle.
        </li>
        <li>
          <strong>Save Copy…</strong> — backup library file.
        </li>
        <li>
          <strong>Close Library…</strong> / <strong>Delete This Library…</strong> — close or delete the <strong>database</strong>{' '}
          (not your video files).
        </li>
      </ul>
      <p className="mt-4">
        Other commands live under <strong>VideoMaster</strong> (About, Settings, etc.) and the <strong>View</strong> /{' '}
        <strong>Window</strong> menus as macOS provides. <strong>View</strong> includes <strong>Surprise Me!</strong>,{' '}
        <strong>Clear Filters</strong> (⌥⌘C, when tag or per-star rating filters are active),{' '}
        <strong>Toggle Thumbnail / Filmstrip</strong> (⌥⌘T), and <strong>Expand/Collapse Filter Strip</strong> (⌥⌘F).
      </p>

      <H3 id="glossary">Glossary</H3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-slate-600">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="text-left p-3 font-semibold w-44">Term</th>
              <th className="text-left p-3 font-semibold">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Library', "The app's database for one workspace: folders, metadata, tags, collections."],
              ['Data source', 'A folder on disk that VideoMaster scans for videos.'],
              ['Import New', "Rescan data sources for files that aren't in the library yet."],
              ['Filtered list', 'Whatever appears in the grid/list after filter strip + search rules — Surprise Me only picks from here.'],
              ['Filter strip', 'Bottom of the browser column: Library, Collections, Rating, Tags; can be collapsed (⌥⌘F).'],
              ['Custom metadata', 'User-defined fields (Settings); values edited in the detail pane; optional list columns.'],
              ['Collection', 'A saved smart group defined by rules.'],
              ['Corrupt (filter)', 'Videos missing both duration and resolution in metadata — often unusable clips.'],
              ['Duplicates (filter)', 'Same size and duration as another file — likely copies (verify before deleting).'],
              ['Missing (filter)', 'Library path no longer exists on disk.'],
              ['Filmstrip', 'Preview mode showing a grid of frames from the video.'],
              ['Inline playback', 'Playing inside the detail pane with the built-in player.'],
            ].map(([term, def]) => (
              <tr key={term} className="border-t border-gray-200 dark:border-slate-600">
                <td className="p-3 font-medium align-top">{term}</td>
                <td className="p-3">{def}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <H3 id="where-doc">Where this doc lives (repository)</H3>
      <ul className="mt-4 list-disc pl-6 space-y-2">
        <li>
          App repo guide: <code className="text-sm bg-gray-100 dark:bg-slate-900 px-1 rounded">docs/USER_GUIDE.md</code>
        </li>
        <li>
          Screenshot checklist: <code className="text-sm bg-gray-100 dark:bg-slate-900 px-1 rounded">docs/images/README.md</code>
        </li>
      </ul>

      <p className="mt-12 text-center text-gray-500 dark:text-gray-400 italic">
        Happy browsing — may your duplicates be few and your filmstrips load fast.
      </p>

      <p className="mt-8 text-center">
        <Link
          href="/other-fun-stuff/VideoMaster"
          className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
        >
          ← Back to VideoMaster overview
        </Link>
      </p>
    </>
  )
}
