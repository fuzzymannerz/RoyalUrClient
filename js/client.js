//
// This file mediates interactions between the client, the server, the model, and the rendering of the game.
//

console.log("\nCurious how the client works? Check out the source: https://github.com/Sothatsit/RoyalUrClient\n ");

const clientStartTime = getTime();
let resourcesLoadedTime = LONG_TIME_AGO,
    clientFinishSetupTime = LONG_TIME_AGO;

loadResources(setup);

function setup() {
    resourcesLoadedTime = getTime();

    setupElements();
    setInterval(updateRenderStatistics, 1000);

    updateAudioVolumes();
    playSong();

    window.onhashchange = onHashChange;
    if (getHashGameID() !== null) {
        connectToGame(true);
    } else {
        switchToScreen(SCREEN_MENU);
    }

    window.requestAnimationFrame(function() {
        resize();
        redrawLoop();
        finishSetup();
    });
}

function finishSetup() {
    clientFinishSetupTime = getTime();

    if (debugNetwork) {
        reportStartupPerformance();
    }
}

function reportStartupPerformance() {
    const startupDuration = clientFinishSetupTime - clientStartTime,
          resourceLoadDuration = resourcesLoadedTime - clientStartTime,
          setupDuration = clientFinishSetupTime - resourcesLoadedTime,
          resourceLoadPercentage = resourceLoadDuration / startupDuration,
          setupPercentage = setupDuration / startupDuration;

    let report = "\nClient startup took " + (Math.round(startupDuration * 1000 * 10) / 10) + "ms\n";

    report += "  " + (Math.round(resourceLoadPercentage * 1000) / 10) + "% - Resource Loading ";
    report += "(" + (Math.round(resourceLoadDuration * 1000 * 10) / 10) + "ms)\n";

    report += "  " + (Math.round(setupPercentage * 1000) / 10) + "% - Setup ";
    report += "(" + (Math.round(setupDuration * 1000 * 10) / 10) + "ms)\n ";

    console.log(report);
}



//
// MENU
//

function onPlayClick(event) {
    event.stopPropagation();
    switchToScreen(SCREEN_PLAY_SELECT);
}

function onPlayOnline(event) {
    event.stopPropagation();
    connectToGame();
}

function onPlayComputer(event) {
    event.stopPropagation();
    game = new ComputerGame();
    switchToScreen(SCREEN_GAME);
}

function onExitClick(event) {
    event.stopPropagation();
    switchToScreen(SCREEN_MENU);
}

function connectToGame() {
    switchToScreen(SCREEN_CONNECTING);
}



//
// NETWORK : CONNECTING
//

function onNetworkConnecting() {
    if(networkStatus.status === "Lost connection")
        return;

    setNetworkStatus("Connecting", true);
}

function onNetworkConnected() {
    resetGame();

    setNetworkStatus("Connected", false);
    fadeNetworkStatusOut();

    const gameID = getHashGameID();
    if (gameID !== null) {
        sendPacket(writeJoinGamePacket(gameID));
    } else {
        sendPacket(writeFindGamePacket())
    }
}

function onNetworkLoseConnection() {
    setNetworkStatus("Lost connection", true);
    fadeNetworkStatusIn();
}

function onNetworkDisconnect() {
    resetNetworkStatus();
    fadeNetworkStatusOut();
}



//
// NETWORK : GAME
//

function onPacketInvalidGame() {
    disconnect();
    resetNetworkStatus();
    switchToScreen(SCREEN_MENU, true);
    setMessage("Game could not be found", 0, 2, 1)
}

function onPacketGame(gameInfo) {
    game = new OnlineGame();
    setHash(gameInfo.gameID);
    setOwnPlayer(gameInfo.ownPlayer);
    otherPlayer.name = gameInfo.opponentName;
    switchToScreen(SCREEN_GAME);
}

function onPacketMessage(data) {
    game.onPacketMessage(data);
}

function onPacketMove(move) {
    game.onPacketMove(move);
}

function onPacketState(state) {
    game.onPacketState(state);
}



//
// GAME HASH
//

function getHashRaw() {
    if (!window.location.hash)
        return "";
    return window.location.hash.substr(1);
}

function setHash(hash) {
    if (getHashRaw() === hash)
        return;
    history.pushState(null, "Royal Ur", "#" + hash);
}

function resetHash() {
    setHash("");
}

function getHashGameID() {
    const gameID = getHashRaw();
    if (gameID.length !== GAME_ID_LENGTH) {
        resetHash();
        return null;
    }

    return gameID;
}

function onHashChange() {
    if (getHashGameID() !== null) {
        connectToGame();
    } else {
        switchToScreen(SCREEN_MENU);
    }
}
