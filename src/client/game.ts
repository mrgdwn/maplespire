import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { DungeonScene } from './scenes/DungeonScene.ts';
import { OverlayManager } from './ui/OverlayManager.ts';

export const startMapleSpire = (): void => {
  const uiRoot = document.getElementById('ui-layer');
  if (!uiRoot) return;

  const overlay = new OverlayManager(uiRoot);
  const dungeonScene = new DungeonScene();

  dungeonScene.setCallbacks({
    onHudUpdate: (hud) => overlay.updateRunHud(hud),
    onRequestDraft: (floor, equippedBuffIds, silverMult) =>
      overlay.openDraftModal(floor, equippedBuffIds, silverMult),
    onRequestRoulette: (floor, count, exclude) =>
      overlay.openRouletteModal(floor, count, exclude),
    onRequestExtraction: (floor, gold, shards, cores) =>
      overlay.openExtractionModal(floor, gold, shards, cores),
    onRunEnded: (payload) => overlay.handleRunEnded(payload),
    onRegisterBridge: (bridge) => overlay.setBridge(bridge),
  });

  const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'game-container',
    backgroundColor: '#0b101b',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1024,
      height: 768,
    },
    scene: [dungeonScene],
  };

  new Game(config);
  void overlay.initialize();
};

document.addEventListener('DOMContentLoaded', () => {
  startMapleSpire();
});
