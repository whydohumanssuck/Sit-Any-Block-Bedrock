import { world, system } from "@minecraft/server";

const CHAIR_ITEM = "minecraft:stick";
const SEAT_ENTITY = "cushion:sittable";
const RAY_STEP = 0.3;
const MAX_REACH = 5;

const sittingPlayers = new Map();
let scriptLoaded = false;

// ---- Debug: confirm script is running ----
world.sendMessage("§6[§eSit Any Block§6] §aScript loaded! Hold a stick and right-click a block to sit.");

// ---- Find block the player is looking at ----
function findTargetBlock(player) {
    const eyeY = player.location.y + 1.62;
    const dir = player.getViewDirection();
    let x = player.location.x;
    let y = eyeY;
    let z = player.location.z;

    for (let i = 0; i < MAX_REACH / RAY_STEP; i++) {
        x += dir.x * RAY_STEP;
        y += dir.y * RAY_STEP;
        z += dir.z * RAY_STEP;

        const bx = Math.floor(x);
        const by = Math.floor(y);
        const bz = Math.floor(z);

        const block = player.dimension.getBlock({ x: bx, y: by, z: bz });
        if (block && block.typeId !== "minecraft:air" && block.typeId !== "minecraft:water" && block.typeId !== "minecraft:cave_air") {
            return { x: bx + 0.5, y: by + 1.0, z: bz + 0.5 };
        }
    }
    return null;
}

// ---- Get held item ----
function getHeldItem(player) {
    try {
        const inv = player.getComponent("minecraft:inventory");
        if (!inv || !inv.container) return null;
        const item = inv.container.getSlot(player.selectedSlotIndex);
        if (!item || !item.typeId) return null;
        return item.typeId;
    } catch (e) {
        return null;
    }
}

// ---- Sit down ----
function sitDown(player) {
    const pos = findTargetBlock(player);
    if (!pos) {
        player.sendMessage("§cLook at a solid block to sit!");
        return;
    }

    try {
        const entity = player.dimension.spawnEntity(SEAT_ENTITY, pos);
        player.teleport({ x: pos.x, y: pos.y - 0.5, z: pos.z });

        system.runTimeout(() => {
            try {
                if (entity && entity.isValid) {
                    entity.addRider(player);
                }
            } catch (e) {
                player.sendMessage("§cFailed to sit: " + e);
            }
        }, 3);

        player.onScreenDisplay.setActionBar("§a✔ Sitting — crouch to stand");
        sittingPlayers.set(player.name, { entity, frame: 0 });
    } catch (e) {
        player.sendMessage("§cError: " + e);
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

// ---- RIGHT-CLICK BLOCK = SIT ----
world.afterEvents.itemUseOn.subscribe((event) => {
    try {
        const player = event.source;
        if (!player || !player.isValid) return;

        const item = getHeldItem(player);
        if (item !== CHAIR_ITEM) return;

        if (sittingPlayers.has(player.name)) {
            standUp(player);
        } else {
            sitDown(player);
        }
    } catch (e) {
        world.sendMessage("§c[Sit] Error: " + e);
    }
});

// ---- Also handle itemUse (right-click air) as backup ----
world.afterEvents.itemUse.subscribe((event) => {
    try {
        const player = event.source;
        if (!player || !player.isValid) return;

        const item = getHeldItem(player);
        if (item !== CHAIR_ITEM) return;

        // If already sitting, stand up
        if (sittingPlayers.has(player.name)) {
            standUp(player);
        }
    } catch (e) {}
});

// ---- Crouch to stand up ----
system.runInterval(() => {
    for (const [name, data] of sittingPlayers) {
        const player = world.getAllPlayers().find(p => p.name === name);
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
