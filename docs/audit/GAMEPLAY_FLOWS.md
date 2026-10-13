# Pocket Crusader — Gameplay Lifecycle Flows

## 1. Entity Creation & Registration Flow

Pocket Crusader creates entities across three distinct lifecycle triggers: Initial World Generation, Periodic Population Spawning, and Military Recruitment / Construction.

```mermaid
sequenceDiagram
    autonumber
    participant GS as GameScene
    participant EM as EntityManager
    participant GM as GridManager
    participant Store as Zustand Store
    participant Socket as Socket.IO Client

    Note over GS: Trigger A: Initial World Generation (spawnInitialWorld)
    GS->>EM: new ResourceEntity() / new GoldResource()
    EM->>EM: resources.push(resource)
    GS->>GM: blockTile(col, row)
    GS->>EM: new Stronghold() -> buildings.push(b)
    GS->>GM: blockArea(col, row, 5, 2)
    GS->>EM: new King(), new Worker() -> units.push(u)

    Note over EM: Trigger B: Periodic Population Spawning (every 10s)
    EM->>Store: Check currentPopulation < maxPopulation
    EM->>GM: getRandomWalkableTileInRange(stronghold.col, stronghold.row, 2)
    EM->>EM: new Worker({ col, row, faction, id })
    EM->>EM: addUnit(worker)
    EM->>Socket: emit('client_spawn_unit', { type: 'worker', col, row, entityId, faction })
    EM->>EM: recalculatePopulation() -> sync to Zustand
```

### Trace Details
1. **Initial Spawning (`GameScene.ts:340–404`):**
   - Obstacles (15 trees) and gold rocks (2 nodes) are statically created and pushed to `EntityManager.resources`. Their coordinates are blocked in `GridManager.blockTile()`.
   - Strongholds for Blue (cols 4–8, rows 8–9) and Red (cols 23–27, rows 8–9) are registered via `EntityManager.addBuilding()`. Their footprints are blocked via `GridManager.blockArea(col, row, 5, 2)`.
   - Kings and 3 initial Workers per faction are created and added via `EntityManager.addUnit()`.
2. **Dynamic Worker Spawning (`EntityManager.ts:218–334`):**
   - `EntityManager.update()` increments `spawnTimer += delta`. Every 10,000 ms, if `currentPopulation < maxPopulation`, `checkPopulationAndSpawn()` executes.
   - A walkable tile within radius 2 of the friendly Stronghold is selected.
   - A new `Worker` instance is constructed with a unique timestamp ID (`pawn_${faction}_${Date.now()}`).
   - If connected to multiplayer, `client_spawn_unit` is emitted.
   - `recalculatePopulation()` counts active units and updates Zustand.
3. **Remote Unit Spawning (`GameScene.ts:203–223`):**
   - When receiving `server_spawn_unit`, `GameScene` verifies the entity doesn't already exist in `EntityManager.findUnitById()`, instantiates a remote `Worker`, and pushes it to `EntityManager.units`.

---

## 2. Selection & Deselection Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player / Touch Input
    participant IM as InteractionManager
    participant Unit as BaseUnit
    participant Bldg as BaseBuilding
    participant Store as Zustand Store
    participant React as React SelectionPanel

    Player->>IM: Pointer Down on Entity Hitbox
    alt Tapped Unit
        IM->>IM: selectUnit(unit)
        IM->>Unit: setSelected(true) (Draws yellow selection ring)
        IM->>Store: setSelectedUnit(unit.id, 'worker' | 'warrior')
        Store->>React: Re-render SelectionPanel (shows portrait, actions)
    else Tapped Building
        IM->>IM: selectBuilding(building)
        IM->>Bldg: setSelected(true)
        IM->>Store: setSelectedBuilding(bldg.id, bldg.type)
        Store->>React: Re-render SelectionPanel (shows Barracks/Hut actions)
    else Tapped Empty Walkable Ground
        IM->>IM: If unit selected -> triggers Movement Flow
        IM->>IM: If building selected -> deselectBuilding()
    else Tapped Outside / Deselect Command
        IM->>IM: deselectUnit() / deselectBuilding()
        IM->>Unit: setSelected(false)
        IM->>Store: setSelectedUnit(null, null)
        Store->>React: SelectionPanel unmounts
    end
```

### Trace Details
- **Hitbox Implementation:** Entities inherit from `Phaser.GameObjects.Container` and declare container-local interactive rectangles (`this.setInteractive(new Phaser.Geom.Rectangle(-32, -64, 64, 64), Phaser.Geom.Rectangle.Contains)`).
- **Selection Visuals:** `BaseUnit.setSelected(bool)` creates or clears a procedural yellow ring graphics object around the unit's base (`lineStyle(2, 0xffd700)`).
- **Store Synchronization:**
  - Unit selection calls `useGameStore.getState().setSelectedUnit(unit.id, unitType)`.
  - Building selection calls `useGameStore.getState().setSelectedBuilding(building.id, buildingType)`.
- **Force Deselect Event:** `this.scene.events.on('force_deselect_unit', (unitId) => ...)` handles programmatic deselection when units transform or are disbanded.

---

## 3. Movement & Pathfinding Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player
    participant IM as InteractionManager
    participant GM as GridManager
    participant EasyStar as EasyStar.js
    participant Unit as BaseUnit / Worker
    participant Socket as Socket.IO Client

    Player->>IM: Taps walkable tile (targetCol, targetRow)
    IM->>GM: isTileWalkable(targetCol, targetRow)
    alt Tile is Walkable
        IM->>IM: showTapIndicator(targetCol, targetRow) (Pulsing gold circle)
        IM->>Unit: cancelBuilding(), cancelHutAutomation()
        IM->>Store: Read { roomId, faction }
        Note over IM: Line 536 Check: if (!roomId || !this.selectedUnit) return;
        IM->>Unit: moveToGrid(targetCol, targetRow)
        Unit->>GM: findPath({startCol, startRow}, {targetCol, targetRow}, callback)
        GM->>EasyStar: calculate()
        EasyStar-->>GM: Array of waypoints [{x, y}, ...]
        GM-->>Unit: Receives path
        Unit->>Unit: moveAlongPath(path)
        loop Each Waypoint in Path
            Unit->>Unit: Tween x, y to waypoint center (duration = tile / speed * 1000)
            Unit->>Unit: Play run animation, flipX based on direction, setDepth(y)
        end
        IM->>Socket: emit('client_unit_move', { roomId, entityId, targetCol, targetRow })
    else Tile is Blocked
        IM->>IM: deselectUnit()
    end
```

### Trace Details & Issues
- **Path Calculation:** `BaseUnit.moveToGrid` delegates to `GridManager.findPath`, which utilizes EasyStar with 8-directional movement.
- **Waypoints to Tweens:** `BaseUnit.moveAlongPath()` constructs sequential Phaser tweens. Each tile step animates position linearly and updates facing direction (`this.mainSprite.flipX = targetPixel.x < this.x`).
- **Single-Player Movement Blocker (`InteractionManager.ts:536–538`):**
  The click handler strictly requires `if (!roomId || !this.selectedUnit) return;`. In single-player or offline mode without an active room ID, ground move clicks abort immediately, preventing units from moving.

---

## 4. Resource Gathering Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player
    participant IM as InteractionManager
    participant GM as GridManager
    participant Worker as Worker
    participant Res as ResourceEntity / GoldResource
    participant Stronghold as Stronghold
    participant Store as Zustand Store

    Player->>IM: Taps Resource (Tree or Gold rock) with Worker selected
    IM->>GM: findCardinalAdjacentWalkable(resource.col, resource.row)
    GM-->>IM: Returns nearest adjacent tile
    IM->>Worker: moveToGrid(adjCol, adjRow, onArrival)
    Worker->>Worker: Moves to adjacent tile
    Worker->>Worker: startGathering(resource)
    Worker->>Worker: Play chop/mine animation (`pawn-chop` / `pawn-mine`)
    
    loop Every 2000ms Gathering Tick
        Worker->>Res: takeDamage(1)
        Worker->>Worker: Increment carriedAmount
        alt Resource Depleted or Carry Capacity Reached (amount >= 10)
            Worker->>Worker: cancelGathering()
            Worker->>Worker: Play carry animation (`pawn-run-wood` / `pawn-run-gold`)
            Worker->>GM: findPath to nearest Stronghold
            Worker->>Worker: Moves to Stronghold
            Worker->>Worker: depositResources()
            Worker->>Store: addWood(amount) or addGold(amount)
            alt Resource Still Has Health
                Worker->>Worker: Returns to resource node
            else Resource Depleted
                Worker->>Worker: setWorkerState('IDLE')
            end
        end
    end
```

### Trace Details & Automated Huts
- **Manual Gathering (`Worker.ts:160–250`):**
  - Workers travel to cardinal adjacent tiles (up/down/left/right) next to the target resource.
  - A repeating Phaser timer (`scene.time.addEvent({ delay: 2000, repeat: -1 })`) deals damage to the resource (`res.takeDamage(1)`) and accumulates resources.
  - Once full (or when the node breaks), the worker navigates to the friendly Stronghold, deposits the goods into Zustand, and loops back if the node remains valid.
- **Automated Huts (`EntityManager.ts:528–552`, `BuildingEntity.ts`):**
  - When a Woodcutter's Hut or Gold Hut is constructed, `EntityManager.dispatchWorkerToHut()` assigns an idle worker to the hut.
  - The worker continuously gathers nearby trees or gold within an automated patrol radius without requiring player clicks.

---

## 5. Construction Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player
    participant React as React HUD (App.tsx)
    participant Store as Zustand Store
    participant IM as InteractionManager
    participant GM as GridManager
    participant EM as EntityManager
    participant Worker as Worker
    participant Bldg as BaseBuilding (House/Barracks/Hut)

    Player->>React: Clicks Hammer button (.hudBuildBtn)
    React->>Store: toggleBuildMenu()
    Store->>React: Opens BuildMenu Overlay
    Player->>React: Clicks Building Card (e.g. House - 30 wood)
    React->>Store: setPlacingBuilding('house')
    
    IM->>IM: pollBuildModeFromStore() detects isPlacingBuilding
    IM->>IM: enterBuildMode('house')
    IM->>IM: Spawns ghostSprite and ghostOverlay (green/red)
    
    Player->>IM: Drags/taps ghost to target grid position
    IM->>GM: isAreaWalkable(col, row, width, height)
    GM-->>IM: Returns validity
    
    Player->>IM: Pointer Up / Confirms Placement
    IM->>Store: deductWood(30)
    IM->>GM: blockArea(col, row, width, height)
    IM->>EM: Spawns new House({ col, row, isCompleted: false })
    IM->>EM: assignNearestIdleWorker(building)
    EM->>Worker: dispatchWorkerToConstruction(worker, building)
    Worker->>Worker: Moves adjacent to building site
    Worker->>Worker: startBuilding(building) -> Plays hammer animation
    
    loop Every 1000ms Construction Tick
        Worker->>Bldg: addProgress(20) (Updates progress bar graphics)
        alt Progress >= 100%
            Bldg->>Bldg: completeConstruction()
            Bldg->>EM: emit('building_completed', building)
            EM->>Worker: cancelBuilding(), setWorkerState('IDLE')
            EM->>EM: recalculatePopulation() (House adds +5 maxPop)
        end
    end
```

### Trace Details
- **Build Mode State:** Managed via `InteractionManager.isBuildMode` and driven by `useGameStore.isPlacingBuilding`.
- **Cost Validation:** Checked in React `BuildMenu` component (`canAffordHouse = wood >= 30`) and verified again during placement in `InteractionManager.handleBuildPlacement()`.
- **Progress Tracking:** Buildings display an overhead progress bar (`constructionBarBg`, `constructionBarFill`). Each second, assigned workers add progress until `completeConstruction()` switches the sprite from `House_Construction.png` to `House1.png`.

---

## 6. Training and Recruitment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player
    participant React as React SelectionPanel
    participant EventBus as Global EventBus
    participant EM as EntityManager
    participant Barracks as Barracks
    participant Worker as Worker
    participant Socket as Socket.IO Client

    Player->>React: Selects Barracks, clicks "Train Warrior" (20 Gold)
    React->>EventBus: emit('train_warrior', barracksId)
    EventBus->>EM: Handles 'train_warrior'
    EM->>EM: Draft Priority 1: Finds IDLE/WANDERING friendly Worker
    EM->>EM: Draft Priority 2: Hijacks Worker from Hut automation
    
    alt Worker Found
        EM->>Barracks: addWorkerToQueue(worker.id, 'warrior')
        EM->>EM: dispatchWorkerToTrain(worker, barracks)
        Worker->>Worker: Moves adjacent to Barracks
        Worker->>Worker: hideForTraining() (Worker disappears into Barracks)
        Barracks->>Barracks: startTrainingWorker(worker.id)
        Barracks->>Socket: emit('client_start_training', { roomId, barracksId, unitType })
        
        Note over Barracks: 10,000ms Training Timer
        loop Each Frame update(time, delta)
            Barracks->>Barracks: updateTrainingBar(progress)
            Barracks->>React: store.setTrainingState(queue, progress) (Triggers 60Hz re-render)
        end
        
        Barracks->>Barracks: onTrainingComplete()
        Barracks->>EM: emit('worker_graduated', worker.id) -> worker.destroy()
        Barracks->>EM: emit('warrior_trained', barracks, worker.id)
        EM->>EM: spawnWarrior(spawnCol, spawnRow, faction, newWarriorId)
        EM->>Socket: emit('client_unit_transformed', { oldEntityId, newEntityId, ... })
        EM->>EM: recalculatePopulation()
    else No Eligible Worker
        EM->>React: Refunds 20 Gold to store
    end
```

### Trace Details
- **Drafting Mechanic:** Instead of spawning units from thin air, training requires drafting an existing physical `Worker` entity from the field.
- **Queue Synchronization:** The Barracks maintains an array of queued recruits (`trainingRecruits: { workerId, unitType, status }[]`).
- **Graduation Transition:** The worker is hidden during training, then destroyed upon completion. A new `Warrior` instance is spawned adjacent to the Barracks entrance.

---

## 7. Combat, Damage & Unit Lifecycle (Audited Gap)

### Audited Finding: Combat System Does Not Exist

Tracing all combat-related code across the repository reveals:

```mermaid
flowchart TD
    subgraph Warrior Implementation - src/game/entities/Warrior.ts
        WAnim[ATTACK animation key defined]
        WState[onStateChange handles 'ATTACK']
        WLogic[❌ No attack method]
        WTarget[❌ No target acquisition]
        WRange[❌ No weapon range or radius]
        WTimer[❌ No cooldown or attack swing loop]
    end

    subgraph BaseEntity Damage - src/game/entities/base/BaseEntity.ts
        TakeDmg[takeDamage amount method]
        ResOnly[Called ONLY by Worker harvesting trees and gold rocks]
        NoUnitDmg[❌ Never invoked between Units or against Buildings]
    end

    subgraph Victory / Defeat - src/game/entities/King.ts
        KingDeath[King.onDeath sets isGameOver = true]
        NoAttackers[❌ King cannot be targeted or damaged by any unit]
        NoUIRender[❌ React UI never renders victory or defeat modal]
    end
```

1. **Warrior Attack Capabilities:**
   `Warrior.ts` contains only 47 lines of code. It configures health (200), speed (130), and an animation switcher for `'ATTACK'`, but contains zero combat methods, targeting logic, attack commands, or damage application.
2. **Targeting & Interaction:**
   `InteractionManager.ts` has no branch for right-clicking or tapping an enemy unit to issue an attack command. Tapping an enemy unit merely attempts to select it.
3. **King Lifecycle:**
   `King.ts` defines `onDeath()` which sets `useGameStore.getState().setGameOver(true)`. However, no system in the game is capable of attacking the King, reducing his health, or triggering this death callback. Furthermore, `App.tsx` never reads or renders `isGameOver`.

---

## 8. Death, Destruction & Resource Cleanup Flow

```mermaid
sequenceDiagram
    autonumber
    participant Res as GoldResource / ResourceEntity
    participant GM as GridManager
    participant EM as EntityManager

    Note over Res: Depletion Event (Health reaches 0)
    Res->>Res: onDepleted()
    Res->>Res: emit('depleted', this)
    alt GoldResource
        Res->>Res: this.destroy() (Phaser GameObject destroyed)
        Note over GM,EM: ❌ BUG: Tile is NOT unblocked in GridManager!<br/>❌ BUG: Resource is NOT removed from EntityManager.resources!
    else ResourceEntity (Wood)
        Res->>Res: Texture set to 'stump'
        Note over GM,EM: Tile remains blocked (stump is impassable)
    end
```

### Trace Details & Confirmed Memory Leak
- `GoldResource.onDepleted()` destroys the Phaser game object (`this.destroy()`).
- However, `EntityManager.resources` never removes the destroyed object.
- Each subsequent frame, `EntityManager.update()` iterates over the array and attempts to call `resource.update(time, delta)` on destroyed instances.
- Furthermore, `GridManager.unblockTile(col, row)` is never called for depleted gold nodes, leaving the grid cell permanently impassable.

---

## 9. Wandering AI Flow

```mermaid
flowchart TD
    Update[EntityManager.update] --> ProcessWander[processWanderingAI]
    ProcessWander --> CheckCanWander{Unit canWander?}
    
    CheckCanWander -->|Worker: IDLE, not building, not carrying, not in hut| TickWander[Tick wanderTimer -= delta]
    CheckCanWander -->|Warrior: IDLE| TickWander
    CheckCanWander -->|King: IDLE| TickWander
    CheckCanWander -->|Busy / Moving| ResetTimer[Ignore]
    
    TickWander --> TimerExpired{wanderTimer <= 0?}
    TimerExpired -->|No| Wait[Continue]
    TimerExpired -->|Yes| PickTile[Pick random cardinal adjacent tile within wanderRadius]
    
    PickTile --> Walkable{Tile Walkable?}
    Walkable -->|Yes| Move[Unit moves 1 tile via EasyStar / Tween]
    Walkable -->|No| Reset[Reset wander delay]
```

### Trace Details
- Implemented in `BaseUnit.ts` and ticked in `EntityManager.processWanderingAI()`.
- Provides ambient life by having idle pawns, warriors, and kings occasionally step 1 tile in a random direction after a randomized cooldown (Workers: 5–10s, Warriors: 8–15s, King: 15–20s).
