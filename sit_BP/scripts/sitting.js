import { world, system } from "@minecraft/server";

// =====================================================
// Sit Any Block - Hold stick + right-click = sit
// =====================================================

const CHAIR_ITEM = "minecraft:stick";
const SEAT_ENTITY = "cushion:sittable";

const sittingPlayers = new Map();

world.sendMessage("§6[§eSit§6] §aScript loaded!");

// ---- Find block player is looking at ----
function findTargetBlock(player) {
    const eyeY = player.location.y + 1.62;
    const dir = player.getViewDirection();
    let x = player.location.x;
    let y = eyeY;
    let z = player.location.z;

    for (let i = 0; i < 16; i++) {
        x += dir.x * 0.3;
        y += dir.y * 0.3;
        z += dir.z * 0.3;

        const block = player.dimension.getBlock({
            x: Math.floor(x),
            y: Math.floor(y),
            z: Math.floor(z)
        });

        if (block && block.typeId !== "minecraft:air" &&
            block.typeId !== "minecraft:water" &&
            block.typeId !== "minecraft:cave_air" &&
            block.typeId !== "minecraft:void_air") {
            return {
                x: Math.floor(x) + 0.5,
                y: Math.floor(y) + 1.0,
                z: Math.floor(z) + 0.5
            };
        }
    }
    return null;
}

// ---- Check if holding stick ----
function isHoldingStick(player) {
    try {
        const inv = player.getComponent("minecraft:inventory");
        if (!inv || !inv.container) return false;
        const slot = inv.container.getSlot(player.selectedSlotIndex);
        return slot && slot.typeId === CHAIR_ITEM;
    } catch (e) {
        return false;
    }
}

// ---- Sit ----
function sitDown(player) {
    if (sittingPlayers.has(player.name)) {
        standUp(player);
        return;
    }

    const pos = findTargetBlock(player);
    if (!pos) {
        player.sendMessage("§cLook at a block to sit!");
        return;
    }

    try {
        const entity = player.dimension.spawnEntity(SEAT_ENTITY, pos);
        player.teleport({ x: pos.x, y: pos.y - 0.5, z: pos.z });

        system.runTimeout(function () {
            try {
                if (entity && entity.isValid) {
                    entity.addRider(player);
                }
            } catch (err) {
                // ignore
            }
        }, 3);

        player.onScreenDisplay.setActionBar("§aSitting - crouch to stand");
        sittingPlayers.set(player.name, { entity: entity, frame: 0 });
    } catch (e) {
        // ignore
    }
}

// ---- Stand ----
function standUp(player) {
    const data = sittingPlayers.get(player.name);
    if (!data) return;

    try {
        if (data.entity && data.entity.isValid) {
            data.entity.removeRider(player);
            data.entity.remove();
        }
    } catch (e) {
        // ignore
    }

    player.onScreenDisplay.setActionBar("§eStood up");
    sittingPlayers.delete(player.name);
}

// ---- RIGHT-CLICK (use item) ----
world.afterEvents.itemUse.subscribe(function (event) {
    try {
        const player = event.source;
        if (!player || !player.isValid) return;
        if (!isHoldingStick(player)) return;

        sitDown(player);
    } catch (e) {
        // ignore
    }
});

// ---- CROUCH TO STAND ----
system.runInterval(function () {
    const entries = Array.from(sittingPlayers.entries());
    for (let i = 0; i < entries.length; i++) {
        const name = entries[i][0];
        const data = entries[i][1];

        const players = world.getAllPlayers();
        let player = null;
        for (let j = 0; j < players.length; j++) {
            if (players[j].name === name) {
                player = players[j];
                break;
            }
        }

        if (!player || !player.isValid) {
            try {
                if (data.entity && data.entity.isValid) data.entity.remove();
            } catch (e) {}
            sittingPlayers.delete(name);
            continue;
        }

        data.frame++;
        if (data.frame < 4) continue;

        if (player.isSneaking) {
            standUp(player);
        }
    }
}, 1);
