import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MinigamesService } from './minigames.service';
import { AuthService } from '../../shared/auth/auth.service';

interface PinpointPuzzle {
  answer: string;
  clues: string[];
}

const WORDLE_MAX_GUESSES = 6;
const WORDLE_LEN = 5;

const WORDLE_WORDS = [
  'crane','slate','trace','adieu','audio','raise','arise','stare','snare','share',
  'shore','store','score','scare','spare','stale','scale','shale','shame','shake',
  'shape','shade','shave','shale','brave','grave','graze','grace','grape','grade',
  'grate','great','greet','green','greed','breed','bread','break','bream','dream',
  'dread','tread','treat','trend','blend','bleed','bleak','bleat','clear','clean',
  'cream','creak','cheat','cheap','chest','crest','crisp','crimp','crispy','crush',
  'trust','trail','train','brain','brains','drain','grain','plain','claim','flame',
  'place','plane','plant','plank','blank','black','blade','blast','bland','bland',
  'brand','braid','brace','brown','crown','crowd','croud','cloud','clout','clown',
  'cloth','cloak','clock','block','blown','blood','bloom','broom','brook','brood',
  'flood','floor','floss','flout','float','flock','flick','flair','flame','flare',
  'flake','flank','flask','flash','flesh','fresh','press','dress','cress','stress',
  'bless','chess','guess','truss','trust','dross','gloss','floss','gross','cross',
  'frost','broth','cloth','froth','sloth','truth','youth','south','mouth','shout',
  'stout','scout','snout','about','trout','clout','grout','grout','proud','cloud',
  'found','bound','round','sound','wound','pound','mound','hound','ground','stump',
  'clump','plump','trump','thump','flump','slump','chump','grump','stung','sting',
  'bring','cling','fling','sling','swing','sting','thing','prong','wrong','prawn',
  'drawn','brawn','spawn','swamp','stomp','stamp','tramp','cramp','clamp','champ',
  'stash','crash','clash','flash','gnash','brash','thrash','slash','latch','catch',
  'hatch','match','patch','watch','fetch','retch','sketch','notch','botch','hutch',
  'witch','ditch','pitch','stitch','bunch','hunch','lunch','punch','crunch','munch',
  'perch','merge','verge','forge','gorge','purge','surge','lurge','judge','nudge',
  'budge','fudge','hedge','ledge','wedge','sedge','ridge','bridge','midge','lodge',
  'badge','cadge','cadge','plaid','braid','fraud','creed','freed','greed','treed',
  'kneel','steel','wheel','dweel','steal','squeal','zeal','meal','deal','heal',
  'field','yield','wield','fiend','blend','lend','trend','spend','blend','mend',
  'light','night','sight','tight','right','might','fight','bight','plight','flight',
  'cloth','broth','froth','sloth','troth','worth','forth','north','short','sport',
  'snort','abort','exert','alert','blurt','flirt','shirt','skirt','squirt','spurt',
  'swirl','twirl','whirl','curly','burly','surly','early','pearly','world','swore',
  'shore','score','snore','adore','chore','spore','store','crore','before','ignore',
];

// Curated puzzles — all 5 clues converge on exactly one answer (hardest → easiest)
const PINPOINT_PUZZLES: PinpointPuzzle[] = [
  { answer: 'ocean',      clues: ['Bathypelagic', 'Trench', 'Tide', 'Coral', 'Waves'] },
  { answer: 'tiger',      clues: ['Bengal', 'Stripes', 'Pounce', 'Jungle', 'Roar'] },
  { answer: 'piano',      clues: ['Ivory', 'Pedal', 'Keys', 'Beethoven', 'Keyboard'] },
  { answer: 'castle',     clues: ['Moat', 'Turret', 'Drawbridge', 'Fortress', 'Chess'] },
  { answer: 'dragon',     clues: ['Scales', 'Medieval', 'Legend', 'Wings', 'Fire'] },
  { answer: 'spider',     clues: ['Venom', 'Fangs', 'Eight legs', 'Web', 'Silk'] },
  { answer: 'pizza',      clues: ['Dough', 'Mozzarella', 'Slice', 'Italy', 'Oven'] },
  { answer: 'coffee',     clues: ['Espresso', 'Roast', 'Barista', 'Beans', 'Mug'] },
  { answer: 'guitar',     clues: ['Fret', 'Chord', 'Strum', 'Strings', 'Rock'] },
  { answer: 'rocket',     clues: ['Thrust', 'Orbit', 'Booster', 'Launch', 'Space'] },
  { answer: 'island',     clues: ['Atoll', 'Isolated', 'Tropical', 'Shore', 'Palm'] },
  { answer: 'jungle',     clues: ['Canopy', 'Vines', 'Humid', 'Dense', 'Wild'] },
  { answer: 'doctor',     clues: ['Diagnosis', 'Prescription', 'Stethoscope', 'Clinic', 'Heal'] },
  { answer: 'winter',     clues: ['Blizzard', 'Frost', 'Hibernate', 'Cold', 'Snow'] },
  { answer: 'summer',     clues: ['Humid', 'Vacation', 'Sunscreen', 'Beach', 'Hot'] },
  { answer: 'circus',     clues: ['Trapeze', 'Acrobat', 'Juggle', 'Clown', 'Tent'] },
  { answer: 'market',     clues: ['Stall', 'Vendor', 'Barter', 'Bazaar', 'Trade'] },
  { answer: 'bridge',     clues: ['Suspension', 'Arch', 'Span', 'River', 'Cross'] },
  { answer: 'garden',     clues: ['Soil', 'Trowel', 'Mulch', 'Weed', 'Bloom'] },
  { answer: 'museum',     clues: ['Curator', 'Artifact', 'Exhibit', 'Gallery', 'History'] },
  { answer: 'temple',     clues: ['Shrine', 'Incense', 'Ancient', 'Pillar', 'Sacred'] },
  { answer: 'palace',     clues: ['Opulence', 'Courtyard', 'Royalty', 'Throne', 'King'] },
  { answer: 'harbor',     clues: ['Berth', 'Dock', 'Anchor', 'Port', 'Ships'] },
  { answer: 'canyon',     clues: ['Erosion', 'Gorge', 'Colorado', 'Ravine', 'Cliff'] },
  { answer: 'thunder',    clues: ['Lightning', 'Storm', 'Rumble', 'Crack', 'Boom'] },
  { answer: 'crystal',    clues: ['Quartz', 'Facet', 'Lattice', 'Clear', 'Gem'] },
  { answer: 'vampire',    clues: ['Coffin', 'Nocturnal', 'Fangs', 'Blood', 'Cape'] },
  { answer: 'wizard',     clues: ['Incantation', 'Spell', 'Potion', 'Wand', 'Magic'] },
  { answer: 'knight',     clues: ['Joust', 'Squire', 'Armor', 'Lance', 'Medieval'] },
  { answer: 'pirate',     clues: ['Plank', 'Parrot', 'Skull', 'Loot', 'Ship'] },
  { answer: 'cowboy',     clues: ['Lasso', 'Spur', 'Ranch', 'Wrangler', 'Hat'] },
  { answer: 'safari',     clues: ['Binoculars', 'Savanna', 'Jeep', 'Wild', 'Animals'] },
  { answer: 'desert',     clues: ['Oasis', 'Dune', 'Mirage', 'Arid', 'Sand'] },
  { answer: 'forest',     clues: ['Canopy', 'Moss', 'Fern', 'Deer', 'Trees'] },
  { answer: 'glacier',    clues: ['Crevasse', 'Arctic', 'Melt', 'Frozen', 'Ice'] },
  { answer: 'volcano',    clues: ['Magma', 'Caldera', 'Ash', 'Lava', 'Eruption'] },
  { answer: 'diamond',    clues: ['Carat', 'Facet', 'Carbon', 'Brilliant', 'Gem'] },
  { answer: 'penguin',    clues: ['Antarctic', 'Waddle', 'Flipper', 'Tuxedo', 'Ice'] },
  { answer: 'dolphin',    clues: ['Echolocation', 'Pod', 'Flipper', 'Aquatic', 'Smart'] },
  { answer: 'parrot',     clues: ['Mimic', 'Tropical', 'Exotic', 'Beak', 'Bird'] },
  { answer: 'monkey',     clues: ['Primate', 'Swing', 'Banana', 'Tree', 'Tail'] },
  { answer: 'rabbit',     clues: ['Warren', 'Burrow', 'Hutch', 'Easter', 'Hop'] },
  { answer: 'turtle',     clues: ['Shell', 'Ancient', 'Reptile', 'Slow', 'Sea'] },
  { answer: 'snake',      clues: ['Venom', 'Scales', 'Fangs', 'Slither', 'Coil'] },
  { answer: 'eagle',      clues: ['Raptor', 'Soar', 'Talon', 'Bald', 'Sky'] },
  { answer: 'falcon',     clues: ['Dive', 'Raptor', 'Swoop', 'Hunt', 'Speed'] },
  { answer: 'whale',      clues: ['Blowhole', 'Migrate', 'Pod', 'Baleen', 'Ocean'] },
  { answer: 'shark',      clues: ['Fin', 'Prey', 'Teeth', 'Jaw', 'Predator'] },
  { answer: 'horse',      clues: ['Mane', 'Gallop', 'Saddle', 'Stable', 'Ride'] },
  { answer: 'camel',      clues: ['Hump', 'Caravan', 'Sahara', 'Desert', 'Thirst'] },
  { answer: 'lion',       clues: ['Mane', 'Roar', 'Pride', 'Savanna', 'King'] },
  { answer: 'zebra',      clues: ['Stripes', 'Savanna', 'Herd', 'Africa', 'Wild'] },
  { answer: 'giraffe',    clues: ['Tallest', 'Neck', 'Savanna', 'Spots', 'Africa'] },
  { answer: 'elephant',   clues: ['Tusk', 'Trunk', 'Ivory', 'Herd', 'Largest'] },
  { answer: 'gorilla',    clues: ['Silverback', 'Primate', 'Chest beat', 'Jungle', 'Ape'] },
  { answer: 'leopard',    clues: ['Spots', 'Nocturnal', 'Camouflage', 'Pounce', 'Cat'] },
  { answer: 'cheetah',    clues: ['Fastest', 'Sprint', 'Savanna', 'Spots', 'Cat'] },
  { answer: 'jaguar',     clues: ['Amazon', 'Rosette', 'Stealthy', 'Pounce', 'Cat'] },
  { answer: 'panda',      clues: ['Bamboo', 'Endangered', 'China', 'Black-white', 'Bear'] },
  { answer: 'maple',      clues: ['Syrup', 'Canada', 'Autumn', 'Leaf', 'Tree'] },
  { answer: 'cedar',      clues: ['Aromatic', 'Lebanon', 'Durable', 'Evergreen', 'Wood'] },
  { answer: 'bamboo',     clues: ['Panda', 'Hollow', 'Fast', 'Stalks', 'Grass'] },
  { answer: 'cactus',     clues: ['Spine', 'Succulent', 'Drought', 'Prickle', 'Desert'] },
  { answer: 'orchid',     clues: ['Exotic', 'Fragile', 'Fragrant', 'Tropical', 'Flower'] },
  { answer: 'violet',     clues: ['Purple', 'Shy', 'Fragrant', 'Petals', 'Small'] },
  { answer: 'daisy',      clues: ['Chain', 'Meadow', 'White', 'Petals', 'Flower'] },
  { answer: 'tulip',      clues: ['Holland', 'Bulb', 'Spring', 'Cup', 'Bloom'] },
  { answer: 'lotus',      clues: ['Muddy', 'Buddhism', 'Float', 'Sacred', 'Pink'] },
  { answer: 'fern',       clues: ['Spore', 'Frond', 'Shaded', 'Ancient', 'Green'] },
  { answer: 'copper',     clues: ['Penny', 'Wire', 'Pipe', 'Tarnish', 'Metal'] },
  { answer: 'silver',     clues: ['Tarnish', 'Lustrous', 'Lunar', 'Mirror', 'Metal'] },
  { answer: 'marble',     clues: ['Quarry', 'Veins', 'Smooth', 'Statue', 'Stone'] },
  { answer: 'granite',    clues: ['Rough', 'Countertop', 'Intrusive', 'Igneous', 'Rock'] },
  { answer: 'velvet',     clues: ['Plush', 'Rope', 'Soft', 'Royal', 'Fabric'] },
  { answer: 'cotton',     clues: ['Boll', 'Weave', 'Breathable', 'Natural', 'Fiber'] },
  { answer: 'leather',    clues: ['Tan', 'Hide', 'Durable', 'Cowhide', 'Skin'] },
  { answer: 'rubber',     clues: ['Elastic', 'Latex', 'Bounce', 'Stretch', 'Band'] },
  { answer: 'plastic',    clues: ['Polymer', 'Mold', 'Synthetic', 'Flexible', 'Material'] },
  { answer: 'bronze',     clues: ['Alloy', 'Patina', 'Medal', 'Copper-tin', 'Metal'] },
  { answer: 'butter',     clues: ['Churn', 'Spread', 'Dairy', 'Yellow', 'Melt'] },
  { answer: 'cheese',     clues: ['Curd', 'Brie', 'Aged', 'Rind', 'Dairy'] },
  { answer: 'pepper',     clues: ['Mill', 'Grind', 'Spice', 'Black', 'Hot'] },
  { answer: 'ginger',     clues: ['Root', 'Snap', 'Ale', 'Warm', 'Spice'] },
  { answer: 'garlic',     clues: ['Clove', 'Bulb', 'Pungent', 'Herb', 'Cook'] },
  { answer: 'lemon',      clues: ['Sour', 'Citrus', 'Zest', 'Yellow', 'Squeeze'] },
  { answer: 'mango',      clues: ['Tropical', 'Stone', 'Juice', 'Orange', 'Sweet'] },
  { answer: 'cherry',     clues: ['Pit', 'Stem', 'Red', 'Blossom', 'Sweet'] },
  { answer: 'peach',      clues: ['Fuzz', 'Soft', 'Georgia', 'Pit', 'Fruit'] },
  { answer: 'grape',      clues: ['Vine', 'Bunch', 'Wine', 'Purple', 'Harvest'] },
  { answer: 'storm',      clues: ['Gale', 'Thunder', 'Rain', 'Lightning', 'Dark'] },
  { answer: 'breeze',     clues: ['Gentle', 'Cool', 'Rustling', 'Soft', 'Wind'] },
  { answer: 'frost',      clues: ['Crystal', 'Icy', 'Morning', 'White', 'Cold'] },
  { answer: 'smoke',      clues: ['Signal', 'Haze', 'Chimney', 'Gray', 'Fire'] },
  { answer: 'flame',      clues: ['Flicker', 'Blaze', 'Candle', 'Burn', 'Light'] },
  { answer: 'steam',      clues: ['Pressure', 'Boil', 'Fog', 'Engine', 'Hot'] },
  { answer: 'shadow',     clues: ['Silhouette', 'Dark', 'Shade', 'Follow', 'Light'] },
  { answer: 'mirror',     clues: ['Silver', 'Reflect', 'Glass', 'Reverse', 'Face'] },
  { answer: 'candle',     clues: ['Wax', 'Drip', 'Wick', 'Glow', 'Flame'] },
  { answer: 'lantern',    clues: ['Hang', 'Carry', 'Glow', 'Old', 'Light'] },
  { answer: 'anchor',     clues: ['Chain', 'Drop', 'Weight', 'Hold', 'Ship'] },
  { answer: 'compass',    clues: ['Needle', 'North', 'Bearing', 'Navigate', 'Direction'] },
  { answer: 'ladder',     clues: ['Rung', 'Climb', 'Lean', 'Height', 'Steps'] },
  { answer: 'hammer',     clues: ['Forge', 'Nail', 'Strike', 'Tool', 'Drive'] },
  { answer: 'shovel',     clues: ['Blade', 'Dig', 'Scoop', 'Dirt', 'Earth'] },
  { answer: 'needle',     clues: ['Eye', 'Thread', 'Sharp', 'Sew', 'Point'] },
  { answer: 'ribbon',     clues: ['Bow', 'Prize', 'Wrap', 'Silk', 'Tie'] },
  { answer: 'button',     clues: ['Stitch', 'Sew', 'Press', 'Click', 'Fastener'] },
  { answer: 'zipper',     clues: ['Slider', 'Pull', 'Teeth', 'Close', 'Fasten'] },
  { answer: 'pocket',     clues: ['Hidden', 'Billiard', 'Square', 'Lint', 'Pouch'] },
  { answer: 'helmet',     clues: ['Visor', 'Strap', 'Protect', 'Head', 'Guard'] },
  { answer: 'shield',     clues: ['Crest', 'Deflect', 'Coat-of-arms', 'Defend', 'Block'] },
  { answer: 'sword',      clues: ['Hilt', 'Scabbard', 'Duel', 'Forge', 'Blade'] },
  { answer: 'arrow',      clues: ['Quiver', 'Bow', 'Aim', 'Point', 'Target'] },
  { answer: 'cannon',     clues: ['Ball', 'Powder', 'Boom', 'Fire', 'Iron'] },
  { answer: 'trumpet',    clues: ['Valve', 'Brass', 'Fanfare', 'Blow', 'Jazz'] },
  { answer: 'violin',     clues: ['Rosin', 'Bow', 'String', 'Pitch', 'Classical'] },
  { answer: 'drums',      clues: ['Cymbal', 'Sticks', 'Beat', 'Kit', 'Rhythm'] },
  { answer: 'flute',      clues: ['Breath', 'Key', 'Woodwind', 'Blow', 'Orchestra'] },
  { answer: 'harp',       clues: ['Pluck', 'Angel', 'Pedal', 'Gold', 'Strings'] },
  { answer: 'throne',     clues: ['Crown', 'Royalty', 'Seat', 'Power', 'King'] },
  { answer: 'prison',     clues: ['Cell', 'Guard', 'Bar', 'Sentence', 'Lock'] },
  { answer: 'chapel',     clues: ['Pew', 'Altar', 'Bell', 'Holy', 'Small'] },
  { answer: 'tower',      clues: ['Turret', 'Tall', 'Height', 'Clock', 'Beacon'] },
  { answer: 'tunnel',     clues: ['Bore', 'Underground', 'Dark', 'Through', 'Exit'] },
  { answer: 'lighthouse', clues: ['Beacon', 'Coast', 'Keeper', 'Rocky', 'Light'] },
  { answer: 'windmill',   clues: ['Vane', 'Grain', 'Dutch', 'Sail', 'Wind'] },
  { answer: 'fountain',   clues: ['Coin', 'Jet', 'Splash', 'Park', 'Water'] },
  { answer: 'parade',     clues: ['Float', 'March', 'Crowd', 'Music', 'Street'] },
  { answer: 'festival',   clues: ['Stage', 'Crowd', 'Celebrate', 'Music', 'Event'] },
  { answer: 'carnival',   clues: ['Ride', 'Game', 'Cotton candy', 'Ferris wheel', 'Fun'] },
  { answer: 'theater',    clues: ['Stage', 'Curtain', 'Act', 'Perform', 'Show'] },
  { answer: 'library',    clues: ['Shelf', 'Quiet', 'Catalog', 'Borrow', 'Books'] },
  { answer: 'stadium',    clues: ['Crowd', 'Field', 'Seat', 'Cheer', 'Sports'] },
  { answer: 'airport',    clues: ['Terminal', 'Gate', 'Runway', 'Luggage', 'Fly'] },
  { answer: 'station',    clues: ['Platform', 'Depart', 'Track', 'Schedule', 'Train'] },
  { answer: 'school',     clues: ['Homework', 'Lesson', 'Grade', 'Class', 'Learn'] },
];

const WORDLE_WORDS_5 = WORDLE_WORDS.filter(w => w.length === WORDLE_LEN);

function dailyWord(): string {
  const epoch = new Date('2024-01-01').getTime();
  const day = Math.floor((Date.now() - epoch) / 86400000);
  return WORDLE_WORDS_5[day % WORDLE_WORDS_5.length];
}

function dailyPinpointPuzzle(): PinpointPuzzle {
  const epoch = new Date('2024-01-01').getTime();
  const day = Math.floor((Date.now() - epoch) / 86400000);
  return PINPOINT_PUZZLES[day % PINPOINT_PUZZLES.length];
}

type LetterState = 'hit' | 'present' | 'miss' | 'empty';

interface WordleCell {
  letter: string;
  state: LetterState;
}

@Component({
  selector: 'app-minigames',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './minigames.html',
  styleUrl: './minigames.css',
})
export class Minigames {
  private games = inject(MinigamesService);
  private auth  = inject(AuthService);
  private http  = inject(HttpClient);

  rep = this.games.myRep;
  leaderboard = this.games.leaderboard;

  view = signal<'menu' | 'pinpoint' | 'wordle'>('menu');

  constructor() {
    const userId = this.auth.user()?.dbId ?? this.auth.user()?.id ?? 'guest';
    this.games.init(userId);
    this.games.loadLeaderboard();
    this.games.loadMyRep();
  }

  // Pinpoint state
  pinpointPuzzle = signal<PinpointPuzzle | null>(null);
  pinpointLoading = signal(false);
  pinpointLoadError = signal('');
  cluesShown = signal(1);
  guess = signal('');
  pinpointStatus = signal<'playing' | 'won' | 'lost'>('playing');
  pinpointSolvedToday = computed(() => this.games.hasSolvedToday('pinpoint'));
  pinpointPlayedToday = computed(() => this.games.hasPlayedToday('pinpoint'));
  visibleClues = computed(() => this.pinpointPuzzle()?.clues.slice(0, this.cluesShown()) ?? []);

  // Wordle state
  private target = signal<string>('');
  wordleStatus = signal<'loading' | 'playing' | 'won' | 'lost' | 'error'>('loading');
  wordleLoadError = signal('');
  wordleSolvedToday = computed(() => this.games.hasSolvedToday('wordle'));
  wordlePlayedToday = computed(() => this.games.hasPlayedToday('wordle'));
  rows = signal<WordleCell[][]>([]);
  current = signal('');
  wordleError = signal('');
  keyboardState = signal<Record<string, LetterState>>({});

  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ];

  openGame(g: 'pinpoint' | 'wordle') {
    this.view.set(g);
    if (g === 'pinpoint' && this.pinpointPuzzle()?.answer !== dailyPinpointPuzzle().answer) {
      this.loadPinpoint();
    }
    if (g === 'wordle' && this.target() !== dailyWord()) this.loadWordle();
  }

  backToMenu() {
    this.view.set('menu');
  }

  // ── localStorage helpers ────────────────────────────────────────────────
  private today(): string { return new Date().toISOString().slice(0, 10); }

  private saveWordleState(): void {
    localStorage.setItem(this.games.keyWordle(), JSON.stringify({
      date: this.today(),
      rows: this.rows(),
      status: this.wordleStatus(),
      keyboardState: this.keyboardState(),
    }));
  }

  private restoreWordleState(): boolean {
    try {
      const raw = localStorage.getItem(this.games.keyWordle());
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (s.date !== this.today()) return false;
      this.rows.set(s.rows ?? []);
      this.wordleStatus.set(s.status ?? 'playing');
      this.keyboardState.set(s.keyboardState ?? {});
      return true;
    } catch { return false; }
  }

  private savePinpointState(): void {
    localStorage.setItem(this.games.keyPinpoint(), JSON.stringify({
      date: this.today(),
      status: this.pinpointStatus(),
      cluesShown: this.cluesShown(),
    }));
  }

  private restorePinpointState(): void {
    try {
      const raw = localStorage.getItem(this.games.keyPinpoint());
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.date !== this.today()) return;
      this.pinpointStatus.set(s.status ?? 'playing');
      this.cluesShown.set(s.cluesShown ?? 1);
    } catch {}
  }

  /* ── Pinpoint ───────────────────────────────────────────── */
  loadPinpoint() {
    this.cluesShown.set(1);
    this.guess.set('');
    this.pinpointStatus.set('playing');
    this.pinpointPuzzle.set(dailyPinpointPuzzle());
    this.restorePinpointState();
  }

  onGuessInput(e: Event) {
    this.guess.set((e.target as HTMLInputElement).value);
  }

  submitPinpoint() {
    const puzzle = this.pinpointPuzzle();
    if (!puzzle || this.pinpointStatus() !== 'playing') return;
    const ok = this.guess().trim().toLowerCase() === puzzle.answer.toLowerCase();
    if (ok) {
      this.pinpointStatus.set('won');
      this.games.markPlayed('pinpoint');
      this.savePinpointState();
      if (!this.pinpointSolvedToday()) this.games.awardSolve('pinpoint');
      return;
    }
    if (this.cluesShown() >= puzzle.clues.length) {
      this.pinpointStatus.set('lost');
      this.games.markPlayed('pinpoint');
      this.savePinpointState();
      return;
    }
    this.cluesShown.update((n) => n + 1);
    this.savePinpointState();
    this.guess.set('');
  }

  nextPinpoint() {
    if (this.pinpointPlayedToday()) return;
    this.pinpointPuzzle.set(null);
    this.loadPinpoint();
  }

  /* ── Wordle ─────────────────────────────────────────────── */
  loadWordle() {
    this.current.set('');
    this.wordleError.set('');
    this.target.set(dailyWord());
    if (!this.restoreWordleState()) {
      this.rows.set([]);
      this.keyboardState.set({});
      this.wordleStatus.set('playing');
    }
  }

  private async isValidWord(word: string): Promise<boolean> {
    if (word.length !== WORDLE_LEN) return false;
    if (WORDLE_WORDS_5.includes(word)) return true;
    try {
      await firstValueFrom(
        this.http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`),
      );
      return true;
    } catch {
      return false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (this.view() !== 'wordle') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter') this.pressKey('ENTER');
    else if (e.key === 'Backspace') this.pressKey('BACK');
    else if (/^[a-zA-Z]$/.test(e.key)) this.pressKey(e.key.toUpperCase());
  }

  pressKey(key: string) {
    if (this.wordleStatus() !== 'playing') return;
    this.wordleError.set('');
    if (key === 'ENTER') {
      this.submitWordle();
    } else if (key === 'BACK') {
      this.current.update((c) => c.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && this.current().length < WORDLE_LEN) {
      this.current.update((c) => c + key.toLowerCase());
    }
  }

  async submitWordle() {
    const guess = this.current();
    if (guess.length !== WORDLE_LEN) {
      this.wordleError.set('Need 5 letters');
      return;
    }

    const valid = await this.isValidWord(guess);
    if (!valid) {
      this.wordleError.set('Not in word list');
      return;
    }

    const row = this.scoreGuess(guess, this.target());
    this.rows.update((rs) => [...rs, row]);
    this.updateKeyboard(row);
    this.current.set('');

    if (guess === this.target()) {
      this.wordleStatus.set('won');
      this.games.markPlayed('wordle');
      this.saveWordleState();
      if (!this.wordleSolvedToday()) this.games.awardSolve('wordle');
      return;
    }
    if (this.rows().length >= WORDLE_MAX_GUESSES) {
      this.wordleStatus.set('lost');
      this.games.markPlayed('wordle');
    }
    this.saveWordleState();
  }

  private scoreGuess(guess: string, target: string): WordleCell[] {
    const result: WordleCell[] = Array.from({ length: WORDLE_LEN }, (_, i) => ({
      letter: guess[i],
      state: 'miss',
    }));
    const targetChars = target.split('');
    const used = new Array(WORDLE_LEN).fill(false);

    for (let i = 0; i < WORDLE_LEN; i++) {
      if (guess[i] === targetChars[i]) {
        result[i].state = 'hit';
        used[i] = true;
      }
    }
    for (let i = 0; i < WORDLE_LEN; i++) {
      if (result[i].state === 'hit') continue;
      const idx = targetChars.findIndex((c, j) => !used[j] && c === guess[i]);
      if (idx !== -1) {
        result[i].state = 'present';
        used[idx] = true;
      }
    }
    return result;
  }

  private updateKeyboard(row: WordleCell[]) {
    const next = { ...this.keyboardState() };
    const rank: Record<LetterState, number> = { empty: 0, miss: 1, present: 2, hit: 3 };
    for (const cell of row) {
      const key = cell.letter.toUpperCase();
      const prev = next[key] ?? 'empty';
      if (rank[cell.state] > rank[prev]) next[key] = cell.state;
    }
    this.keyboardState.set(next);
  }

  keyState(k: string): LetterState | '' {
    if (k === 'ENTER' || k === 'BACK') return '';
    return this.keyboardState()[k] ?? '';
  }

  emptyRow(idx: number): WordleCell[] {
    const filled = this.rows()[idx];
    if (filled) return filled;
    const isCurrent = idx === this.rows().length;
    const cur = this.current();
    return Array.from({ length: WORDLE_LEN }, (_, i) => ({
      letter: isCurrent ? cur[i] ?? '' : '',
      state: 'empty',
    }));
  }

  get allRows(): number[] {
    return Array.from({ length: WORDLE_MAX_GUESSES }, (_, i) => i);
  }

  revealTarget(): string {
    return this.target().toUpperCase();
  }
}
