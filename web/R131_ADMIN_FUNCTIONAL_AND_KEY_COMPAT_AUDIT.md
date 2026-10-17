# R131 — Admin functional + key compatibility audit

- Auditoría estática de todos los `data-*` del Admin Center: los controles funcionales están referenciados por los scripts del panel.
- Auditoría de RPC usados por Admin Center: todos los RPC invocados por `admin.js`, `admin-commercial-r120.js`, `admin-insights-r129.js` y `admin-operations-r130.js` existen en Supabase.
- Corregida incompatibilidad real entre generación flexible de claves y `neith_redeem_key`: ahora las claves administrativas de días, meses y años dentro de los límites admitidos se canjean desde el launcher.
- Claves administrativas = claves PREMIUM de un solo uso. El panel lo explica explícitamente.
- Generación de clave verificada contra el inventario tras crearla.
- Notificaciones visuales añadidas a crear/copiar/revocar/eliminar clave y a las acciones comerciales/operativas.
- El launcher 1.1.234 ya contiene `Menú > Claves Neith`, el canje contra `neith_redeem_key`, toast de éxito y diálogo posterior de activación de PC. No requiere cambio de interfaz para esta compatibilidad.

- Protección añadida: una cuenta con PREMIUM permanente no consume ni degrada una clave temporal; el backend devuelve un mensaje claro y conserva la clave sin canjear.
- El canje sigue siendo de cuenta primero y activación del PC después, tal como ya implementa el launcher 1.1.234 mediante diálogo de activación y toast de éxito.
