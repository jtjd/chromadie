export function partitionProfileMediaValidationAssets(assets = []) {
  const active = (Array.isArray(assets) ? assets : []).filter(asset => !asset.status || asset.status === 'active');
  return {
    assets: active.filter(asset => asset.storage_provider !== 'r2' || Number(asset.content_validation_version) === 1),
    unverifiedAssets: active.filter(asset => asset.storage_provider === 'r2'
      && asset.delivery_status === 'ready'
      && Number(asset.content_validation_version) !== 1)
  };
}

export function hasProfileMediaRevalidationHash(asset) {
  return /^[0-9a-f]{64}$/i.test(String(asset?.content_hash_sha256 || ''));
}
