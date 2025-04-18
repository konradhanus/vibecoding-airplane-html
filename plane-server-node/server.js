// server.js
const WebSocket = require('ws');

// --- Konfiguracja ---
const PORT = 8080;
const MAX_HEALTH = 100;
const RESPAWN_TIME_SECONDS = 5.0;
const TICK_RATE = 1000 / 20;

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
const clients = new Map();
const gameState = new Map();
const respawnTimers = new Map();
let clientIdCounter = 0;

console.log(`WebSocket server starting on port ${PORT}...`);

const wss = new WebSocket.Server({ port: PORT });

// --- Obsługa Zdarzeń Serwera ---
wss.on('listening', () => {
    console.log(`WebSocket server listening on port ${PORT}`);
});

wss.on('connection', (ws) => {
    const clientId = ++clientIdCounter;
    clients.set(clientId, ws);

    const playerData = initializePlayerData(clientId);
    gameState.set(clientId, playerData);

    console.log(`Client connected: ${clientId} at spawn index ${nextSpawnIndex === 0 ? SPAWN_POINTS.length - 1 : nextSpawnIndex - 1} (facing center) (Total: ${clients.size})`);

    sendMessage(ws, { type: 'your_id', id: clientId });
    const currentState = {};
    gameState.forEach((data, id) => {
        currentState[id] = data;
    });
    sendMessage(ws, { type: 'game_state', state: currentState });

    broadcast({ type: 'player_joined', player: playerData }, clientId);

    ws.on('message', (messageBuffer) => {
        try {
            const messageString = messageBuffer.toString();
            const message = JSON.parse(messageString);
            handleClientMessage(clientId, ws, message);
        } catch (error) {
            console.error(`Failed to parse message or invalid message format from client ${clientId}:`, error);
        }
    });

    ws.on('close', () => {
        handleClientDisconnect(clientId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        handleClientDisconnect(clientId);
    });
});

wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
});

// --- Funkcje Pomocnicze ---

function initializePlayerData(clientId) {
    const spawnPoint = SPAWN_POINTS[nextSpawnIndex];
    nextSpawnIndex = (nextSpawnIndex + 1) % SPAWN_POINTS.length;

    const dirX = 0 - spawnPoint.x;
    const dirZ = 0 - spawnPoint.z;

    // Oblicz kąt rotacji Y (wokół osi Y) używając atan2(x, z)
    // To da kąt w radianach potrzebny do obrócenia osi +Z w kierunku wektora (dirX, 0, dirZ)
    const targetRotY = Math.atan2(dirX, dirZ); // <<< POPRAWIONA KOLEJNOŚĆ ARGUMENTÓW

    return {
        id: clientId,
        x: spawnPoint.x,
        y: spawnPoint.y,
        z: spawnPoint.z,
        rotY: parseFloat(targetRotY.toFixed(3)),
        rotZ: 0.0,
        health: MAX_HEALTH,
        kills: 0,
        isAlive: true,
        last_update: Date.now()
    };
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
        case 'update_state':
            if (message.state && playerState.isAlive) {
                playerState.x = message.state.x ?? playerState.x;
                playerState.y = message.state.y ?? playerState.y;
                playerState.z = message.state.z ?? playerState.z;
                playerState.rotY = message.state.rotY ?? playerState.rotY;
                playerState.rotZ = message.state.rotZ ?? playerState.rotZ;
                playerState.last_update = Date.now();
                broadcast({ type: 'player_update', player: playerState }, clientId);
            }
            break;

        case 'hit_player':
            const targetId = message.targetId;
            const damage = message.damage ?? 0;
            if (targetId === clientId) return;
            const targetState = gameState.get(targetId);

            if (targetState && targetState.isAlive && damage > 0 && playerState.isAlive) {
                targetState.health -= damage;
                console.log(`Player ${clientId} hit player ${targetId} for ${damage} damage. ${targetState.health} HP left.`);
                let victimKilled = false;
                if (targetState.health <= 0) {
                    targetState.health = 0;
                    targetState.isAlive = false;
                    victimKilled = true;
                    console.log(`Player ${targetId} was killed by ${clientId}.`);
                    playerState.kills++;
                    startRespawnTimer(targetId);
                }
                broadcast({ type: 'player_update', player: targetState });
                if (victimKilled) {
                    broadcast({ type: 'player_update', player: playerState });
                    broadcast({ type: 'player_killed', victimId: targetId, killerId: clientId, killerKills: playerState.kills });
                }
            }
            break;

        case 'i_died':
             if (playerState.isAlive) {
                 playerState.isAlive = false;
                 playerState.health = 0;
                 console.log(`Player ${clientId} reported environmental death.`);
                 broadcast({ type: 'player_update', player: playerState });
                 startRespawnTimer(clientId);
             }
            break;

        case 'fire_bullet':
            break;
        default:
            console.log(`Unknown message type '${message.type}' from ${clientId}`);
            break;
    }
}

function startRespawnTimer(clientId) {
    if (respawnTimers.has(clientId)) {
        clearTimeout(respawnTimers.get(clientId));
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
    if (!playerData || playerData.isAlive) {
        console.log(`Respawn cancelled for ${clientId} (already alive or disconnected).`);
        respawnTimers.delete(clientId);
        return;
    }

    const spawnPoint = SPAWN_POINTS[nextSpawnIndex];
    nextSpawnIndex = (nextSpawnIndex + 1) % SPAWN_POINTS.length;
    const dirX = 0 - spawnPoint.x;
    const dirZ = 0 - spawnPoint.z;
    const targetRotY = Math.atan2(dirX, dirZ); // <<< POPRAWIONA KOLEJNOŚĆ ARGUMENTÓW

    console.log(`Respawning client ${clientId} at spawn index ${nextSpawnIndex === 0 ? SPAWN_POINTS.length - 1 : nextSpawnIndex - 1} (facing center)`);

    playerData.x = spawnPoint.x;
    playerData.y = spawnPoint.y;
    playerData.z = spawnPoint.z;
    playerData.rotY = parseFloat(targetRotY.toFixed(3));
    playerData.rotZ = 0.0;
    playerData.health = MAX_HEALTH;
    playerData.isAlive = true;
    playerData.last_update = Date.now();

    broadcast({ type: 'player_update', player: playerData });
}

function handleClientDisconnect(clientId) {
    if (clients.has(clientId)) {
        console.log(`Client disconnected: ${clientId} (Total remaining: ${clients.size - 1})`);
        clients.delete(clientId);
        gameState.delete(clientId);
        if (respawnTimers.has(clientId)) {
            clearTimeout(respawnTimers.get(clientId));
            respawnTimers.delete(clientId);
            console.log(`Cancelled respawn timer for disconnected client ${clientId}`);
        }
        broadcast({ type: 'player_left', id: clientId });
    } else {
         console.log(`Attempted to disconnect non-existent client: ${clientId}`);
    }
}

function sendMessage(ws, messageData) {
    if (ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify(messageData));
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    }
}

function broadcast(messageData, excludeClientId = null) {
    const messageString = JSON.stringify(messageData);
    clients.forEach((ws, id) => {
        if (id !== excludeClientId && ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(messageString);
            } catch (error) {
                console.error(`Failed to broadcast to client ${id}:`, error);
            }
        }
    });
}