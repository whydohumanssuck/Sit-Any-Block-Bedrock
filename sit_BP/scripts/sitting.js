import { world, system } from "@minecraft/server";

// =====================================================
// Sit Any Block - Fixed version
// Hold stick + right-click = sit on any block
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

        const bx = Math.floor(x);
        const by = Math.floor(y);
        const bz = Math.floor(z);

        const block = player.dimension.getBlock({ x: bx, y: by, z: bz });
        if (block && block.typeId !== "minecraft:air" &&
            block.typeId !== "minecraft:water" &&
            block.typeId !== "minecraft:cave_air" &&
            block.typeId !== "minecraft:void_air") {
            return { x: bx + 0.5, y: by + 1, z: bz + 0.5 };
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

// ---- Sit: spawn seat at player, mount, then move to block ----
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
        // Step 1: Spawn seat at PLAYER position (safe, no block collision)
        const seat = player.dimension.spawnEntity(SEAT_ENTITY, {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z
        });

        // Step 2: Mount player IMMEDIATELY (same tick, no delay)
        seat.addRider(player);

        // Step 3: Move the seat (with rider) to the block
        system.runTimeout(function () {
            try {
                if (seat && seat.isValid) {
                    seat.teleport(pos);
                }
            } catch (e) {}
        }, 1);

        player.onScreenDisplay.setActionBar("§aSitting - crouch to stand");
        sittingPlayers.set(player.name, { entity: seat, frame: 0 });

    } catch (e) {
        player.sendMessage("§cSit error: " + e);
    }
}

// ---- Stand up ----
function standUp(player) {
    const data = sittingPlayers.get(player.name);
    if (!data) return;

    try {
        if (data.entity && data.entity.isValid) {
            data.entity.removeRider(player);
            data.entity.remove();
        }
    } catch (e) {}

    player.onScreenDisplay.setActionBar("§eStood up");
    sittingPlayers.delete(player.name);
}

// ---- RIGHT-CLICK ----
world.afterEvents.itemUse.subscribe(function (event) {
    try {
        const player = event.source;
        if (!player || !player.isValid) return;
        if (!isHoldingStick(player)) return;
        sitDown(player);
    } catch (e) {}
});

// ---- CROUCH TO STAND ----
system.runInterval(function () {
    const entries = Array.from(sittingPlayers.entries());
    for (let i = 0; i < entries.length; i++) {
        const name = entries[i][0];
        const data = entries[i][1];

        let player = null;
        const allPlayers = world.getAllPlayers();
        for (let j = 0; j < allPlayers.length; j++) {
            if (allPlayers[j].name === name) {
                player = allPlayers[j];
                break;
            }
        }

        if (!player || !player.isValid) {
            try { if (data.entity && data.entity.isValid) data.entity.remove(); } catch (e) {}
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
