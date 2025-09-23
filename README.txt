Web based UI for 0·1 (Zero Point One), the 2026 CodeCup game.

Requires node.js. Build with vite.

To build/run:

% npm install
% npm run dev    # starts development server
% npm build      # builds static files

The app consists of four separate pages (which share common code):

    - index.html allows loading a game, from a state string or a sequence of moves.
    - play.html allows playing a game.
    - edit.html allows editing a game state (not subject to move restrictions)
    - view.html allows viewing a game transcript.
