import { useRef, useState, useEffect } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { useGameStore } from "./store/useGameStore";
import styles from "./styles/App.module.css";
import { EventBus } from "./game/EventBus";
import { socket } from "./network/socketClient";
import { BALANCE_CONFIG, AI_DIFFICULTIES } from "./game/config/BalanceConfig";

function BuildMenu({ wood, gold }: { wood: number, gold: number }) {
    const isOpen = useGameStore((s) => s.isBuildMenuOpen);
    const toggleMenu = useGameStore((s) => s.toggleBuildMenu);
    const setPlacing = useGameStore((s) => s.setPlacingBuilding);

    if (!isOpen) return null;

    const houseWood = BALANCE_CONFIG.buildings.house.wood;
    const hutWood = BALANCE_CONFIG.buildings.woodcutter_hut.wood;
    const barracksWood = BALANCE_CONFIG.buildings.barracks.wood;
    const barracksGold = BALANCE_CONFIG.buildings.barracks.gold;

    const canAffordHouse = wood >= houseWood;
    const canAffordWoodHut = wood >= hutWood;
    const canAffordGoldHut = wood >= hutWood;
    const canAffordBarracks = wood >= barracksWood && gold >= barracksGold;

    return (
        <div className={styles.buildMenuOverlay} onClick={toggleMenu}>
            <div className={styles.buildMenuPanel} onClick={(e) => e.stopPropagation()}>
                <div className={styles.buildMenuHeader}>
                    <h3 className={styles.buildMenuTitle}>Build Structure</h3>
                    <button className={styles.closeBtn} onClick={toggleMenu} title="Close" />
                </div>
                
                <div className={styles.buildCardGrid}>
                    {/* House Card */}
                    <button
                        className={`${styles.buildCard} ${!canAffordHouse ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordHouse}
                        onClick={() => { if (canAffordHouse) setPlacing('house'); }}
                    >
                        <span className={styles.buildCardLabel}>House (+5 Pop)</span>
                        <div className={styles.buildCardCostRow}>
                            <span className={styles.costPill}>
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.costIcon} />
                                {houseWood}
                            </span>
                        </div>
                    </button>

                    {/* Woodcutter Hut */}
                    <button
                        className={`${styles.buildCard} ${!canAffordWoodHut ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordWoodHut}
                        onClick={() => { if (canAffordWoodHut) setPlacing('woodcutter_hut'); }}
                    >
                        <span className={styles.buildCardLabel}>Woodcutter Hut</span>
                        <div className={styles.buildCardCostRow}>
                            <span className={styles.costPill}>
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.costIcon} />
                                {hutWood}
                            </span>
                        </div>
                    </button>

                    {/* Gold Hut */}
                    <button
                        className={`${styles.buildCard} ${!canAffordGoldHut ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordGoldHut}
                        onClick={() => { if (canAffordGoldHut) setPlacing('gold_hut'); }}
                    >
                        <span className={styles.buildCardLabel}>Gold Hut</span>
                        <div className={styles.buildCardCostRow}>
                            <span className={styles.costPill}>
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.costIcon} />
                                {hutWood}
                            </span>
                        </div>
                    </button>

                    {/* Barracks */}
                    <button
                        className={`${styles.buildCard} ${!canAffordBarracks ? styles.buildCardDisabled : ''}`}
                        disabled={!canAffordBarracks}
                        onClick={() => { if (canAffordBarracks) setPlacing('barracks'); }}
                    >
                        <span className={styles.buildCardLabel}>Barracks</span>
                        <div className={styles.buildCardCostRow}>
                            <span className={styles.costPill}>
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.costIcon} />
                                {barracksWood}
                            </span>
                            <span className={styles.costPill}>
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/coin.png" alt="Gold" className={styles.costIcon} />
                                {barracksGold}
                            </span>
                        </div>
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
    const resources = useGameStore((s) => s.resources[s.faction] || s.resources['blue']);
    const gold = resources.gold;
    const availableWorkers = resources.availableWorkersCount;

    // ── 1. Worker Selected Panel ──
    if (selectedUnitType === 'worker' && selectedUnitId) {
        return (
            <div className={styles.selectionPanel}>
                <div className={styles.selectionContent}>
                    <div className={styles.portraitContainer}>
                        <img 
                            src="/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png" 
                            className={styles.portraitImage} 
                            alt="Worker" 
                        />
                    </div>
                    <div className={styles.selectionInfo}>
                        <h3 className={styles.selectionTitle}>Pawn (Worker)</h3>
                        <div className={styles.selectionStats}>Health: 50 | Carry: 10</div>
                        <button 
                            className={`${styles.actionBtn} ${styles.actionBtnDanger}`} 
                            onClick={() => EventBus.emit('force_deselect_unit', selectedUnitId)}
                        >
                            Deselect
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── 2. Warrior Selected Panel ──
    if (selectedUnitType === 'warrior' && selectedUnitId) {
        const handleDisband = () => {
            EventBus.emit('disband_warrior', selectedUnitId);
        };

        return (
            <div className={styles.selectionPanel}>
                <div className={styles.selectionContent}>
                    <div className={styles.portraitContainer}>
                        <img 
                            src="/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" 
                            className={styles.portraitImage} 
                            alt="Warrior" 
                        />
                    </div>
                    <div className={styles.selectionInfo}>
                        <h3 className={styles.selectionTitle}>Warrior</h3>
                        <div className={styles.selectionStats}>HP: 120 | Dmg: 25 / 1.2s</div>
                        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDisband}>
                            Disband
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── 3. Barracks Selected Panel ──
    if (selectedBuildingType === 'barracks' && selectedBuildingId) {
        const trainCost = BALANCE_CONFIG.units.warrior.trainCostGold;
        const canTrain = gold >= trainCost && availableWorkers > 1;
        const safetyWarning = availableWorkers <= 1 && gold >= trainCost;

        const handleTrainWarrior = () => {
            if (canTrain) {
                useGameStore.getState().addGold(-trainCost);
                EventBus.emit('train_warrior', selectedBuildingId);
            }
        };

        return (
            <div className={styles.selectionPanel}>
                <div className={styles.selectionContent}>
                    <div className={styles.portraitContainer}>
                        <img 
                            src="/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" 
                            className={styles.portraitImage} 
                            alt="Barracks" 
                        />
                        {trainingQueue.length > 0 && (
                            <div className={styles.stackBadge}>x{trainingQueue.length}</div>
                        )}
                    </div>
                    <div className={styles.selectionInfo}>
                        <h3 className={styles.selectionTitle}>Barracks</h3>
                        <button 
                            className={`${styles.actionBtn} ${!canTrain ? styles.actionBtnDisabled : ''}`}
                            disabled={!canTrain}
                            onClick={handleTrainWarrior}
                        >
                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/sword.png" alt="Train" className={styles.hudIconImg} style={{ width: 18, height: 18 }} />
                            Train Warrior ({trainCost}g)
                        </button>
                        {trainingQueue.length > 0 && (
                            <div className={styles.trainingBarContainer}>
                                <div 
                                    className={styles.trainingBarFill} 
                                    style={{ width: `${Math.round(trainingProgress * 100)}%` }} 
                                />
                            </div>
                        )}
                        {safetyWarning && (
                            <div className={styles.safetyWarning}>Need 1 worker active for economy</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const faction = useGameStore((state) => state.faction);
    const resources = useGameStore((state) => state.resources[state.faction] || state.resources['blue']);
    const wood = resources.wood;
    const gold = resources.gold;
    const currentPop = resources.currentPopulation;
    const maxPop = resources.maxPopulation;
    const workerCount = resources.workerCount;
    const warriorCount = resources.warriorCount;
    const isPlacing = useGameStore((state) => state.isPlacingBuilding);
    const isGameOver = useGameStore((state) => state.isGameOver);
    const gameResult = useGameStore((state) => state.gameResult);
    const difficulty = useGameStore((state) => state.difficulty || 'easy');
    const setDifficulty = useGameStore((state) => state.setDifficulty);
    const setMultiplayerState = useGameStore((state) => state.setMultiplayerState);

    const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
    const [lobbyStatus, setLobbyStatus] = useState<string>('');
    const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
            
            socket.on('connect', () => {
                console.log('[Socket] Connected:', socket.id);
            });

            socket.on('room_created', (data: { roomId: string, faction: 'blue' | 'red', isHost: boolean }) => {
                setCreatedRoomId(data.roomId);
                setLobbyStatus('Waiting for opponent to join...');
                setMultiplayerState(data.roomId, data.isHost, data.faction);
            });

            socket.on('room_joined', (data: { roomId: string, faction: 'blue' | 'red', isHost: boolean }) => {
                setLobbyStatus('Joined room! Waiting for host...');
                setMultiplayerState(data.roomId, data.isHost, data.faction);
            });

            socket.on('room_ready', (data: { roomId: string, players: any[] }) => {
                setLobbyStatus('Match Ready! Launching...');
                setHasStarted(true);
            });

            socket.on('room_error', (data: { message: string }) => {
                setLobbyStatus(data.message);
                setCreatedRoomId(null);
            });
        }
    }, []);

    const generateRandomRoomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const handleStartSoloSkirmish = () => {
        setMultiplayerState('solo_skirmish', true, 'blue');
        setHasStarted(true);
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

    const currentScene = (scene: Phaser.Scene) => {
        console.log('[Pocket Crusader] Active scene:', scene.scene.key);
    };

    return (
        <div id="app" style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* ── LANDING LOBBY / MAIN MENU ─────────────────── */}
            {!hasStarted && (
                <div className={styles.container}>
                    <div className={styles.panel}>
                        <div className={styles.content}>
                            <div className={styles.titleRibbon}>
                                <h1 className={styles.title}>Pocket Crusader</h1>
                                <p className={styles.subtitle}>Medieval Mobile RTS</p>
                            </div>

                            {/* Map Information Badge */}
                            <div className={styles.mapBadge}>
                                <span>🗺️ Map: <strong>Greenvale Frontier (96×64)</strong></span>
                            </div>

                            {/* Configurable Difficulty Selector */}
                            <div className={styles.difficultyGroup}>
                                <div className={styles.difficultyLabel}>Skirmish Difficulty</div>
                                <div className={styles.difficultyButtons}>
                                    <button
                                        type="button"
                                        className={`${styles.difficultyBtn} ${difficulty === 'easy' ? styles.difficultyBtnActive : ''}`}
                                        onClick={() => setDifficulty('easy')}
                                    >
                                        Easy (Default)
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.difficultyBtn} ${difficulty === 'normal' ? styles.difficultyBtnActive : ''}`}
                                        onClick={() => setDifficulty('normal')}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.difficultyBtn} ${difficulty === 'hard' ? styles.difficultyBtnActive : ''}`}
                                        onClick={() => setDifficulty('hard')}
                                    >
                                        Hard
                                    </button>
                                </div>
                                <div className={styles.difficultyDesc}>
                                    {AI_DIFFICULTIES[difficulty].description}
                                </div>
                            </div>

                            {!createdRoomId ? (
                                <div style={{ width: '100%' }}>
                                    {/* Primary Play Button */}
                                    <button className={styles.bigBlueBtn} onClick={handleStartSoloSkirmish}>
                                        <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/play.png" alt="Play" style={{ width: 22, height: 22 }} />
                                        Play Skirmish (Solo)
                                    </button>

                                    {/* Multiplayer Section */}
                                    <div className={styles.multiplayerSection}>
                                        <div className={styles.sectionDivider}>— Online Multiplayer —</div>
                                        <div className={styles.secondaryBtnRow}>
                                            <button className={styles.secondaryBtn} onClick={handleCreateRoom}>
                                                Create Room
                                            </button>
                                        </div>
                                        <div className={styles.joinContainer}>
                                            <input 
                                                type="text" 
                                                placeholder="ROOM" 
                                                maxLength={4}
                                                value={joinRoomIdInput}
                                                onChange={(e) => setJoinRoomIdInput(e.target.value.toUpperCase())}
                                                className={styles.lobbyInput}
                                            />
                                            <button className={styles.secondaryBtn} onClick={handleJoinRoom} style={{ flex: '0 0 80px' }}>
                                                Join
                                            </button>
                                        </div>
                                        {lobbyStatus && <div className={styles.lobbyStatus}>{lobbyStatus}</div>}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ width: '100%', padding: '16px 0' }}>
                                    <h2 style={{ color: '#fde047', margin: '0 0 8px 0', fontSize: 24 }}>Room: {createdRoomId}</h2>
                                    <div className={styles.lobbyStatus}>{lobbyStatus}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── ACTIVE GAMEPLAY PHASER CANVAS & HUD ───────── */}
            {hasStarted && (
                <>
                    <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />

                    {/* Top Medieval Wood Bar */}
                    <div className={styles.hud}>
                        <div className={styles.hudGroup}>
                            {/* Wood Counter */}
                            <div className={styles.hudItem} title="Wood">
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.hudIconImg} />
                                <span className={styles.hudValue}>{wood}</span>
                            </div>

                            {/* Gold Counter */}
                            <div className={styles.hudItem} title="Gold">
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/coin.png" alt="Gold" className={styles.hudIconImg} />
                                <span className={styles.hudValue}>{gold}</span>
                            </div>

                            {/* Population Indicator */}
                            <div className={styles.hudItem} title="Population">
                                <img src="/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png" alt="Pop" className={styles.hudIconImg} />
                                <span className={styles.hudValue}>{currentPop}/{maxPop}</span>
                            </div>
                        </div>

                        {/* Build Action Button */}
                        <button 
                            className={styles.hudBuildBtn} 
                            onClick={() => useGameStore.getState().toggleBuildMenu()}
                            title="Build Structures"
                        >
                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/hammer.png" alt="Build" className={styles.hudBuildIcon} />
                        </button>
                    </div>

                    {/* Left Quick Action Sidebar */}
                    <div className={styles.quickSidebar}>
                        <div 
                            className={styles.quickSidebarSlot} 
                            onClick={() => EventBus.emit('select_idle_worker')} 
                            title="Select Worker"
                        >
                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png" alt="Workers" className={styles.quickSidebarAvatar} />
                            <div className={styles.stackBadge}>{workerCount}</div>
                        </div>
                        <div 
                            className={styles.quickSidebarSlot} 
                            onClick={() => EventBus.emit('select_idle_warrior')} 
                            title="Select Warrior"
                        >
                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Warrior_Blue.png" alt="Warriors" className={styles.quickSidebarAvatar} />
                            <div className={styles.stackBadge}>{warriorCount}</div>
                        </div>
                    </div>

                    {/* Contextual Selection Panel */}
                    {!isPlacing && <SelectionPanel />}

                    {/* Placement Mode Active Indicator */}
                    {isPlacing && (
                        <div className={styles.placementBar}>
                            <span>Tap ground to place structure</span>
                            <button 
                                className={styles.cancelPlacementBtn}
                                onClick={() => useGameStore.getState().setPlacingBuilding(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Build Menu Scroll */}
                    <BuildMenu wood={wood} gold={gold} />

                    {/* Victory / Defeat Modal */}
                    {isGameOver && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modalCard}>
                                <div className={styles.modalBanner}>
                                    <h2 className={styles.modalTitle}>
                                        {gameResult === 'victory' ? 'VICTORY!' : 'DEFEAT'}
                                    </h2>
                                </div>
                                <p className={styles.modalDescription}>
                                    {gameResult === 'victory'
                                        ? 'The enemy King has fallen! Your crusader kingdom reigns supreme over Greenvale Frontier.'
                                        : 'Your King has perished on the battlefield. The stronghold has fallen.'}
                                </p>
                                
                                <div className={styles.modalStatsGrid}>
                                    <div className={styles.modalStatRow}>
                                        <div className={styles.modalStatKey}>
                                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png" alt="Wood" className={styles.costIcon} />
                                            <span>Wood Harvested:</span>
                                        </div>
                                        <span>{wood}</span>
                                    </div>
                                    <div className={styles.modalStatRow}>
                                        <div className={styles.modalStatKey}>
                                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/coin.png" alt="Gold" className={styles.costIcon} />
                                            <span>Gold Harvested:</span>
                                        </div>
                                        <span>{gold}</span>
                                    </div>
                                    <div className={styles.modalStatRow}>
                                        <div className={styles.modalStatKey}>
                                            <img src="/assets/tiny-swords/UI Elements/UI Elements/Icons/sword.png" alt="Warriors" className={styles.costIcon} />
                                            <span>Warriors Recruited:</span>
                                        </div>
                                        <span>{warriorCount}</span>
                                    </div>
                                </div>

                                <button 
                                    className={styles.bigBlueBtn} 
                                    onClick={() => window.location.reload()}
                                    style={{ width: '80%' }}
                                >
                                    Play Again
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default App;
