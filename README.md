<div align="center">

![Sit Any Block](sit_RP/pack_icon.png)

> **Sit on any block in Minecraft Bedrock 1.21.130 — just look at a block and tap SIT**

</div>

# Sit Any Block

A cushion-style sitting addon for Minecraft Bedrock Edition 1.21.130. Look at any block, tap the **SIT** button, and your character sits right on top of it.

## Features
- **SIT Button** — appears when you look at any block
- **Any Block Works** — sit on grass, stone, wood, anything
- **Jump/Crouch to Stand** — jump or sneak to stop sitting
- **Invisible Entity** — clean, no floating objects

## How to Use
1. Download `Sit_Any_Block_v1.0.0.mcaddon`
2. Open the file — Minecraft imports both packs
3. Enable both **Sit Any Block** packs in your world
4. Place command blocks (see `COMMANDS_SETUP.txt`)
5. Look at any block → **SIT** button appears → tap to sit
6. **Jump** or **Crouch** to stand up

## Quick Setup (One Command)
Give yourself a command block:
```
/give @p command_block
```
Then follow the commands in `COMMANDS_SETUP.txt`.

## Requirements
- Minecraft Bedrock Edition 1.21.130+
- Both Behavior Pack and Resource Pack enabled
- Command blocks enabled in world settings

## How It Works
- Invisible interaction entity spawns at the block you're looking at
- Tapping "Sit" mounts you to a sittable entity on that block
- Jumping/crouching triggers dismount and cleanup

## Version
- **v1.0.0** — Initial release with SIT button on any block
