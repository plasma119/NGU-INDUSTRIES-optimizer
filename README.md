# NGU-INDUSTRIES-optimizer
Web based optimizer for the game NGU INDUSTRIES

You can play around with it on [Github.io](https://plasma119.github.io/NGU-INDUSTRIES-optimizer/) now!

Usage:
1. Select what types of beacon to use for optimization
2. Select map
3. Disable/Enable tiles by clicking on it
4. Select optimize strategy ('sum' is overall production, 'max' is single tile production for infinite resources)
5. Press 'optimize' button
6. Press 'optimize' button again if you want to squeeze more performance in expense of time

Score for each tile is calculated as: base production * speed * production / cost

All images used are taken from the game.
Rendered using my own GUI library with [REGL](https://github.com/regl-project/regl) for webgl renderer
~~although this project currently only uses the canvas2D renderer~~
