import { world, system } from "@minecraft/server";

// =====================================================
// Sit Any Block - Automatic Sitting (No Command Blocks)
// Hold a stick → right-click any block → you sit!
// Crouch → you stand up
// =====================================================

const CHAIR_ITEM = "minecraft:stick";
const SEAT_ENTITY = "cushion:sittable";
const RAY_STEP = 0.3;
const MAX_REACH = 5;

// Track who is sitting
const sittingPlayers = new Map();

// ---- Find the block the player is looking at ----
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

        const block = player.dimension.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) });
        if (block && block.typeId !== "minecraft:air" && block.typeId !== "minecraft:water") {
            return { x: Math.floor(x) + 0.5, y: Math.floor(y) + 1.0, z: Math.floor(z) + 0.5 };
        }
    }
    return null;
}

// ---- Get held item ----
function getHeldItem(player) {
    const inv = player.getComponent("minecraft:inventory").container;
    const item = inv.getSlot(player.selectedSlotIndex);
    return item?.typeId ?? null;
}

// ---- Sit down ----
function sitDown(player) {
    const pos = findTargetBlock(player);
    if (!pos) return;

    const entity = player.dimension.spawnEntity(SEAT_ENTITY, pos);
    player.teleport({ x: pos.x, y: pos.y - 0.5, z: pos.z });
    system.runTimeout(() => {
        try { entity.addRider(player); } catch (e) {}
    }, 2);

    player.onScreenDisplay.setActionBar("§a✔ Sitting — crouch to stand");
    sittingPlayers.set(player.name, { entity, frame: 0 });
}

// ---- Stand up ----
function standUp(player) {
    const data = sittingPlayers.get(player.name);
    if (!data) return;

    try { data.entity.removeRider(player); } catch (e) {}
    try { data.entity.remove(); } catch (e) {}

    player.onScreenDisplay.setActionBar("§eStood up");
    sittingPlayers.delete(player.name);
}

// ---- Block right-click = SIT ----
world.afterEvents.itemUseOn.subscribe((event) => {
    const player = event.source;
    if (!player?.isValid) return;

    const item = getHeldItem(player);
    if (item !== CHAIR_ITEM) return;

    if (sittingPlayers.has(player.name)) {
        standUp(player);
    } else {
        sitDown(player);
    }
});

// ---- Crouch to stand up (every tick) ----
system.runInterval(() => {
    for (const [name, data] of sittingPlayers) {
        const player = world.getAllPlayers().find(p => p.name === name);
        if (!player?.isValid) {
            try { data.entity.remove(); } catch (e) {}
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

world.sendMessage("§6[§eSit Any Block§6] §fHold a stick and right-click any block to sit!");
