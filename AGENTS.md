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

## Application architecture
- Keep the SHREE ADS portal on TanStack Start route files with shared UI and auth/data workflows in `src/components/portal.tsx`; use Lovable Cloud Auth, Postgres RLS, and private Storage rather than client-only authorization, because the portal manages payments and paid course media.
- Keep roles in database-owned `public.user_roles`; public signup creates students only, and administrator provisioning is trusted and out-of-band to prevent email-claim privilege escalation.
- Keep protected account pages under the authenticated layout and validate admin roles before rendering; RLS remains the data security boundary.
- Upload private videos with an authenticated Storage-issued signed URL and browser XMLHttpRequest byte progress; this preserves Storage policies while showing real transfer progress, separate from final save confirmation.
