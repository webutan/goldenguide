// Dev-only sandbox for the 3D Gai-chan: `npm run dev` → /dev/gaichan-lab.html
//   ?view=grid      every mood side by side
//   ?view=props     every prop
//   ?view=dialogue  the real GaiChanDialogue component (rules walkthrough)
//   (default)       single model with controls
import { createApp, h, ref, reactive } from 'vue'
import GaiChanModel from '../components/GaiChanModel.vue'
import GaiChanDialogue from '../components/GaiChanDialogue.vue'
import { MOODS, PROPS } from './GaiChanStage.js'
import '../styles/win2000.css'
import '../styles/main.css'

const params = new URLSearchParams(location.search)
const view = params.get('view') || 'controls'
const framing = params.get('framing') || 'half'
window.__stages = []
const onReady = st => { window.__stages.push(st); if (params.has('noproc')) st.opts.procedural = false }

const cell = (label, model) => h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:4px' }, [
  h('div', { style: 'position:relative;width:220px;height:260px;background:#14101a;border:1px solid #333' }, [model]),
  h('code', { style: 'color:#ffe4a0;font-size:12px' }, label),
])

const App = {
  setup() {
    const s = reactive({ mood: 'neutral', pose: '', prop: '', talking: false, framing })
    return () => {
      document.body.style.cssText = 'margin:0;background:#0b0910;font-family:monospace;color:#ddd;overflow:auto'
      if (view === 'grid') {
        return h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;padding:12px' },
          Object.keys(MOODS).map(m => cell(m, h(GaiChanModel, { onReady, mood: m, framing, followPointer: false, talking: params.has('talk') }))))
      }
      if (view === 'props') {
        return h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;padding:12px' },
          Object.keys(PROPS).map(p => cell(p, h(GaiChanModel, { onReady, mood: 'happy', prop: p, framing, followPointer: false }))))
      }
      if (view === 'dialogue') {
        return h('div', { style: 'position:fixed;inset:0;background:url(/gaichan/gaichanbg.jpg) center/cover, #1a1420' }, [
          h(GaiChanDialogue, { lang: 'en', rulesAccepted: params.has('tucked'), bars: [] }),
        ])
      }
      const sel = (key, opts) => h('select', { value: s[key], onChange: e => (s[key] = e.target.value) },
        opts.map(o => h('option', { value: o }, o || '—')))
      return h('div', { style: 'display:flex;gap:16px;padding:16px' }, [
        h('div', { style: 'position:relative;width:420px;height:480px;background:#14101a;border:1px solid #333' }, [
          h(GaiChanModel, { mood: s.mood, pose: s.pose || null, prop: s.prop || null, talking: s.talking, framing: s.framing }),
        ]),
        h('div', { style: 'display:flex;flex-direction:column;gap:8px' }, [
          h('label', ['mood ', sel('mood', Object.keys(MOODS))]),
          h('label', ['pose ', sel('pose', ['', 'idle', 'think', 'surprised', 'wave', 'point', 'shy', 'present', 'hips'])]),
          h('label', ['prop ', sel('prop', ['', ...Object.keys(PROPS)])]),
          h('label', ['framing ', sel('framing', ['bust', 'half', 'full'])]),
          h('label', [h('input', { type: 'checkbox', checked: s.talking, onChange: e => (s.talking = e.target.checked) }), ' talking']),
          h('p', { style: 'max-width:240px;color:#999' }, 'Move the mouse to have her look at it; click her to poke.'),
        ]),
      ])
    }
  },
}

createApp(App).mount('#lab')
