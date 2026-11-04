# Interfaz y specs

**TLDR:** La página está en `index.html` y el spec vigente en `openspec/specs/chat-interface/spec.md`. El botón sigue diciendo `Send`. El login de Auth0 solo aparece si `/auth/config` dice `enabled`.

La interfaz vive en `index.html`. El transcript scrollea solo; el compositor queda fijo debajo. Las etiquetas son `Nombre` y `Mensaje`; el botón sigue diciendo `Send`.

Los cambios de comportamiento se especifican en OpenSpec. Los deltas están en `openspec/changes/` y, al archivar, pasan a `openspec/changes/archive/YYYY-MM-DD-<nombre>/`. El spec vigente de la página es `openspec/specs/chat-interface/spec.md`. Un cambio de una sola página puede omitir `design.md`. Si el usuario pide sincronizar al archivar, copia los requisitos del delta al spec principal antes de mover la carpeta.
