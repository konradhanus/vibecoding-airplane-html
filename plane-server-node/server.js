// server.js
const WebSocket = require('ws');

// --- Konfiguracja ---
const PORT = 8080; // Port, na którym serwer będzie nasłuchiwał
const MAX_HEALTH = 100;
const TICK_RATE = 1000 / 20; // Opcjonalnie: Pętla serwera (np. 20 razy na sekundę) do regularnych zadań

// --- Stan Gry ---
// Używamy Map do przechowywania klientów i stanu graczy
const clients = new Map(); // Map<clientId, WebSocket>
const gameState = new Map(); // Map<clientId, PlayerData>
let clientIdCounter = 0; // Prosty licznik do generowania unikalnych ID

console.log(`WebSocket server starting on port ${PORT}...`);

const wss = new WebSocket.Server({ port: PORT });

// --- Obsługa Zdarzeń Serwera ---

wss.on('listening', () => {
    console.log(`WebSocket server listening on port ${PORT}`);
});

wss.on('connection', (ws) => {
    // Przypisz unikalne ID nowemu połączeniu
    const clientId = ++clientIdCounter;
    clients.set(clientId, ws);

    // Inicjalizuj stan nowego gracza
    const playerData = initializePlayerData(clientId);
    gameState.set(clientId, playerData);

    console.log(`Client connected: ${clientId} (Total: ${clients.size})`);

    // 1. Wyślij nowemu klientowi jego ID i aktualny stan gry
    sendMessage(ws, { type: 'your_id', id: clientId });
    // Wyślij stan wszystkich aktualnie połączonych graczy
    const currentState = {};
    gameState.forEach((data, id) => {
        currentState[id] = data;
    });
    sendMessage(ws, { type: 'game_state', state: currentState });


    // 2. Poinformuj *innych* klientów o nowym graczu
    broadcast({ type: 'player_joined', player: playerData }, clientId); // Wyślij do wszystkich oprócz nowego

    // --- Obsługa Zdarzeń dla tego Klienta ---
    ws.on('message', (messageBuffer) => {
        try {
            // Wiadomość przychodzi jako Buffer, konwertujemy na string
            const messageString = messageBuffer.toString();
            const message = JSON.parse(messageString);
            handleClientMessage(clientId, ws, message);
        } catch (error) {
            console.error(`Failed to parse message or invalid message format from client ${clientId}:`, error);
            // Można rozważyć wysłanie błędu do klienta lub jego rozłączenie
        }
    });

    ws.on('close', () => {
        handleClientDisconnect(clientId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        // Zdarzenie 'close' zazwyczaj jest wywoływane automatycznie po błędzie
        handleClientDisconnect(clientId); // Na wszelki wypadek
    });
});

wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
});

// --- Funkcje Pomocnicze ---

function initializePlayerData(clientId) {
    return {
        id: clientId,
        x: parseFloat((Math.random() * 400 - 200).toFixed(2)), // Losowa pozycja startowa
        y: 50.0,
        z: parseFloat((Math.random() * 400 - 200).toFixed(2)),
        rotY: parseFloat((Math.random() * Math.PI * 2).toFixed(3)),
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
        // Gracz nie istnieje w stanie gry (może się zdarzyć przy szybkim rozłączeniu/błędzie)
        console.log(`Received message from unknown client ID: ${clientId}`);
        return;
    }

    // console.log(`Received ${message.type} from ${clientId}`);

    switch (message.type) {
        case 'update_state':
            if (message.state && playerState.isAlive) { // Aktualizuj tylko jeśli gracz żyje
                // Aktualizuj stan gracza na serwerze
                playerState.x = message.state.x ?? playerState.x;
                playerState.y = message.state.y ?? playerState.y;
                playerState.z = message.state.z ?? playerState.z;
                playerState.rotY = message.state.rotY ?? playerState.rotY;
                playerState.rotZ = message.state.rotZ ?? playerState.rotZ;
                // Klient nie powinien sam sobie ustawiać zdrowia/zabójstw/życia przez update_state
                // playerState.health = message.state.health ?? playerState.health;
                // playerState.kills = message.state.kills ?? playerState.kills;
                // playerState.isAlive = message.state.isAlive ?? playerState.isAlive;
                playerState.last_update = Date.now();

                // Rozgłoś zaktualizowany stan tego gracza do *innych* klientów
                broadcast({ type: 'player_update', player: playerState }, clientId);
            }
            break;

        case 'hit_player':
            const targetId = message.targetId;
            const damage = message.damage ?? 0;
            const targetState = gameState.get(targetId);

            if (targetState && targetState.isAlive && damage > 0) {
                targetState.health -= damage;
                console.log(`Player ${clientId} hit player ${targetId} for ${damage} damage. ${targetState.health} HP left.`);

                let victimKilled = false;
                if (targetState.health <= 0) {
                    targetState.health = 0;
                    targetState.isAlive = false;
                    victimKilled = true;
                    console.log(`Player ${targetId} was killed by ${clientId}.`);

                    // Przyznaj punkt zabójcy
                    playerState.kills++; // Zaktualizuj stan zabójcy na serwerze
                }

                // Rozgłoś zmianę stanu trafionego gracza do WSZYSTKICH
                broadcast({ type: 'player_update', player: targetState });

                // Jeśli gracz został zabity, wyślij dodatkową informację
                if (victimKilled) {
                    broadcast({
                        type: 'player_killed',
                        victimId: targetId,
                        killerId: clientId,
                        killerKills: playerState.kills // Wyślij nowy wynik zabójcy
                    });
                }
            } else {
                // console.log(`Hit ignored: Target ${targetId} not found, dead, or damage is ${damage}`);
            }
            break;

        case 'fire_bullet':
            // Obecnie nie synchronizujemy pocisków, tylko trafienia.
            // console.log(`Player ${clientId} reported firing a bullet.`);
            // Można by rozgłosić: broadcast({ type: 'player_fired', id: clientId, /* info o pocisku */ }, clientId);
            break;

        // Można dodać obsługę wiadomości o śmierci gracza, jeśli klient ma ją zgłaszać
        case 'i_died':
             if (playerState.isAlive) {
                 playerState.isAlive = false;
                 playerState.health = 0; // Na wszelki wypadek
                 console.log(`Player ${clientId} reported death.`);
                 // Rozgłoś aktualizację stanu gracza
                 broadcast({ type: 'player_update', player: playerState });
             }
            break;

        default:
            console.log(`Unknown message type '${message.type}' from ${clientId}`);
            break;
    }
}

function handleClientDisconnect(clientId) {
    if (clients.has(clientId)) {
        console.log(`Client disconnected: ${clientId} (Total remaining: ${clients.size - 1})`);
        clients.delete(clientId);
        gameState.delete(clientId);

        // Poinformuj *pozostałych* klientów, że ten gracz się rozłączył
        broadcast({ type: 'player_left', id: clientId });
    } else {
         console.log(`Attempted to disconnect non-existent client: ${clientId}`);
    }
}

/**
 * Wysyła wiadomość do konkretnego klienta.
 * @param {WebSocket} ws - Obiekt WebSocket klienta.
 * @param {object} messageData - Obiekt wiadomości do wysłania.
 */
function sendMessage(ws, messageData) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(messageData));
    }
}

/**
 * Rozgłasza wiadomość do wszystkich połączonych klientów, opcjonalnie wykluczając jednego.
 * @param {object} messageData - Obiekt wiadomości do rozgłoszenia.
 * @param {number|null} excludeClientId - ID klienta do wykluczenia (lub null).
 */
function broadcast(messageData, excludeClientId = null) {
    const messageString = JSON.stringify(messageData);
    clients.forEach((ws, id) => {
        if (id !== excludeClientId && ws.readyState === WebSocket.OPEN) {
            ws.send(messageString);
        }
    });
}

// Opcjonalnie: Pętla serwera do regularnych zadań (np. sprawdzanie nieaktywności)
/*
setInterval(() => {
    const now = Date.now();
    gameState.forEach((player, id) => {
        // Przykład: Rozłącz nieaktywnych graczy
        // if (now - player.last_update > 30000) { // 30 sekund nieaktywności
        //     console.log(`Disconnecting inactive client ${id}`);
        //     const ws = clients.get(id);
        //     if (ws) ws.close(); // To wywoła zdarzenie 'close'
        //     handleClientDisconnect(id); // Ręczne usunięcie stanu na wszelki wypadek
        // }
    });
}, TICK_RATE);
*/