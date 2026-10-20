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
- Keep student/admin role assignment in database-owned `public.user_roles` logic and never trust UI role state; the configured owner email gains admin access through the auth lifecycle trigger.
