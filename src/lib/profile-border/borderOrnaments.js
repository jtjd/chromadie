// Authored vector illustrations, not catalog-provided markup. Each ornament
// has its own silhouette and material; the renderer only accepts these paths.
const shape = (d, fill, stroke, width = 1, transform = '') => ({ d, fill, stroke, width, transform });
const line = (d, stroke, width = 1, transform = '') => shape(d, 'none', stroke, width, transform);
const dot = (x, y, r, fill) => shape(`M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0`, fill);
const heart = 'M50 78C40 67 14 53 14 32C14 9 43 8 50 27C58 8 86 9 86 32C86 53 61 67 50 78Z';
const flower = (x, y, size, color, center) => [
  ...[0,72,144,216,288].map(angle => shape('M0 0C-17-8-14-27-4-22L0-18L4-22C14-27 17-8 0 0Z', color, '#a43b7626', .7, `translate(${x} ${y}) scale(${size}) rotate(${angle})`)),
  dot(x,y,size*4,center),
  ...[0,72,144,216,288].map(angle => line('M0-3L0-9', '#a23c66', .7, `translate(${x} ${y}) scale(${size}) rotate(${angle})`))
];
const rose = (x,y,size) => [
  shape('M0-23C13-31 27-19 25-7C37 1 27 17 15 20C9 33-9 27-17 20C-31 19-32 1-23-8C-27-22-9-31 0-23Z','#691331','#2b061c',1,`translate(${x} ${y}) scale(${size})`),
  shape('M-19-9C-8-28 15-20 18-5C31 7 10 22-1 17C-16 24-25 1-19-9Z','#bd2051',undefined,1,`translate(${x} ${y}) scale(${size})`),
  shape('M-14-13C-6-20 10-16 14-7L1-7L-7 6L-13 1Z','#f04776',undefined,1,`translate(${x} ${y}) scale(${size})`),
  shape('M0-10C18-9 17 5 4 14L-8 7L-9-2Z','#771035',undefined,1,`translate(${x} ${y}) scale(${size})`),
  line('M-15-2Q-7 18 8 15M-4-12Q17-13 19 2M-6 3Q-11-7 0-9Q11-8 9 1Q5 10-3 5Q-8 1 0-3L4 0','#ff7c9b',1.3,`translate(${x} ${y}) scale(${size})`)
];

export const BORDER_ORNAMENTS = Object.freeze({
  bow: [
    shape('M43 43C38 63 34 74 23 88L37 86L45 95L54 46Z','#ce326d'),
    shape('M52 43L59 92L66 81L80 85C68 68 64 54 60 43Z','#ed639b'),
    shape('M46 35C29 12 3 5 7 33C0 60 23 65 46 45Z','#e75b98','#9f245b',1),
    shape('M54 35C72 12 97 5 93 33C100 60 77 65 54 45Z','#f486b3','#b33270',1),
    shape('M44 35C30 26 14 19 12 31C23 25 33 36 44 40Z','#ffd2e7'),
    shape('M57 36C70 26 86 17 88 30C78 25 68 35 57 40Z','#ffe0ed'),
    shape('M10 43Q24 56 44 43Q26 48 10 43Z','#b72b67'),
    shape('M57 43Q76 56 91 41Q78 49 57 43Z','#c13c79'),
    shape('M44 31Q51 28 57 33L59 46Q50 52 41 45Z','#f58ab6','#b12c66',1),
    line('M47 34L46 44M36 64L28 82M62 57L68 75','#ffc4dd',2)
  ],
  heart: [
    shape(heart,'#a70d37','#650b2c',2),
    shape('M50 67C36 55 22 45 22 32C22 17 42 18 50 34C60 16 79 18 78 33C76 48 61 58 50 67Z','#f02d5a'),
    line('M27 34Q26 24 36 25','#ffb0c3',4),
    line('M26 80L29 86M76 70L83 73M80 9L83 2','#f7779b',2)
  ],
  sakura: [
    line('M5 95Q18 44 37 27Q61 12 96 5M22 49L9 25M38 28L38 6M57 17L70 32','#7a3b54',3),
    line('M6 93Q19 45 38 29Q62 14 96 7','#cf8c83',1),
    shape('M22 48Q-1 48 9 28Q24 29 22 48Z','#567443'),
    shape('M66 15Q68-1 87 2Q80 17 66 15Z','#739b4e'),
    ...flower(31,31,.85,'#ffb3d3','#ffe6a1'),
    ...flower(12,62,.56,'#ef7aac','#ffdc98'),
    ...flower(69,12,.58,'#ffe1ec','#f4a85c'),
    ...flower(68,37,.42,'#f799c5','#ffdf92')
  ],
  manga: [
    shape('M5 9L31 19L39 0L48 20L70 8L67 29L97 27L76 43L94 58L65 58L69 83L49 69L32 96L27 66L4 72L16 47L0 35L23 31Z','#f6f2ed','#19171b',2),
    shape('M25 27L42 32L48 14L52 34L72 24L65 43L83 50L61 53L58 73L47 58L30 75L32 53L14 51L33 43Z','#e42942'),
    line('M5 95L28 75M1 79L14 66M79 9L68 20M83 0L77 13M88 18L73 27','#f6f2ed',2),
    line('M35 29L43 45L39 58M49 25L52 44L62 49','#17121c',2),
    ...[[82,76],[88,71],[90,83],[75,84],[82,89]].map(([x,y])=>dot(x,y,1.5,'#f6f2ed'))
  ],
  rose: [
    shape('M34 31Q2 15 3 39Q20 48 34 31ZM41 26Q26-2 18 3Q11 23 41 26ZM55 20Q50 0 72 3Q80 17 55 20ZM30 48Q11 44 6 71Q29 71 30 48ZM51 52Q43 84 72 86Q76 62 51 52Z','#293e36','#5a7764',1),
    line('M1 97Q16 47 53 19Q71 10 97 8M11 77L1 64M22 51L7 49M73 14L77 2','#8d9593',1.2),
    ...rose(38,36,.88),
    ...rose(69,14,.46),
    ...rose(15,72,.4)
  ],
  thorn: [
    line('M1 98C24 64 3 40 35 20S71 15 98 1M7 97C13 65 20 41 43 31S74 26 98 9','#929099',2),
    shape('M9 74L0 55L14 64ZM17 47L4 30L24 37ZM32 24L30 4L42 20ZM57 15L67 0L66 15ZM78 12L88 26L74 18ZM27 45L43 48L31 37Z','#c1bdc6','#3e3847',.7),
    line('M14 76Q23 70 21 61M42 31Q38 21 49 19M65 24Q73 15 84 16','#38313f',3),
    shape('M6 88L10 79L14 88L10 94Z','#981738'),
    shape('M82 7L88 2L93 6L87 10Z','#bb2947')
  ],
  angel: [
    shape('M42 38H32V29H24V19H15V8H5V33H10V45H19V53H30V60H43ZM58 38H68V29H76V19H85V8H95V33H90V45H81V53H70V60H57Z','#e5def4','#6d5c8d',1),
    shape('M13 25H19V37H29V46H39V51H27V44H17V36H13ZM87 25H81V37H71V46H61V51H73V44H83V36H87Z','#b19cdb'),
    shape('M36 31H44V37H56V31H64V37H70V49H64V55H58V61H52V67H48V61H42V55H36V49H30V37H36Z','#b18afa','#5a3c8c',1),
    shape('M37 37H43V44H37Z','#fff'),
    shape('M34 10H40V5H60V10H66V15H60V12H40V15H34Z','#f5d984')
  ],
  zine: [
    shape('M2 18L11 20L15 12L24 16L32 9L37 15L48 6L57 11L65 3L77 8L83 2L92 7L97 32L86 30L77 37L66 32L59 40L51 35L40 43L29 37L21 45L13 40L7 47Z','#bbb7b2'),
    line('M11 26L84 13M15 32L88 19M23 36L76 23','#74726f',.7),
    shape('M15 62L30 52L38 67L27 78Z','#dedbd7'),
    line('M66 43L72 64L92 57L78 74L86 94L67 80L50 92L57 72L42 60L64 62Z','#d6ef48',2),
    line('M8 79L24 93M9 91L24 78','#d7d4d0',2)
  ],
  shell: [
    shape('M21 71C-1 59 3 37 18 34C12 11 37 4 47 18C63 3 83 18 78 33C100 39 99 60 78 69L57 91L42 90Z','#f3dac5','#b8998c',1),
    shape('M43 86L19 41L28 36L48 83L42 22L50 23L53 84L72 29L77 36L58 85L87 50L91 57L60 90Z','#dfb4ab'),
    line('M16 45L43 82M33 22L49 80M63 21L55 82M85 42L61 83','#fff1dc',2),
    shape('M43 85Q50 79 60 86L57 94H45Z','#efcbbb'),
    dot(16,82,9,'#c0ede3'),dot(13,79,3,'#f0fff9'),dot(84,81,6,'#eee1d5'),dot(82,79,2,'#fff')
  ],
  bloom: [
    line('M1 96Q25 55 35 29Q54 19 94 8M23 55Q45 60 62 77M43 24Q36 11 32 1','#78aa56',2),
    shape('M16 67Q-2 51 8 36Q26 46 16 67ZM29 41Q14 25 21 11Q39 21 29 41ZM50 21Q51 1 72 2Q68 23 50 21ZM70 15Q79 27 98 18Q91 4 70 15ZM41 61Q41 86 60 92Q67 70 41 61Z','#477746','#8fb66b',.7),
    ...flower(36,30,.72,'#9184ff','#ffd352'),
    ...flower(13,77,.45,'#f8c44f','#6e522c'),
    ...flower(77,12,.42,'#c0b5ff','#ffc94c'),
    ...flower(63,69,.4,'#eeecdb','#e1a93b')
  ]
});

export const BORDER_MOTIFS = Object.freeze({
  chroma: 'bow', glitch: 'heart', gold: 'sakura', neon: 'manga',
  prism: 'rose', void: 'thorn', signal: 'angel', elastic: 'zine',
  'shimmer-track': 'shell', aurora: 'bloom'
});
