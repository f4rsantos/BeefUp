import './HumanBody.css'
import bodySvg from '../assets/muscle-body-complete.svg?raw'

const MUSCLE_GROUP_ALIASES = {
  Abs: ['stomach', 'upper-abs', 'lower-abs'],
  Adductors: ['left-adductor', 'right-adductor'],
  Biceps: ['left-biceps', 'right-biceps'],
  Calves: ['left-calf', 'right-calf'],
  Deltoids: [
    'left-shoulder',
    'right-shoulder',
    'left-shoulder-front',
    'right-shoulder-front',
    'left-shoulder-back',
    'right-shoulder-back',
  ],
  Forearms: [
    'left-forearm',
    'right-forearm',
    'left-forearm-front',
    'right-forearm-front',
    'left-forearm-back',
    'right-forearm-back',
  ],
  Glutes: ['glutes'],
  Hamstrings: ['left-hamstring', 'right-hamstring', 'left-leg-back', 'right-leg-back'],
  Lats: ['left-lat', 'right-lat', 'lumbar', 'upper-back', 'lower-back'],
  Obliques: ['left-oblique', 'right-oblique'],
  Pectorals: ['chest'],
  Quads: ['left-quad', 'right-quad', 'left-leg-front', 'right-leg-front'],
  Trapezius: ['left-trap', 'right-trap'],
  Triceps: ['left-triceps', 'right-triceps'],
}

const VIEW_BOXES = {
  front: '0 0 88 207',
  back: '88 0 88 207',
}

function getHighlightedGroups(highlightedMuscles) {
  const selected = new Set(highlightedMuscles)

  return Object.entries(MUSCLE_GROUP_ALIASES)
    .filter(([group, aliases]) => selected.has(group) || selected.has(group.toLowerCase()) || aliases.some((alias) => selected.has(alias)))
    .map(([group]) => `highlight-${group}`)
    .join(' ')
}

function getSvgMarkup(view) {
  return bodySvg
    .replace('viewBox="0 0 176 207"', `viewBox="${VIEW_BOXES[view] ?? VIEW_BOXES.front}"`)
    .replace('width="100%"', 'width="100%"')
    .replace('height="100%"', 'height="100%"')
}

export default function HumanBody({ highlightedMuscles = [], view = 'front' }) {
  const bodyView = view === 'back' ? 'back' : 'front'
  const highlightClasses = getHighlightedGroups(highlightedMuscles)

  return (
    <div
      aria-hidden="true"
      className={`human-body human-body-complete ${bodyView} ${highlightClasses}`}
      dangerouslySetInnerHTML={{ __html: getSvgMarkup(bodyView) }}
    />
  )
}
