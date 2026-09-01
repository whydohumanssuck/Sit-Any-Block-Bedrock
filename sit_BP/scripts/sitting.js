import { world, system } from "@minecraft/server";

// =====================================================
// Sit Any Block - Using Create mod's method
// =====================================================

const CHAIR_ITEM = "minecraft:stick";
const SEAT_ENTITY = "cushion:sittable";
const sittingPlayers = new Map();

world.sendMessage("§6[§eSit§6] §aScript loaded!");

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
        if (block && block.typeId !== "minecraft:air" && block.typeId !== "minecraft:water" &&
            block.typeId !== "minecraft:cave_air" && block.typeId !== "minecraft:void_air") {
            return { x: bx + 0.5, y: by + 1, z: bz + 0.5 };
        }
    }
    return null;
}

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

// ---- THE KEY METHOD: use rideable component's addRider ----
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
        // Check for existing seat at target (like Create mod does)
        const entities = player.dimension.getEntities({
            location: pos,
            maxDistance: 0.5,
            type: SEAT_ENTITY
        });
        let seat = entities.length > 0 ? entities[0] : null;

        // Spawn if no seat exists
        if (!seat) {
            seat = player.dimension.spawnEntity(SEAT_ENTITY, pos);
        }

        // Get the RIDEABLE COMPONENT (not the entity)
        const rideable = seat.getComponent("rideable");
        if (!rideable) {
            player.sendMessage("§cSeat entity missing rideable component!");
            return;
        }

        // Check if seat is occupied
        if (rideable.getRiders().length > 0) {
            player.sendMessage("§cSeat is occupied!");
            return;
        }

        // Mount player using the COMPONENT method (like Create mod)
        rideable.addRider(player);

        player.onScreenDisplay.setActionBar("§aSitting - crouch to stand");
        sittingPlayers.set(player.name, { entity: seat, frame: 0 });

    } catch (e) {
        player.sendMessage("§cSit error: " + e);
    }
}

function standUp(player) {
    const data = sittingPlayers.get(player.name);
    if (!data) return;
    try {
        if (data.entity && data.entity.isValid) {
            const rideable = data.entity.getComponent("rideable");
            if (rideable) {
                const riders = rideable.getRiders();
                for (const rider of riders) {
                    try { rideable.removeRider(rider); } catch (e) {}
                }
            }
            data.entity.remove();
        }
    } catch (e) {}
    player.onScreenDisplay.setActionBar("§eStood up");
    sittingPlayers.delete(player.name);
}

world.afterEvents.itemUse.subscribe(function (event) {
    try {
        const player = event.source;
        if (!player || !player.isValid) return;
        if (!isHoldingStick(player)) return;
        sitDown(player);
    } catch (e) {}
});

system.runInterval(function () {
    const entries = Array.from(sittingPlayers.entries());
    for (let i = 0; i < entries.length; i++) {
        const name = entries[i][0];
        const data = entries[i][1];
        let player = null;
        const allPlayers = world.getAllPlayers();
        for (let j = 0; j < allPlayers.length; j++) {
            if (allPlayers[j].name === name) { player = allPlayers[j]; break; }
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
