import { mount } from 'svelte';
import Fixture from './avatar-creatures-fixture.svelte';
export function mountCreatureStudy(target) { return mount(Fixture, { target }); }
