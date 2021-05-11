# NGU-INDUSTRIES-optimizer
Web based optimizer for the game NGU INDUSTRIES

You can play around with it on [Github.io](https://plasma119.github.io/NGU-INDUSTRIES-optimizer/) now!

Usage:
1. Select what types of beacon to use for optimization.
2. Select map.
3. Disable/Enable tiles by clicking on it.
4. Select optimize strategy ('sum' is overall production, 'max' is single tile production for infinite resources).
5. Press 'optimize' button.
6. Press 'optimize' button again to stop optimizing.

Score for each tile is calculated as: base * speed * production / cost.

Maximum speed/prod. is the maximum effective value(target) of effect on a single tile. It will recieve a small bonus score on reaching it. e.g. A tile with speed effect > 2 but with a max speed = 2 would recieve a speed score of 2 + bonus.

Minimum cost is the minimum effective value for cost beacon on a single tile, works similar to maximum speed/prod.

Saved filename is formatted as: NGU_industries_(date)_(map)_(score)_(max speed)_(max prod.)_(min cost).json

All images used are taken from the game.
Rendered using my own GUI library with [REGL](https://github.com/regl-project/regl) for webgl renderer
