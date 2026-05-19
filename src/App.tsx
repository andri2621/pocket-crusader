import { useRef, useState, useEffect } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameStore } from "./store/useGameStore";
import styles from "./styles/App.module.css";
import { EventBus } from "./game/EventBus";
import { socket } from "./network/socketClient";

function BuildMenu({ wood, gold }: { wood: number, gold: number }) {
    const isOpen = useGameStore((s) => s.isBuildMenuOpen);
    const toggleMenu = useGameStore((s) => s.toggleBuildMenu);
    const setPlacing = useGameStore((s) => s.setPlacingBuilding);

    if (!isOpen) return null;

    const canAffordHut = wood >= 50;
    const canAffordHouse = wood >= 30;
    const canAffordBarracks = wood >= 50 && gold >= 50;

    return (
        <div className={styles.buildMenuOverlay} onClick={toggleMenu}>
            <div className={styles.buildMenuPanel} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.buildMenuTitle}>Build</h3>
                <div className={styles.buildCardList}>
                    <button
                        className={`${styles.buildCard} ${!canAffordHouse ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordHouse}
                        onClick={() => { if (canAffordHouse) setPlacing('house'); }}
                    >
                        <span className={styles.buildCardLabel}>House</span>
                        <span className={styles.buildCardCost}>🪵 30</span>
                    </button>
                    <button
                        className={`${styles.buildCard} ${!canAffordHut ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordHut}
                        onClick={() => { if (canAffordHut) setPlacing('woodcutter_hut'); }}
                    >
                        <span className={styles.buildCardLabel}>Woodcutter&apos;s Hut</span>
                        <span className={styles.buildCardCost}>🪵 50</span>
                    </button>
                    <button
                        className={`${styles.buildCard} ${!canAffordHut ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordHut}
                        onClick={() => { if (canAffordHut) setPlacing('gold_hut'); }}
                    >
                        <span className={styles.buildCardLabel}>Gold Hut</span>
                        <span className={styles.buildCardCost}>🪵 50</span>
                    </button>
                    <button
                        className={`${styles.buildCard} ${!canAffordBarracks ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordBarracks}
                        onClick={() => { if (canAffordBarracks) setPlacing('barracks'); }}
                    >
                        <span className={styles.buildCardLabel}>Barracks</span>
                        <span className={styles.buildCardCost}>🪵 50 💰 50</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function SelectionPanel() {
    const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
    const selectedBuildingType = useGameStore((s) => s.selectedBuildingType);
    const selectedUnitId = useGameStore((s) => s.selectedUnitId);
    const selectedUnitType = useGameStore((s) => s.selectedUnitType);
    const trainingQueue = useGameStore((s) => s.trainingQueue);
    const trainingProgress = useGameStore((s) => s.trainingProgress);
    const gold = useGameStore((s) => s.gold);
    const availableWorkers = useGameStore((s) => s.availableWorkersCount);

    // ── Warrior Disband Panel ──
    if (selectedUnitType === 'warrior' && selectedUnitId) {
        const handleDisband = () => {
            EventBus.emit('disband_warrior', selectedUnitId);
        };

        return (
            <div className={styles.selectionPanel}>
                <div className={styles.selectionContent}>
                    <div className={styles.portraitContainer}>
                        <img src="assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" className={styles.portraitImage} alt="Warrior" />
                    </div>
                    <div className={styles.selectionInfo}>
                        <h3 className={styles.selectionTitle}>Warrior</h3>
                        <div className={styles.selectionActions}>
                            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDisband}>
                                Disband
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Barracks Panel ──
    if (!selectedBuildingId) return null;

    const handleTrainWarrior = () => {
        // Safety Net: Must keep at least 1 worker in the economy
        if (gold >= 20 && availableWorkers > 1) {
            useGameStore.getState().addGold(-20);
            EventBus.emit('train_warrior', selectedBuildingId);
        }
    };

    const handleCancelTraining = (index: number) => {
        EventBus.emit('cancel_training', { id: selectedBuildingId, index });
    };

    // Calculate circumference for SVG circle (r=22, c=2*pi*r)
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (trainingProgress * circumference);

    // Safety net: disable if only 1 worker left or no gold
    const canTrain = gold >= 20 && availableWorkers > 1;
    const safetyWarning = availableWorkers <= 1 && gold >= 20;

    if (selectedBuildingType === 'barracks') {
        const warriorCount = trainingQueue.filter(u => u === 'warrior').length;

        return (
            <div className={styles.selectionPanel}>
                <div className={styles.selectionContent}>
                    {/* Portrait & Progress */}
                    <div className={styles.portraitContainer}>
                        <img src="assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" className={styles.portraitImage} alt="Warrior" />
                        {trainingQueue.length > 0 && (
                            <svg className={styles.progressRing} width="52" height="52">
                                <circle
                                    stroke="rgba(0,0,0,0.3)"
                                    strokeWidth="4"
                                    fill="transparent"
                                    r={radius}
                                    cx="26"
                                    cy="26"
                                />
                                <circle
                                    stroke="#00aaff"
                                    strokeWidth="4"
                                    fill="transparent"
                                    r={radius}
                                    cx="26"
                                    cy="26"
                                    style={{
                                        strokeDasharray: `${circumference} ${circumference}`,
                                        strokeDashoffset: strokeDashoffset,
                                        transform: 'rotate(-90deg)',
                                        transformOrigin: '50% 50%',
                                        transition: 'stroke-dashoffset 0.1s linear'
                                    }}
                                />
                            </svg>
                        )}
                        {warriorCount > 1 && (
                            <div className={styles.stackBadge}>x{warriorCount}</div>
                        )}
                    </div>

                    {/* Actions & Info */}
                    <div className={styles.selectionInfo}>
                        <h3 className={styles.selectionTitle}>Barracks</h3>
                        <div className={styles.selectionActions}>
                            <button 
                                className={`${styles.actionBtn} ${!canTrain ? styles.actionBtnDisabled : ''}`}
                                disabled={!canTrain}
                                onClick={handleTrainWarrior}
                            >
                                <img src="assets/tiny-swords/UI Elements/UI Elements/Icons/sword.png" alt="Train" className={styles.btnIconImg} />
                                Train 
                                <span className={styles.btnCost}>(20 <img src="assets/tiny-swords/UI Elements/UI Elements/Icons/coin.png" alt="Gold" className={styles.btnIconSmallImg} />)</span>
                            </button>
                        </div>
                        {safetyWarning && (
                            <div className={styles.safetyWarning}>Need at least 1 worker for economy</div>
                        )}
                    </div>

                    {/* Queue Strip */}
                    {trainingQueue.length > 0 && (
                        <div className={styles.queueStrip}>
                            <div className={styles.queueLabel}>Queue</div>
                            <div className={styles.queueList}>
                                {trainingQueue.map((unit, idx) => (
                                    <div key={idx} className={styles.queueItem} onClick={() => handleCancelTraining(idx)}>
                                        <img src="assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" alt={unit} />
                                        <div className={styles.queueItemCancel}>✕</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(true);
    const wood = useGameStore((state) => state.wood);
    const gold = useGameStore((state) => state.gold);
    const currentPop = useGameStore((state) => state.currentPopulation);
    const maxPop = useGameStore((state) => state.maxPopulation);
    const workerCount = useGameStore((state) => state.workerCount);
    const warriorCount = useGameStore((state) => state.warriorCount);
    const isPlacing = useGameStore((state) => state.isPlacingBuilding);
    const setMultiplayerState = useGameStore((state) => state.setMultiplayerState);

    const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
    const [lobbyStatus, setLobbyStatus] = useState<string>('');
    const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

    useEffect(() => {
        // Initialize Socket.IO only once on the client
        if (!socket.connected) {
            socket.connect();
            
            socket.on('connect', () => {
                console.log('[Socket] Connected:', socket.id);
            });

            socket.on('room_created', (data: { roomId: string, faction: 'blue' | 'red', isHost: boolean }) => {
                setCreatedRoomId(data.roomId);
                setLobbyStatus('Waiting for another player...');
                setMultiplayerState(data.roomId, data.isHost, data.faction);
            });

            socket.on('room_joined', (data: { roomId: string, faction: 'blue' | 'red', isHost: boolean }) => {
                setLobbyStatus('Joined room! Waiting for host...');
                setMultiplayerState(data.roomId, data.isHost, data.faction);
            });

            socket.on('room_ready', async (data: { roomId: string, players: any[] }) => {
                setLobbyStatus('Room is ready! Starting game...');
                await requestFullscreenAndLock();
                setHasStarted(true);
                setIsFullscreen(true);
            });

            socket.on('room_error', (data: { message: string }) => {
                setLobbyStatus(data.message);
                setCreatedRoomId(null);
            });
        }
        
        return () => {
            // Clean up on unmount if needed, but we usually want to keep it alive
        };
    }, []);

    const generateRandomRoomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleCreateRoom = () => {
        const newRoomId = generateRandomRoomCode();
        setLobbyStatus('Creating room...');
        socket.emit('create_room', newRoomId);
    };

    const handleJoinRoom = () => {
        if (joinRoomIdInput.trim().length !== 4) {
            setLobbyStatus('Room code must be 4 characters.');
            return;
        }
        setLobbyStatus('Joining room...');
        socket.emit('join_room', joinRoomIdInput.toUpperCase());
    };

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

    const handleResumeClick = async () => {
        await requestFullscreenAndLock();
        // The event listener will automatically update `isFullscreen`
    };

    const currentScene = (scene: Phaser.Scene) => {
        console.log('[Pocket Crusader] Active scene:', scene.scene.key);
    };

    return (
        <div id="app" style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* Landing Page Lobby */}
            {!hasStarted && (
                <div className={styles.container}>
                    <div className={styles.panel}>
                        <div className={styles.content}>
                            <h1 className={styles.title}>Pocket Crusader</h1>
                            <p className={styles.subtitle}>Mobile-First Multiplayer RTS</p>
                            
                            {!createdRoomId ? (
                                <div className={styles.lobbyActions}>
                                    <button className={styles.lobbyBtnPrimary} onClick={handleCreateRoom}>
                                        Create Room
                                    </button>
                                    
                                    <div className={styles.dividerText}>OR</div>
                                    
                                    <div className={styles.joinContainer}>
                                        <input 
                                            type="text" 
                                            placeholder="Room Code" 
                                            maxLength={4}
                                            value={joinRoomIdInput}
                                            onChange={(e) => setJoinRoomIdInput(e.target.value.toUpperCase())}
                                            className={styles.lobbyInput}
                                        />
                                        <button className={styles.lobbyBtnSecondary} onClick={handleJoinRoom}>
                                            Join
                                        </button>
                                    </div>
                                    {lobbyStatus && <p className={styles.lobbyStatus}>{lobbyStatus}</p>}
                                </div>
                            ) : (
                                <div className={styles.waitingContainer}>
                                    <h2 className={styles.roomCodeDisplay}>Room: {createdRoomId}</h2>
                                    <p className={styles.lobbyStatus}>{lobbyStatus}</p>
                                </div>
                            )}
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
                        {/* Resources Section */}
                        <div className={styles.hudSection}>
                            <div className={styles.hudItem}>
                                <img src="assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.hudIconImg} />
                                <span className={styles.hudValue}>{wood}</span>
                            </div>
                            <div className={styles.hudItem} style={{ marginLeft: '12px' }}>
                                <img src="assets/tiny-swords/UI Elements/UI Elements/Icons/coin.png" alt="Gold" className={styles.hudIconImg} />
                                <span className={styles.hudValue}>{gold}</span>
                            </div>
                        </div>

                        <div className={styles.hudDivider} />

                        {/* Population Section */}
                        <div className={styles.hudSection}>
                            <div className={styles.hudItem}>
                                <img src="assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png" alt="Gold" className={styles.hudIconImg} />
                                <span className={styles.hudValue}>{currentPop}/{maxPop}</span>
                            </div>
                        </div>

                        <div className={styles.hudDivider} />

                        {/* Build Button */}
                        <button className={styles.hudBuildBtn} onClick={() => useGameStore.getState().toggleBuildMenu()}>
                            <img src="assets/tiny-swords/UI Elements/UI Elements/Icons/hammer.png" alt="Build" className={styles.hudIconImg} />
                        </button>
                    </div>

                    {/* Quick Action Sidebar (Layout Only) */}
                    <div className={styles.quickSidebar}>
                        <div className={styles.quickSidebarItem}>
                            <img src="assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png" alt="Workers" />
                            <div className={styles.stackBadge}>{workerCount}</div>
                        </div>
                        <div className={styles.quickSidebarItem}>
                            <img src="assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" alt="Warriors" />
                            <div className={styles.stackBadge}>{warriorCount}</div>
                        </div>
                    </div>

                    {/* Selection Panel */}
                    {!isPlacing && <SelectionPanel />}

                    {/* Placement Mode Indicator */}
                    {isPlacing && (
                        <div className={styles.placementBar}>
                            Tap the map to place · <button onClick={() => useGameStore.getState().setPlacingBuilding(null)}>Cancel</button>
                        </div>
                    )}

                    {/* Build Menu */}
                    <BuildMenu wood={wood} gold={gold} />
                </>
            )}
        </div>
    );
}

export default App;
