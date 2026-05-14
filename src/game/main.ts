import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { GameScene } from "./scenes/GameScene";
import { AUTO, Game, Scale } from "phaser";

//  Pocket Crusader — Game Configuration
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: '100%',
    height: '100%',
    parent: "game-container",
    backgroundColor: "#3e2723",
    scale: {
        mode: Scale.RESIZE,
    },
    scene: [Boot, Preloader, GameScene],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
