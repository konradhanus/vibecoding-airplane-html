// server.js
const WebSocket = require('ws');

// --- Konfiguracja ---
const PORT = 8080;
const MAX_HEALTH = 100;
const RESPAWN_TIME_SECONDS = 5.0;
const TICK_RATE = 1000 / 20; // Server tick rate (unused in this simplified example but good practice)

// --- Pozycje Startowe (Lotniskowce) ---
const CARRIER_DISTANCE = 1500;
const SPAWN_POINTS = [
    { x: 0,                   y: 55.0, z: -CARRIER_DISTANCE },   // Północ
    { x: CARRIER_DISTANCE,    y: 55.0, z: 0 },                 // Wschód
    { x: 0,                   y: 55.0, z: CARRIER_DISTANCE },  // Południe
    { x: -CARRIER_DISTANCE,   y: 55.0, z: 0 }                  // Zachód
];
let nextSpawnIndex = 0;

// --- Stan Gry ---
const clients = new Map(); // Map<clientId, WebSocket>
const gameState = new Map(); // Map<clientId, PlayerData>
const respawnTimers = new Map(); // Map<clientId, TimeoutID>
let clientIdCounter = 0;

// Typy samolotów (dla walidacji)
const VALID_PLANE_TYPES = ['spad', 'redbaron', 'airplane'];

console.log(`WebSocket server starting on port ${PORT}...`);

const wss = new WebSocket.Server({ port: PORT });

// --- Obsługa Zdarzeń Serwera ---
wss.on('listening', () => {
    console.log(`WebSocket server listening on port ${PORT}`);
});

wss.on('connection', (ws) => {
    const clientId = ++clientIdCounter;
    clients.set(clientId, ws);

    // Inicjalizuj gracza, ale jeszcze BEZ pełnych danych startowych
    // Pozycję/rotację ustawimy, gdy gracz będzie gotowy (po wybraniu samolotu)
    const playerData = {
        id: clientId,
        x: 0, y: 50, z: 0, // Domyślna pozycja (zostanie nadpisana)
        rotY: 0, rotZ: 0,  // Domyślna rotacja (zostanie nadpisana)
        health: MAX_HEALTH,
        kills: 0,
        isAlive: false, // Zacznij jako nieaktywny/martwy, aż wybierze samolot i dostanie pozycję
        planeType: 'airplane', // Domyślny typ, klient powinien go nadpisać
        last_update: Date.now()
    };
    gameState.set(clientId, playerData);

    console.log(`Client placeholder created: ${clientId} (Total: ${clients.size})`);

    // Wyślij tylko ID na początku
    sendMessage(ws, { type: 'your_id', id: clientId });

    // NIE wysyłaj game_state ani player_joined od razu
    // Zrób to dopiero, gdy klient wybierze samolot i dostanie pozycję startową

    ws.on('message', (messageBuffer) => {
        try {
            const messageString = messageBuffer.toString();
            const message = JSON.parse(messageString);
            handleClientMessage(clientId, ws, message);
        } catch (error) {
            console.error(`Failed to parse message or invalid message format from client ${clientId}:`, error);
            // Można rozważyć rozłączenie klienta przy błędach parsowania
             // ws.terminate();
        }
    });

    ws.on('close', () => {
        handleClientDisconnect(clientId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        // Błędy często prowadzą do zamknięcia, które jest już obsługiwane
        handleClientDisconnect(clientId); // Dodatkowe upewnienie się
    });
});

wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
});

// --- Funkcje Pomocnicze ---

// Funkcja nadająca pozycję startową i aktywująca gracza
function assignSpawnPointAndActivate(clientId) {
     const playerData = gameState.get(clientId);
     if (!playerData) return; // Gracz nie istnieje

     const spawnPoint = SPAWN_POINTS[nextSpawnIndex];
     nextSpawnIndex = (nextSpawnIndex + 1) % SPAWN_POINTS.length;

     const dirX = 0 - spawnPoint.x;
     const dirZ = 0 - spawnPoint.z;
     const targetRotY = Math.atan2(dirX, dirZ);

     playerData.x = spawnPoint.x;
     playerData.y = spawnPoint.y;
     playerData.z = spawnPoint.z;
     playerData.rotY = parseFloat(targetRotY.toFixed(3));
     playerData.rotZ = 0.0;
     playerData.health = MAX_HEALTH;
     playerData.isAlive = true; // Aktywuj gracza
     playerData.last_update = Date.now();

     console.log(`Activated and positioned client ${clientId} (Type: ${playerData.planeType}) at spawn index ${nextSpawnIndex === 0 ? SPAWN_POINTS.length - 1 : nextSpawnIndex - 1} (facing center)`);

     // Teraz wyślij pełny stan gry nowemu graczowi
     const ws = clients.get(clientId);
     if(ws) {
         const currentState = {};
         gameState.forEach((data, id) => {
             if (data.isAlive || id === clientId) { // Wyślij tylko aktywnych graczy + samego siebie
                 currentState[id] = data;
             }
         });
         sendMessage(ws, { type: 'game_state', state: currentState });
     }

     // Poinformuj innych graczy o dołączeniu tego gracza
     broadcast({ type: 'player_joined', player: playerData }, clientId);
}

function handleClientMessage(clientId, ws, message) {
    if (!message || typeof message.type !== 'string') {
        console.log(`Invalid message structure from ${clientId}`);
        return;
    }
    const playerState = gameState.get(clientId);
    if (!playerState) {
        console.log(`Received message from unknown or disconnected client ID: ${clientId}`);
        return;
    }

    switch (message.type) {
        case 'select_plane': // Nowy typ wiadomości
            if (message.planeType && VALID_PLANE_TYPES.includes(message.planeType)) {
                 // Tylko jeśli gracz jeszcze nie jest aktywny (pierwszy wybór)
                 if (!playerState.isAlive) {
                     playerState.planeType = message.planeType;
                     console.log(`Client ${clientId} selected plane: ${playerState.planeType}`);
                     // Nadaj pozycję startową i aktywuj gracza TERAZ
                     assignSpawnPointAndActivate(clientId);
                 } else {
                     console.log(`Client ${clientId} tried to change plane while alive. Ignored.`);
                 }
            } else {
                 console.log(`Invalid or missing planeType from ${clientId}:`, message.planeType);
                 // Można ewentualnie nadać domyślny i aktywować, jeśli typ jest nieprawidłowy
                 if (!playerState.isAlive) {
                    playerState.planeType = 'airplane'; // Użyj domyślnego
                    console.log(`Client ${clientId} sent invalid type, assigning default 'airplane'.`);
                    assignSpawnPointAndActivate(clientId);
                 }
            }
            break;

        case 'update_state':
            // Pozwól na update tylko jeśli gracz jest żywy i został już aktywowany
            if (playerState.isAlive && message.state) {
                playerState.x = message.state.x ?? playerState.x;
                playerState.y = message.state.y ?? playerState.y;
                playerState.z = message.state.z ?? playerState.z;
                playerState.rotY = message.state.rotY ?? playerState.rotY;
                playerState.rotZ = message.state.rotZ ?? playerState.rotZ;
                playerState.last_update = Date.now();
                // Rozgłoś update stanu (pozycji/rotacji)
                // UWAGA: Nie rozgłaszamy już typu samolotu w każdym update
                broadcast({
                    type: 'player_update',
                    player: { // Wyślij tylko niezbędne dane stanu
                         id: playerState.id,
                         x: playerState.x,
                         y: playerState.y,
                         z: playerState.z,
                         rotY: playerState.rotY,
                         rotZ: playerState.rotZ,
                         health: playerState.health, // Zdrowie może się zmieniać
                         kills: playerState.kills, // Kills mogą się zmieniać
                         isAlive: playerState.isAlive, // Stan życia może się zmieniać
                         planeType: playerState.planeType // Typ jest potrzebny do renderowania
                    }
                }, clientId); // Wyklucz nadawcę
            }
            break;

        case 'hit_player':
            const targetId = message.targetId;
            const damage = message.damage ?? 0;
            // Sprawdź, czy atakujący i cel istnieją i są żywi
            if (!playerState.isAlive) return;
            const targetState = gameState.get(targetId);
            if (!targetState || !targetState.isAlive || targetId === clientId || damage <= 0) return;

            targetState.health -= damage;
            console.log(`Player ${clientId} hit player ${targetId} for ${damage} damage. ${targetState.health} HP left.`);
            let victimKilled = false;
            if (targetState.health <= 0) {
                targetState.health = 0;
                targetState.isAlive = false;
                victimKilled = true;
                console.log(`Player ${targetId} was killed by ${clientId}.`);
                playerState.kills++; // Zwiększ liczbę zabójstw atakującego
                startRespawnTimer(targetId); // Rozpocznij odliczanie do respawnu ofiary
            }

            // Rozgłoś update celu (zmiana zdrowia, ew. status isAlive)
            broadcast({ type: 'player_update', player: targetState });

            // Jeśli cel został zabity, rozgłoś też update atakującego (zmiana liczby kills)
            if (victimKilled) {
                broadcast({ type: 'player_update', player: playerState }); // Wyślij update atakującego
                broadcast({ type: 'player_killed', victimId: targetId, killerId: clientId, killerKills: playerState.kills }); // Opcjonalna wiadomość o zabójstwie
            }
            break;

        case 'i_died': // Gracz zgłasza śmierć (np. kolizja)
             if (playerState.isAlive) {
                 playerState.isAlive = false;
                 playerState.health = 0;
                 const killerId = message.killerId; // Kto go zabił (może być null)
                 console.log(`Player ${clientId} reported death ${killerId ? `(possibly by ${killerId})` : '(environmental)'}.`);
                 // Jeśli był zabity przez innego gracza, ten gracz powinien dostać punkt
                 // To powinno być obsługiwane przez 'hit_player' dochodzące do 0 HP
                 // Ale na wszelki wypadek można dodać logikę tutaj
                 if (killerId && gameState.has(killerId)) {
                     // To już powinno być zrobione przez hit_player, ale jako fallback:
                     // const killerState = gameState.get(killerId);
                     // if(killerState && killerState.isAlive) killerState.kills++;
                     // broadcast({ type: 'player_update', player: killerState });
                     console.log(`(Death report from ${clientId}, killer reported as ${killerId})`);
                 }

                 // Rozgłoś update stanu gracza (że nie żyje)
                 broadcast({ type: 'player_update', player: playerState });
                 startRespawnTimer(clientId); // Rozpocznij respawn
             }
            break;

        // case 'fire_bullet': // Obecnie nieużywane po stronie serwera
        //     break;
        default:
            console.log(`Unknown message type '${message.type}' from ${clientId}`);
            break;
    }
}

function startRespawnTimer(clientId) {
    if (respawnTimers.has(clientId)) {
        clearTimeout(respawnTimers.get(clientId)); // Anuluj poprzedni timer, jeśli istnieje
    }
    console.log(`Starting respawn timer (${RESPAWN_TIME_SECONDS}s) for client ${clientId}`);
    const timerId = setTimeout(() => {
        respawnPlayerOnServer(clientId);
        respawnTimers.delete(clientId);
    }, RESPAWN_TIME_SECONDS * 1000);
    respawnTimers.set(clientId, timerId);
}

function respawnPlayerOnServer(clientId) {
    const playerData = gameState.get(clientId);
    // Sprawdź, czy gracz nadal istnieje i czy jest martwy (może się rozłączyć w międzyczasie)
    if (!playerData || playerData.isAlive) {
        console.log(`Respawn cancelled for ${clientId} (player gone or already alive).`);
        respawnTimers.delete(clientId); // Usuń timer, jeśli istnieje
        return;
    }

    // Znajdź nowy punkt startowy i rotację
    const spawnPoint = SPAWN_POINTS[nextSpawnIndex];
    nextSpawnIndex = (nextSpawnIndex + 1) % SPAWN_POINTS.length;
    const dirX = 0 - spawnPoint.x;
    const dirZ = 0 - spawnPoint.z;
    const targetRotY = Math.atan2(dirX, dirZ);

    console.log(`Respawning client ${clientId} (Type: ${playerData.planeType}) at spawn index ${nextSpawnIndex === 0 ? SPAWN_POINTS.length - 1 : nextSpawnIndex - 1} (facing center)`);

    // Zresetuj stan gracza
    playerData.x = spawnPoint.x;
    playerData.y = spawnPoint.y;
    playerData.z = spawnPoint.z;
    playerData.rotY = parseFloat(targetRotY.toFixed(3));
    playerData.rotZ = 0.0;
    playerData.health = MAX_HEALTH;
    playerData.isAlive = true; // Ożyw gracza
    playerData.last_update = Date.now();

    // Rozgłoś pełny, zaktualizowany stan gracza (w tym nową pozycję/rotację)
    broadcast({ type: 'player_update', player: playerData });
}

function handleClientDisconnect(clientId) {
    if (clients.has(clientId)) {
        console.log(`Client disconnected: ${clientId} (Total remaining: ${clients.size - 1})`);
        clients.delete(clientId);
        gameState.delete(clientId);
        // Anuluj timer respawnu, jeśli istnieje
        if (respawnTimers.has(clientId)) {
            clearTimeout(respawnTimers.get(clientId));
            respawnTimers.delete(clientId);
            console.log(`Cancelled respawn timer for disconnected client ${clientId}`);
        }
        // Poinformuj pozostałych graczy
        broadcast({ type: 'player_left', id: clientId });
    } else {
         // To może się zdarzyć, jeśli błąd wystąpił przed pełnym połączeniem
         console.log(`Attempted to disconnect non-existent or already disconnected client: ${clientId}`);
    }
}

// Wysyła wiadomość do konkretnego klienta
function sendMessage(ws, messageData) {
    if (ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify(messageData));
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    }
}

// Wysyła wiadomość do wszystkich połączonych klientów (opcjonalnie z wykluczeniem jednego)
function broadcast(messageData, excludeClientId = null) {
    const messageString = JSON.stringify(messageData);
    clients.forEach((ws, id) => {
        if (id !== excludeClientId && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(messageString);
            } catch (error) {
                console.error(`Failed to broadcast to client ${id}:`, error);
                // Można dodać logikę usuwania klienta, jeśli wysyłanie nie powiedzie się
                // handleClientDisconnect(id);
            }
        }
    });
}