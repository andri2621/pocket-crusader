import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  Boot Scene loads minimal assets needed for the Preloader UI.
        //  For now, we have no special preloader background, so just proceed.
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
