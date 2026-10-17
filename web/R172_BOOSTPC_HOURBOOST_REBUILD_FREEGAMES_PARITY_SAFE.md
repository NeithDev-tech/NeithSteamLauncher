# R172 — BOOST PC HOURBOOST REBUILD + FREE GAMES PARITY SAFE

- Boost PC reconstruido desde cero tomando Hour Boost como referencia de jerarquía, densidad y estilo.
- Eliminado el diseño R171 de Boost PC.
- Nuevo intro/summary, funcionamiento, Command Center y FREE/PREMIUM.
- Tipografía y tarjetas más compactas y comerciales.
- Corregida la causa de que `_PROBAR_WEB.bat` mostrase solo el fallback de GamerPower: el servidor local ahora expone `/api/free-games`.
- El endpoint local consulta GamerPower, Epic y Prime/Luna con caché y deduplicación, por lo que ya no queda limitado a las 4 filas del fallback directo del navegador.
- Producción conserva el endpoint serverless multi-source ya incluido.
- Build: `NEITH_WEB_V34_R172`.
