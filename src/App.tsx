import { useRef, useState, useEffect } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameStore } from "./store/useGameStore";
import styles from "./styles/App.module.css";

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const wood = useGameStore((state) => state.wood);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        };
    }, []);

    const requestFullscreenAndLock = async () => {
        // Request Fullscreen
        try {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.warn("Fullscreen request failed:", err);
        }

        // Lock Orientation to Landscape
        try {
            const orientation = screen.orientation as any;
            if (orientation && orientation.lock) {
                await orientation.lock("landscape");
            }
        } catch (err) {
            console.warn("Orientation lock failed:", err);
        }
    };

    const handlePlayClick = async () => {
        await requestFullscreenAndLock();
        setHasStarted(true);
        setIsFullscreen(true); // Optimistically set to true
    };

    const handleResumeClick = async () => {
        await requestFullscreenAndLock();
        // The event listener will automatically update `isFullscreen`
    };

    const currentScene = (scene: Phaser.Scene) => {
        console.log('[Pocket Crusader] Active scene:', scene.scene.key);
    };

    return (
        <div id="app" style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* Landing Page */}
            {!hasStarted && (
                <div className={styles.container}>
                    <div className={styles.panel}>
                        <div className={styles.content}>
                            <h1 className={styles.title}>Pocket Crusader</h1>
                            <p className={styles.subtitle}>A Mobile-First RTS Experience</p>
                            <button className={styles.playButton} onClick={handlePlayClick}>
                                Play Game
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Fullscreen Recovery Overlay */}
            {hasStarted && !isFullscreen && (
                <div className={styles.overlay}>
                    <div className={styles.panel}>
                        <div className={styles.content}>
                            <h2 className={styles.title} style={{ fontSize: '32px' }}>Game Paused</h2>
                            <p className={styles.subtitle}>Please return to fullscreen to continue playing.</p>
                            <button className={styles.playButton} onClick={handleResumeClick}>
                                Resume
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Phaser Game Canvas */}
            {hasStarted && (
                <>
                    <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
                    
                    {/* Game HUD Overlay */}
                    <div className={styles.hud}>
                        <div className={styles.hudItem}>
                            <span className={styles.hudIcon}>🪵</span>
                            <span className={styles.hudValue}>{wood}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default App;
