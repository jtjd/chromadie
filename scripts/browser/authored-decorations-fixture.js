import { mount, unmount } from 'svelte';
import Fixture from './authored-decorations-fixture.svelte';
export function mountDecorationStudy(target) {
  const instance = mount(Fixture, { target });
  return () => unmount(instance);
}
