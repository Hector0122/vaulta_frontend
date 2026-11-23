# Vaulta Estudio — preparar publicaciones de Instagram

## Objetivo

Armar una publicación dentro de Vaulta, ver cómo se vería en Instagram y dejar todo
listo para subirla **a mano** (Vaulta no publica nada por sí sola).

---

## v1 ✅ Probada en emulador (falta probar Instagram en teléfono real)

| # | Pieza | Archivos |
|---|---|---|
| 1 | Borradores guardados solo en el teléfono (MMKV, clave `estudio-drafts`) | `api/estudio.ts` |
| 2 | Pestaña **Estudio**: lista de borradores (pendiente / publicada) | `pages/Estudio/index.tsx`, `App.tsx` |
| 3 | Botón **Estudio** en la barra de selección de Fotos (1–10 fotos, sin videos) | `components/SelectionBar.tsx`, `pages/Home/index.tsx` |
| 4 | Pantalla del borrador: vista previa tipo Instagram (carrusel, puntitos, caption), formato 4:5 / 1:1 | `pages/Estudio/DraftView.tsx` |
| 5 | **Preparar para subir**: copia el caption, descarga las fotos y abre el menú de compartir | `pages/Estudio/DraftView.tsx` |

Dependencia nueva: `@react-native-clipboard/clipboard` (copiar el caption).

### Flujo

```
Fotos → seleccionar 1–10 → Estudio → borrador
  → escribir caption, elegir 4:5 o 1:1, revisar vista previa
  → Preparar para subir → (caption copiado) → Instagram → pegar caption
  → Marcar como publicada
```

---

## Ideas para publicar ✅ Probada en emulador

Tarjetas arriba de la lista de Estudio (`api/estudioIdeas.ts`). Sin tags ni IA:

| Tarjeta | Fuente |
|---|---|
| Hace X años (#tbt) | `photos/this-day` + fotos de ese día (rango en UTC, igual que el backend) |
| Tus favoritas | `favorites=true` |
| Con <persona> (top 2 por nº de fotos) | `faces/people` + `person=` |
| Esta semana | `dateFrom` = hace 7 días |

Filtros (`pickForPost`): sin borrosas, privadas, videos ni fotos ya usadas en borradores;
una foto por ráfaga (< 1 min); máximo 10. Tocar una tarjeta crea el borrador con caption
inicial, o reabre el existente si ya hay uno con esas mismas fotos.

---

## Fuera de la v1 (ideas para después)

- Recorte real a 4:5 / 1:1 (hoy la vista previa solo muestra el marco; Instagram recorta al subir)
- Reordenar fotos del carrusel
- Captions / hashtags con IA
- Reels y videos
- Programar publicaciones
- Sincronizar borradores con el backend (entre dispositivos)
