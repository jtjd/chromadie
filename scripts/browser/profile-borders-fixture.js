import { mount, unmount } from 'svelte';
import Fixture from './profile-borders-fixture.svelte';
export function mountBorderStudy(target) {
  const instance = mount(Fixture, { target });
  return () => unmount(instance);
}
