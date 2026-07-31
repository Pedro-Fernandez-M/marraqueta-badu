# 🥖 La Marraqueta de Badu Lake

Sitio estático dedicado a la marraqueta que nunca se abrió: la historia, la receta real
de pan batido y el **Simulador de Marraqueta 3000**.

## Contenido

- **Historia** — la leyenda de los cuatro panes unidos, en seis capítulos.
- **Receta** — marraqueta / pan batido para 8 unidades, con los dos puntos donde
  Badu se fue a las pailas (el amasado y el vapor del horno).
- **Juego** — tres etapas: amasar (machacar), marcar (timing) y hornear (control de
  temperatura). Puntaje 0–100, rango de S a F y récord guardado en `localStorage`.

## Estructura

```
marraqueta-badu/
├── index.html
├── css/styles.css
├── js/juego.js     ← lógica del minijuego
├── js/main.js      ← animaciones de la página
└── img/marraqueta-badu.png   ← la evidencia fotográfica
```

## La foto

La foto original del horno vive en `img/marraqueta-badu.png`.
Si el archivo falta, la página muestra un marcador en su lugar y no se rompe.

## Correr en local

No necesita build. Cualquier servidor estático sirve:

```bash
npx serve .
```

O abrir `index.html` directo en el navegador.

## Deploy en Vercel

Es HTML/CSS/JS plano, así que Vercel lo detecta como sitio estático sin configuración.

```bash
npx vercel --prod
```

O desde vercel.com: *Add New → Project → importar el repo → Deploy*.

---

Sin dependencias, sin build, sin frameworks. Solo harina.
