function normalizeStoragePath(path) {
  return String(path ?? '').replace(/^\/+/, '');
}

function buildPublicStorageUrl(storageUrl, bucket, path, options = {}) {
  const cleanPath = normalizeStoragePath(path);
  const query = new URLSearchParams();

  if (options?.download) {
    query.set('download', options.download === true ? '' : String(options.download));
  }

  if (options?.transform && typeof options.transform === 'object') {
    for (const [key, value] of Object.entries(options.transform)) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
  }

  if (options?.cacheNonce != null) query.set('cacheNonce', String(options.cacheNonce));

  const hasTransform = options?.transform
    && typeof options.transform === 'object'
    && Object.keys(options.transform).length > 0;
  const renderPath = hasTransform ? 'render/image' : 'object';
  const publicUrl = encodeURI(`${storageUrl}/${renderPath}/public/${bucket}/${cleanPath}`);

  return {
    data: {
      publicUrl: query.toString() ? `${publicUrl}?${query.toString()}` : publicUrl
    }
  };
}

function createUnavailableStorageClient(message) {
  const error = new Error(message);
  return {
    from() {
      return {
        getPublicUrl() {
          return { data: { publicUrl: '' } };
        },
        remove() {
          return Promise.resolve({ data: null, error });
        }
      };
    }
  };
}

export function createLazyStorageClient({ storageUrl, headers, fetch, unavailableMessage = '' }) {
  const request = async (url, init) => {
    if (unavailableMessage) return { data: null, error: new Error(unavailableMessage) };

    try {
      const response = await fetch(url, init);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.message || payload?.error || response.statusText || 'Storage request failed';
        return { data: null, error: new Error(message) };
      }
      return { data: payload, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Storage request failed') };
    }
  };

  return {
    from(bucket) {
      return {
        getPublicUrl(path, options) {
          return buildPublicStorageUrl(storageUrl, bucket, path, options);
        },
        remove(paths) {
          return request(`${storageUrl}/object/${encodeURIComponent(bucket)}`, {
            method: 'DELETE',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefixes: paths.map(normalizeStoragePath) })
          });
        }
      };
    }
  };
}

export { createUnavailableStorageClient };
