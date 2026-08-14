/**
 * Build the selected-media work list without mutating configuration data.
 *
 * Audio references are deliberately tagged by target: the standalone audio
 * selection and each playlist track are different configuration fields even
 * when they point at the same physical legacy object.
 */
export function selectedRows(configurations = []) {
  const selected = new Map();
  const add = (userId, kind, assetId, storagePath, target = 'standalone') => {
    if (!assetId && !storagePath) return;
    const key = assetId || `${userId}:${kind}:${storagePath || ''}`;
    const existing = selected.get(key) || { userId, kind, assetId, storagePath, references: [] };
    existing.references.push({ userId, kind, assetId, storagePath, target });
    selected.set(key, existing);
  };

  for (const config of configurations) {
    for (const [kind, idField, pathField] of [
      ['avatar', 'avatar_asset_id', 'avatar_path'],
      ['background', 'background_asset_id', 'background_path'],
      ['audio', 'audio_asset_id', 'audio_path'],
      ['background_video', 'background_video_asset_id', 'background_video_path'],
      ['banner', 'banner_asset_id', 'banner_path'],
      ['cursor', 'cursor_asset_id', 'cursor_path'],
      ['pointer_cursor', 'pointer_cursor_asset_id', 'pointer_cursor_path']
    ]) add(config.user_id, kind, config[idField], config[pathField], 'standalone');

    const tracks = Array.isArray(config.audio_playlist?.tracks) ? config.audio_playlist.tracks : [];
    for (const track of tracks) add(config.user_id, 'audio', track.asset_id, track.path, 'playlist_track');
  }
  return [...selected.values()];
}
