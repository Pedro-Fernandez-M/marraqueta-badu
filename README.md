# 🥖 La Marraqueta de Badu Lake

Sitio estático dedicado a la marraqueta que nunca se abrió: la historia, la receta real
de pan batido y el **Simulador de Marraqueta 3000**.

## Contenido

- **Historia** — la leyenda de los cuatro panes unidos, en seis capítulos.
- **Receta** — marraqueta / pan batido para 8 unidades, con los dos puntos donde
  Badu se fue a las pailas (el amasado y el vapor del horno).
- **Tres juegos** en pestañas:
  - **Simulador de Marraqueta 3000** — amasar (machacar), marcar (timing) y hornear
    (control de temperatura). Puntaje 0–100, rango de S a F, récord en `localStorage`.
  - **Libera a los panes** — puzzle de 5 niveles. Cada trazo define una recta infinita
    que parte todas las piezas que cruza; ganas cuando cada pieza tiene un solo pan.
    Cortar un pan por el centro cuenta como herido y descuenta.
  - **Marraqueta Tycoon** — clicker con 8 mejoras, producción por segundo, ganancia
    mientras no estás (máx. 2 h al 50%) y partida guardada. Contratar a Badu duplica
    la producción pero bota el 40% de los panes: neto ×1,20.

## Estructura

```
marraqueta-badu/
├── index.html
├── css/styles.css
├── js/arcade.js    ← pestañas y registro de juegos (onShow/onHide)
├── js/juego.js     ← Simulador de Marraqueta 3000
├── js/libera.js    ← Libera a los panes (canvas + corte de polígonos)
├── js/tycoon.js    ← Marraqueta Tycoon
├── js/main.js      ← animaciones de la página
└── img/marraqueta-badu.png   ← la evidencia fotográfica
```

Cada juego se registra en `window.Arcade` y puede pausarse cuando su pestaña se
oculta. El simulador vuelve al inicio si cambias de pestaña a mitad de partida.

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
