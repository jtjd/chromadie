/**
 * One deterministic browser-QA profile. The smoke flow applies the fields
 * that the disposable account can author through Profile Studio, while the
 * full link list is also used by the renderer/unit assertions for continuation
 * link coverage.
 */
export const RICH_PROFILE_FIXTURE = Object.freeze({
  usernamePrefix: 'chromadieqa',
  bio: 'Collecting quiet colors, strange weather, and the small decisions that make a profile feel like home.',
  location: 'Brooklyn, NY',
  timezone: 'America/New_York',
  background: Object.freeze({ width: 637, height: 311, filename: 'qa-background-637x311.png' }),
  avatar: Object.freeze({ width: 151, height: 151, filename: 'qa-avatar-151x151.png' }),
  musicUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
  effects: Object.freeze({
    nameFont: 'name_font_marker_tag',
    nameMaterial: 'name_material_blueprint_ink',
    nameMotion: 'name_motion_typewriter_name',
    avatar: 'avatar_effect_ghost_double',
    border: 'border_celestial',
    atmosphere: 'profile_atmosphere_rain_window',
    cursor: 'cursor_trail_pixel_wake'
  }),
  links: Object.freeze([
    Object.freeze({ type: 'github', label: 'GitHub', url: 'https://github.com/chromadie' }),
    Object.freeze({ type: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@chromadie' }),
    Object.freeze({ type: 'twitch', label: 'Twitch', url: 'https://www.twitch.tv/chromadie' }),
    Object.freeze({ type: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/chromadie/' }),
    Object.freeze({ type: 'website', label: 'Personal site', url: 'https://chromadie.example/' }),
    Object.freeze({ type: 'website', label: 'Portfolio', url: 'https://chromadie.example/portfolio' }),
    Object.freeze({ type: 'website', label: 'Project notes', url: 'https://chromadie.example/notes' }),
    Object.freeze({ type: 'website', label: 'Now playing', url: 'https://chromadie.example/now' }),
    Object.freeze({ type: 'other', label: 'Field guide', url: 'https://chromadie.example/field-guide' }),
    Object.freeze({ type: 'other', label: 'Contact', url: 'https://chromadie.example/contact' })
  ])
});
