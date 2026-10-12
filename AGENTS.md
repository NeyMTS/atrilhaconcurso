<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Study records use validated typed payloads in owner-scoped study_items; this keeps contest structures extensible without code changes.
- Timer transitions execute atomically through an authenticated PostgreSQL function and a one-active-session unique index; server timestamps prevent duplicate minutes across devices.
- Public content routes render a signed-out empty workspace and only fetch private data through authenticated server functions; this preserves SSR without exposing records.
- Shared study is represented by explicit confirmed topic links and one session with multiple contest IDs; global totals must count each session once.
- Official references are bundled as source-attributed extracted catalog data and explicitly imported transactionally; no study activity is seeded.
- Backup restoration is an authenticated transactional merge by stable IDs; existing records are never silently replaced.

- Institutional marks are rendered by the shared InstitutionMark component from source-attributed official asset pointers, with an icon fallback; this prevents fabricated branding across contest views.
- Weekly schedules are one owner-scoped study_items row of kind 'schedule' holding config plus blocks; completion links existing timer sessions instead of creating study time, so hours are never duplicated.
- Weekly schedules are one owner-scoped study_items row of kind 'schedule' holding config plus blocks; completion links existing timer sessions instead of creating study time, so hours are never duplicated.
