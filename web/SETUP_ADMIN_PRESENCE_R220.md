# R220 Owner Live Website Operations

Already applied to Neith Production.

- Realtime INSERT/DELETE presence events through Supabase Realtime.
- 12-second low-cost heartbeat as crash/reconnect safety.
- Active visitor timeout: 30 seconds.
- Owner-only SELECT policy on the live presence table.
- Owner-only snapshot RPC with richer metrics.
- No IP address is stored.
- Fast initial snapshot: it no longer waits for the heartbeat before loading.
- Safety refresh every 5 seconds in case a browser closes without a clean leave event.
