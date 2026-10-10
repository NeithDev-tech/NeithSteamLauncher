# R122 — Local test Windows root fix

- Eliminada la validación duplicada de `NEITH_BUILD.txt` mediante `FINDSTR` en `_PROBAR_WEB.bat`.
- La marca de build se valida únicamente en `_neith_local_server.py`, leyendo UTF-8/UTF-8-BOM y normalizando espacios/saltos de línea.
- Esto evita falsos negativos de `FINDSTR` en Windows aunque el contenido visible del marcador sea correcto.
- Marca actual: `NEITH_WEB_V34_R122`.
- Sin cambios visuales, comerciales, ADMIN ni PayPal.
