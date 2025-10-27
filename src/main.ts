import './style.css';
import { Game } from './game/Game';

async function bootstrap() {
  const game = new Game();
  await game.start();
}

bootstrap().catch((error) => {
  console.error('Failed to start game', error);
});
