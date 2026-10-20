# R219 — Owner-only live website information

Supabase migration `r219_admin_site_presence_footer` has already been applied to Neith Production.
No manual SQL step is required for the production project.

Behavior:
- Every normal website page sends a lightweight heartbeat every 30 seconds.
- A browser is considered active for 90 seconds after its last heartbeat.
- Authenticated members are counted by user ID; guests are counted by anonymous browser UUID.
- No IP address is stored by this feature.
- The Home footer information panel calls an owner-only RPC and remains completely hidden for non-owner accounts.
