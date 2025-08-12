# Flappy Plane — Yandex Games

- HTML5 game prepared for Yandex Games SDK moderation.
- Uses relative SDK `/sdk.js` when uploaded as an archive, with fallback to `https://yandex.ru/games/sdk/v2` for iframe/local dev.

How to run locally:
- Serve statically (e.g., `python3 -m http.server 8080` in `/workspace`) and open `http://localhost:8080/`.

Deployment to Yandex Games:
- Upload the built archive and ensure the SDK file is not bundled; Yandex will inject `/sdk.js`.
- Create leaderboard with technical name `flappy_plane_best`.