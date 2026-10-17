# R124 — Local test version-invariant root fix

- `_PROBAR_WEB.bat` no contiene una revision fija.
- `_neith_local_server.py` obtiene build/revision de `NEITH_BUILD.txt` y `NEITH_REVISION.txt`.
- Se elimina la causa raiz del falso negativo al crear una revision nueva.
- La autoprueba HTTP sigue validando recursos criticos antes de abrir el navegador.
