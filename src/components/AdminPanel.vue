<script setup>
import { ref, computed } from 'vue'
import WinTabs from './win2000/WinTabs.vue'
import WinTextInput from './win2000/WinTextInput.vue'
import WinButton from './win2000/WinButton.vue'
import TagIcon from './TagIcon.vue'
import { updateBar as apiUpdateBar, createBar as apiCreateBar, deleteBar as apiDeleteBar, createTag, updateTag, deleteTag, uploadPhoto, fetchBarPhotos, deletePhoto } from '../api/index.js'

const props = defineProps({
  bars: Array,
  tags: Array,
  placingBar: Object,
  partitions: { type: Object, default: () => ({}) },
  selectedBuilding: { type: String, default: null },
})

const emit = defineEmits(['selectForPlacement', 'unplaceBar', 'reload', 'reorderTags', 'updatePartitions', 'open-db'])

const mainTab = ref('placement')
const mainTabOptions = [
  { value: 'placement', label: 'Placement' },
  { value: 'edit-bar', label: 'Edit Bar' },
  { value: 'photos', label: 'Photos' },
  { value: 'tags', label: 'Tags' },
  { value: 'buildings', label: 'Buildings' },
]

// === Placement tab ===
const search = ref('')
const placeTab = ref('unplaced')

const placeTabOptions = computed(() => [
  { value: 'unplaced', label: `Unplaced (${unplacedBars.value.length})` },
  { value: 'placed', label: `Placed (${placedBars.value.length})` },
])

const unplacedBars = computed(() => props.bars.filter(b => !b.building_id))
const placedBars = computed(() => props.bars.filter(b => !!b.building_id))

const filteredPlacementBars = computed(() => {
  const list = placeTab.value === 'unplaced' ? unplacedBars.value : placedBars.value
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(b =>
    (b.name_jp && b.name_jp.toLowerCase().includes(q)) ||
    (b.name_en && b.name_en.toLowerCase().includes(q))
  )
})

// === Edit bar tab ===
const editSearch = ref('')
const editingBar = ref(null)
const editForm = ref({})
const editSaving = ref(false)
const editBarTags = ref([])
const photoFile = ref(null)
const photoUploading = ref(false)
const photoError = ref('')
const barPhotos = ref([])
const photoDeletingId = ref(null)

// Schedule editing
const DAY_ABBRS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const scheduleDefault = ref({ open: '18:00', close: '02:00' })
const scheduleClosed = ref([])
const scheduleOverrides = ref([]) // [{ day: 'fri', open: '18:00', close: '04:00' }]

const filteredEditBars = computed(() => {
  if (!editSearch.value) return props.bars
  const q = editSearch.value.toLowerCase()
  return props.bars.filter(b =>
    (b.name_jp && b.name_jp.toLowerCase().includes(q)) ||
    (b.name_en && b.name_en.toLowerCase().includes(q))
  )
})

function startEditBar(bar) {
  editingBar.value = bar
  editForm.value = {
    name_jp: bar.name_jp || '',
    name_en: bar.name_en || '',
    street: bar.street || '',
    floor: bar.floor || 1,
    charge: bar.charge || '',
    male_charge: bar.male_charge || '',
    drink_price: bar.drink_price || '',
    seats: bar.seats || '',
    hours: bar.hours || '',
    closed_days: bar.closed_days || '',
    phone: bar.phone || '',
    description: bar.description || '',
    sns: bar.sns || '',
    address: bar.address || '',
    plus_code: bar.plus_code || '',
    google_link: bar.google_link || '',
  }
  editBarTags.value = (bar.tags || []).map(t => typeof t === 'string' ? t : t.id)
  photoFile.value = null
  barPhotos.value = []
  fetchBarPhotos(bar.id).then(photos => { barPhotos.value = photos }).catch(() => {})

  // Populate schedule fields
  const sched = bar.schedule || {}
  scheduleDefault.value = sched.default ? { ...sched.default } : { open: '18:00', close: '02:00' }
  scheduleClosed.value = sched.closedDays ? [...sched.closedDays] : []
  scheduleOverrides.value = sched.overrides
    ? Object.entries(sched.overrides).map(([day, times]) => ({ day, ...times }))
    : []
}

function onPhotoSelect(e) {
  photoFile.value = e.target.files[0] || null
}

async function uploadBarPhoto() {
  if (!editingBar.value || !photoFile.value) return
  photoUploading.value = true
  photoError.value = ''
  try {
    const newPhoto = await uploadPhoto(editingBar.value.id, photoFile.value)
    photoFile.value = null
    barPhotos.value = await fetchBarPhotos(editingBar.value.id)
    // Update the preview immediately
    if (!editingBar.value.photo) editingBar.value.photo = newPhoto.filename
    emit('reload')
  } catch (err) {
    photoError.value = err.message || 'Upload failed'
    console.error('Failed to upload photo:', err)
  } finally {
    photoUploading.value = false
  }
}

async function deleteBarPhoto(photo) {
  photoDeletingId.value = photo.id
  try {
    await deletePhoto(photo.id)
    barPhotos.value = barPhotos.value.filter(p => p.id !== photo.id)
    // Clear preview if it was the primary photo
    if (editingBar.value.photo === photo.filename) {
      editingBar.value.photo = barPhotos.value.length > 0 ? barPhotos.value[0].filename : null
    }
    emit('reload')
  } catch (err) {
    console.error('Failed to delete photo:', err)
  } finally {
    photoDeletingId.value = null
  }
}

// === Photos tab ===
const photoTabSearch = ref('')
const photoTabBar = ref(null)
const photoTabPhotos = ref([])
const photoTabFile = ref(null)
const photoTabFileInput = ref(null)
const photoTabUploading = ref(false)
const photoTabDeletingId = ref(null)
const photoTabError = ref('')

const filteredPhotoTabBars = computed(() => {
  if (!photoTabSearch.value) return props.bars
  const q = photoTabSearch.value.toLowerCase()
  return props.bars.filter(b =>
    (b.name_jp && b.name_jp.toLowerCase().includes(q)) ||
    (b.name_en && b.name_en.toLowerCase().includes(q))
  )
})

async function selectPhotoTabBar(bar) {
  photoTabBar.value = bar
  photoTabPhotos.value = []
  photoTabFile.value = null
  try {
    photoTabPhotos.value = await fetchBarPhotos(bar.id)
  } catch {}
}

function onPhotoTabFileSelect(e) {
  photoTabFile.value = e.target.files[0] || null
}

async function uploadPhotoTabPhoto() {
  if (!photoTabBar.value || !photoTabFile.value) return
  photoTabUploading.value = true
  photoTabError.value = ''
  try {
    await uploadPhoto(photoTabBar.value.id, photoTabFile.value)
    photoTabFile.value = null
    if (photoTabFileInput.value) photoTabFileInput.value.value = ''
    photoTabPhotos.value = await fetchBarPhotos(photoTabBar.value.id)
    emit('reload')
  } catch (err) {
    photoTabError.value = err.message || 'Upload failed'
    console.error('Failed to upload photo:', err)
  } finally {
    photoTabUploading.value = false
  }
}

async function deletePhotoTabPhoto(photo) {
  photoTabDeletingId.value = photo.id
  try {
    await deletePhoto(photo.id)
    photoTabPhotos.value = photoTabPhotos.value.filter(p => p.id !== photo.id)
    emit('reload')
  } catch (err) {
    console.error('Failed to delete photo:', err)
  } finally {
    photoTabDeletingId.value = null
  }
}

function toggleClosedDay(day) {
  if (scheduleClosed.value.includes(day)) {
    scheduleClosed.value = scheduleClosed.value.filter(d => d !== day)
  } else {
    scheduleClosed.value = [...scheduleClosed.value, day]
  }
}

function addOverride() {
  const usedDays = new Set(scheduleOverrides.value.map(o => o.day))
  const available = DAY_ABBRS.find(d => !usedDays.has(d))
  if (available) {
    scheduleOverrides.value = [...scheduleOverrides.value, { day: available, open: scheduleDefault.value.open, close: scheduleDefault.value.close }]
  }
}

function removeOverride(index) {
  scheduleOverrides.value = scheduleOverrides.value.filter((_, i) => i !== index)
}

function toggleBarTag(tagId) {
  if (editBarTags.value.includes(tagId)) {
    editBarTags.value = editBarTags.value.filter(id => id !== tagId)
  } else {
    editBarTags.value = [...editBarTags.value, tagId]
  }
}

async function saveBarEdit() {
  if (!editingBar.value) return
  editSaving.value = true
  try {
    // Build schedule JSON
    const overridesObj = {}
    for (const ov of scheduleOverrides.value) {
      overridesObj[ov.day] = { open: ov.open, close: ov.close }
    }
    const schedule = {
      default: { ...scheduleDefault.value },
      overrides: overridesObj,
      closedDays: [...scheduleClosed.value],
    }

    // Auto-populate legacy hours field from default times
    const legacyHours = `${scheduleDefault.value.open}-${scheduleDefault.value.close}`

    await apiUpdateBar(editingBar.value.id, {
      ...editForm.value,
      floor: Number(editForm.value.floor) || 1,
      seats: editForm.value.seats ? Number(editForm.value.seats) : null,
      hours: legacyHours,
      schedule,
      tags: editBarTags.value,
    })
    editingBar.value = null
    emit('reload')
  } catch (err) {
    console.error('Failed to save bar:', err)
  } finally {
    editSaving.value = false
  }
}

// === Create bar ===
const createMode = ref(false)
const createForm = ref({})
const createSaving = ref(false)

function slugify(str) {
  return (str || '').toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function startCreateBar() {
  createMode.value = true
  createForm.value = { slug: '', name_jp: '', name_en: '', street: '', floor: 1 }
}

function onCreateNameEnInput() {
  createForm.value.slug = slugify(createForm.value.name_en)
}

async function saveCreateBar() {
  if (!createForm.value.name_jp || !createForm.value.street) return
  if (!createForm.value.slug) createForm.value.slug = `bar-${Date.now()}`
  createSaving.value = true
  try {
    await apiCreateBar({
      slug: createForm.value.slug,
      name_jp: createForm.value.name_jp,
      name_en: createForm.value.name_en || null,
      street: createForm.value.street,
      floor: Number(createForm.value.floor) || 1,
    })
    createMode.value = false
    emit('reload')
  } catch (err) {
    console.error('Failed to create bar:', err)
  } finally {
    createSaving.value = false
  }
}

async function deleteBarEntry(bar) {
  if (!confirm(`Delete "${bar.name_jp}"? This cannot be undone.`)) return
  try {
    await apiDeleteBar(bar.id)
    if (editingBar.value?.id === bar.id) editingBar.value = null
    emit('reload')
  } catch (err) {
    console.error('Failed to delete bar:', err)
  }
}

// === Tags tab ===
const newTagId = ref('')
const newTagLabel = ref('')
const newTagIcon = ref('')
const newTagColor = ref('#888888')
const tagSaving = ref(false)

async function addTag() {
  if (!newTagId.value || !newTagLabel.value) return
  tagSaving.value = true
  try {
    await createTag({
      id: newTagId.value,
      label: newTagLabel.value,
      icon: newTagIcon.value,
      color: newTagColor.value,
    })
    newTagId.value = ''
    newTagLabel.value = ''
    newTagIcon.value = ''
    newTagColor.value = '#888888'
    emit('reload')
  } catch (err) {
    console.error('Failed to create tag:', err)
  } finally {
    tagSaving.value = false
  }
}

async function removeTag(tagId) {
  if (!confirm(`Delete tag "${tagId}"?`)) return
  try {
    await deleteTag(tagId)
    emit('reload')
  } catch (err) {
    console.error('Failed to delete tag:', err)
  }
}

// === Tag drag reorder ===
const dragTagIndex = ref(null)
const dragOverTagIndex = ref(null)

function onTagDragStart(e, index) {
  dragTagIndex.value = index
  e.dataTransfer.effectAllowed = 'move'
}

function onTagDragOver(e, index) {
  e.preventDefault()
  dragOverTagIndex.value = index
}

function onTagDrop(e, index) {
  e.preventDefault()
  if (dragTagIndex.value === null || dragTagIndex.value === index) return
  const newOrder = [...props.tags]
  const [moved] = newOrder.splice(dragTagIndex.value, 1)
  newOrder.splice(index, 0, moved)
  emit('reorderTags', newOrder.map(t => t.id))
  dragTagIndex.value = null
  dragOverTagIndex.value = null
}

function onTagDragEnd() {
  dragTagIndex.value = null
  dragOverTagIndex.value = null
}

// === Buildings tab (partition editor) ===
const currentPartition = computed(() => {
  if (!props.selectedBuilding) return null
  return props.partitions[props.selectedBuilding] || { partitions: [], splitDirection: 'auto' }
})

const barsInSelectedBuilding = computed(() => {
  if (!props.selectedBuilding) return []
  return props.bars.filter(b => b.building_id === props.selectedBuilding)
})

function addPartition() {
  if (!props.selectedBuilding) return
  const data = { ...(props.partitions[props.selectedBuilding] || { partitions: [], splitDirection: 'auto' }) }
  data.partitions = [...data.partitions, { color: '#2a1845', barId: null }]
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}

function removePartition() {
  if (!props.selectedBuilding || !currentPartition.value || currentPartition.value.partitions.length === 0) return
  const data = { ...currentPartition.value }
  data.partitions = data.partitions.slice(0, -1)
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}

function setPartitionBar(index, barId) {
  if (!props.selectedBuilding) return
  const data = { ...currentPartition.value }
  data.partitions = data.partitions.map((p, i) => i === index ? { ...p, barId: barId || null } : p)
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}

const ADMIN_FLOOR_COLORS = {
  '-3': '#0f2040', '-2': '#2a1845', '-1': '#1a3868',
  1: '#934400', 2: '#005559', 3: '#4a6030', 4: '#7a2050', 5: '#5a3020',
}

function getPartitionFloorColor(p) {
  if (!p.barId) return '#2a2a2a'
  const bar = props.bars.find(b => String(b.id) === String(p.barId))
  if (!bar) return '#2a2a2a'
  return ADMIN_FLOOR_COLORS[bar.floor ?? 1] ?? '#934400'
}

function setSplitDirection(dir) {
  if (!props.selectedBuilding) return
  const data = { ...currentPartition.value, splitDirection: dir }
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}

function setSplitAngle(angle) {
  if (!props.selectedBuilding) return
  const data = { ...currentPartition.value, splitAngle: Number(angle) || 0 }
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}

function setSplitCenter(axis, value) {
  if (!props.selectedBuilding) return
  const key = axis === 'x' ? 'splitCenterX' : 'splitCenterY'
  const data = { ...currentPartition.value, [key]: Number(value) }
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}

function setPartitionWeight(index, weight) {
  if (!props.selectedBuilding) return
  const data = { ...currentPartition.value }
  data.partitions = data.partitions.map((p, i) => i === index ? { ...p, weight: Number(weight) || 1 } : p)
  emit('updatePartitions', { buildingId: props.selectedBuilding, data })
}
</script>

<template>
  <div class="admin-panel">
    <div v-if="placingBar" class="placing-info">
      <div class="placing-name">{{ placingBar.name_jp }}</div>
      <div v-if="placingBar.name_en" class="placing-sub">{{ placingBar.name_en }}</div>
      <div class="placing-hint">Click a building to place this bar</div>
      <WinButton style="margin-top: 6px" @click="emit('selectForPlacement', null)">Cancel</WinButton>
    </div>

    <template v-else>
      <div class="admin-db-row">
        <WinButton style="width:100%" @click="emit('open-db')">&#128196; Database</WinButton>
      </div>

      <WinTabs v-model="mainTab" :tabs="mainTabOptions">

        <!-- Placement tab -->
        <template v-if="mainTab === 'placement'">
          <div class="sub-tabs">
            <button
              v-for="opt in placeTabOptions"
              :key="opt.value"
              :class="['sub-tab', { active: placeTab === opt.value }]"
              @click="placeTab = opt.value"
            >{{ opt.label }}</button>
          </div>
          <WinTextInput v-model="search" placeholder="Search bars..." style="margin: 4px 0" />
          <div class="bar-list">
            <div
              v-for="bar in filteredPlacementBars"
              :key="bar.id"
              class="bar-list-item"
              @click="emit('selectForPlacement', bar)"
            >
              <div class="bar-list-content">
                <div class="bar-list-name">{{ bar.name_jp }}</div>
                <div v-if="bar.name_en" class="bar-list-sub">{{ bar.name_en }}</div>
                <div class="bar-list-meta">
                  {{ bar.floor >= 0 ? bar.floor + 'F' : 'B' + Math.abs(bar.floor) + 'F' }}
                  <span v-if="bar.building_id" class="bldg-tag">{{ bar.building_id }}</span>
                </div>
              </div>
              <button
                v-if="bar.building_id"
                class="unplace-btn"
                title="Remove from building"
                @click.stop="emit('unplaceBar', bar)"
              >&#10005;</button>
            </div>
            <div v-if="filteredPlacementBars.length === 0" class="bar-list-empty">No bars found</div>
          </div>
        </template>

        <!-- Edit bar tab -->
        <template v-if="mainTab === 'edit-bar'">
          <!-- Create new bar form -->
          <template v-if="createMode">
            <div class="edit-form">
              <div class="edit-field">
                <label>Name (JP) *</label>
                <WinTextInput v-model="createForm.name_jp" placeholder="日本語名" />
              </div>
              <div class="edit-field">
                <label>Name (EN)</label>
                <WinTextInput v-model="createForm.name_en" placeholder="English name" @input="onCreateNameEnInput" />
              </div>
              <div class="edit-field">
                <label>Slug (unique ID)</label>
                <WinTextInput v-model="createForm.slug" placeholder="auto-filled from EN name" />
              </div>
              <div class="edit-row">
                <div class="edit-field" style="flex:1">
                  <label>Street *</label>
                  <WinTextInput v-model="createForm.street" placeholder="e.g. hanazono-1" />
                </div>
                <div class="edit-field" style="width:50px">
                  <label>Floor</label>
                  <WinTextInput v-model="createForm.floor" />
                </div>
              </div>
              <div class="edit-actions">
                <WinButton
                  @click="saveCreateBar"
                  :disabled="createSaving || !createForm.name_jp || !createForm.street"
                >{{ createSaving ? 'Creating...' : 'Create' }}</WinButton>
                <WinButton @click="createMode = false">Cancel</WinButton>
              </div>
            </div>
          </template>

          <template v-else-if="editingBar">
            <div class="edit-form">
              <div class="edit-field">
                <label>Name (JP)</label>
                <WinTextInput v-model="editForm.name_jp" />
              </div>
              <div class="edit-field">
                <label>Name (EN)</label>
                <WinTextInput v-model="editForm.name_en" />
              </div>
              <div class="edit-row">
                <div class="edit-field" style="flex:1">
                  <label>Street</label>
                  <WinTextInput v-model="editForm.street" />
                </div>
                <div class="edit-field" style="width:50px">
                  <label>Floor</label>
                  <WinTextInput v-model="editForm.floor" />
                </div>
              </div>
              <div class="edit-row">
                <div class="edit-field" style="flex:1">
                  <label>Cover</label>
                  <WinTextInput v-model="editForm.charge" placeholder="e.g. 500" />
                </div>
                <div class="edit-field" style="flex:1">
                  <label>Male</label>
                  <WinTextInput v-model="editForm.male_charge" placeholder="e.g. 1000" />
                </div>
                <div class="edit-field" style="flex:1">
                  <label>Drinks</label>
                  <WinTextInput v-model="editForm.drink_price" placeholder="e.g. 700" />
                </div>
              </div>
              <div class="edit-row">
                <div class="edit-field" style="flex:1">
                  <label>Seats</label>
                  <WinTextInput v-model="editForm.seats" />
                </div>
              </div>
              <div class="edit-field">
                <label>Default Hours</label>
                <div class="edit-row">
                  <div class="edit-field" style="flex:1">
                    <label>Open</label>
                    <input type="time" v-model="scheduleDefault.open" class="edit-time-input" />
                  </div>
                  <div class="edit-field" style="flex:1">
                    <label>Close</label>
                    <input type="time" v-model="scheduleDefault.close" class="edit-time-input" />
                  </div>
                </div>
              </div>
              <div class="edit-field">
                <label>Closed Days</label>
                <div class="closed-day-buttons">
                  <button
                    v-for="(day, i) in DAY_ABBRS"
                    :key="day"
                    :class="['closed-day-btn', { active: scheduleClosed.includes(day) }]"
                    @click="toggleClosedDay(day)"
                  >{{ DAY_LABELS[i] }}</button>
                </div>
              </div>
              <div class="edit-field">
                <label>Day Overrides <button class="override-add-btn" @click="addOverride">+</button></label>
                <div v-for="(ov, i) in scheduleOverrides" :key="i" class="edit-row override-row">
                  <select v-model="ov.day" class="split-select" style="width:60px;flex:none">
                    <option v-for="d in DAY_ABBRS" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <input type="time" v-model="ov.open" class="edit-time-input" style="flex:1" />
                  <input type="time" v-model="ov.close" class="edit-time-input" style="flex:1" />
                  <button class="unplace-btn" @click="removeOverride(i)" title="Remove">&#10005;</button>
                </div>
              </div>
              <div class="edit-field">
                <label>Phone</label>
                <WinTextInput v-model="editForm.phone" />
              </div>
              <div class="edit-field">
                <label>SNS</label>
                <WinTextInput v-model="editForm.sns" />
              </div>
              <div class="edit-field">
                <label>Plus Code</label>
                <WinTextInput v-model="editForm.plus_code" placeholder="e.g. 8Q7XMP5H+XX" />
              </div>
              <div class="edit-field">
                <label>Google Link</label>
                <WinTextInput v-model="editForm.google_link" placeholder="https://maps.google.com/..." />
              </div>
              <div class="edit-field">
                <label>Description</label>
                <textarea v-model="editForm.description" class="edit-textarea"></textarea>
              </div>
              <div class="edit-field">
                <label>Photos</label>
                <div class="edit-photos-list">
                  <div v-for="photo in barPhotos" :key="photo.id" class="edit-photo-item">
                    <img :src="`/uploads/${photo.filename}`" alt="" class="edit-photo-thumb" />
                    <WinButton
                      small
                      :disabled="photoDeletingId === photo.id"
                      @click="deleteBarPhoto(photo)"
                      style="color: #c0392b"
                    >✕</WinButton>
                  </div>
                  <div v-if="barPhotos.length === 0" class="edit-photo-empty">No photos yet</div>
                </div>
                <div class="edit-photo-row">
                  <input type="file" accept="image/*" @change="onPhotoSelect" class="edit-file-input" />
                  <WinButton
                    v-if="photoFile"
                    small
                    :disabled="photoUploading"
                    @click="uploadBarPhoto"
                  >
                    {{ photoUploading ? 'Uploading...' : 'Upload' }}
                  </WinButton>
                </div>
                <div v-if="photoError" class="upload-error">{{ photoError }}</div>
              </div>
              <div class="edit-field">
                <label>Tags</label>
                <div class="edit-tags">
                  <label v-for="tag in tags" :key="tag.id" class="edit-tag-item">
                    <input type="checkbox" :checked="editBarTags.includes(tag.id)" @change="toggleBarTag(tag.id)" />
                    <span>{{ tag.icon }} {{ tag.label }}</span>
                  </label>
                </div>
              </div>
              <div class="edit-actions">
                <WinButton @click="saveBarEdit" :disabled="editSaving">Save</WinButton>
                <WinButton @click="editingBar = null">Cancel</WinButton>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="edit-bar-toolbar">
              <WinButton small @click="startCreateBar">+ New Bar</WinButton>
            </div>
            <WinTextInput v-model="editSearch" placeholder="Search bars to edit..." style="margin-bottom: 4px" />
            <div class="bar-list">
              <div
                v-for="bar in filteredEditBars"
                :key="bar.id"
                class="bar-list-item"
              >
                <div class="bar-list-content" @click="startEditBar(bar)">
                  <div class="bar-list-name">{{ bar.name_jp }}</div>
                  <div v-if="bar.name_en" class="bar-list-sub">{{ bar.name_en }}</div>
                </div>
                <button
                  class="unplace-btn"
                  title="Delete bar"
                  @click.stop="deleteBarEntry(bar)"
                >&#128465;</button>
              </div>
            </div>
          </template>
        </template>

        <!-- Photos tab -->
        <template v-if="mainTab === 'photos'">
          <template v-if="!photoTabBar">
            <WinTextInput v-model="photoTabSearch" placeholder="Search bars..." style="margin-bottom: 4px" />
            <div class="bar-list">
              <div
                v-for="bar in filteredPhotoTabBars"
                :key="bar.id"
                class="bar-list-item"
                @click="selectPhotoTabBar(bar)"
              >
                <div class="bar-list-content">
                  <div class="bar-list-name">{{ bar.name_jp }}</div>
                  <div v-if="bar.name_en" class="bar-list-sub">{{ bar.name_en }}</div>
                  <div class="bar-list-meta">
                    {{ bar.floor >= 0 ? bar.floor + 'F' : 'B' + Math.abs(bar.floor) + 'F' }}
                    <span v-if="bar.photo" style="color: var(--valhalla-orange); margin-left: 4px;">&#128247;</span>
                  </div>
                </div>
              </div>
              <div v-if="filteredPhotoTabBars.length === 0" class="bar-list-empty">No bars found</div>
            </div>
          </template>

          <template v-else>
            <div class="photo-tab-header">
              <button class="photo-tab-back" @click="photoTabBar = null">&#8592; Back</button>
              <div class="photo-tab-title">
                <div class="photo-tab-name">{{ photoTabBar.name_jp }}</div>
                <div v-if="photoTabBar.name_en" class="photo-tab-sub">{{ photoTabBar.name_en }}</div>
              </div>
            </div>

            <div class="photo-tab-grid">
              <div v-for="photo in photoTabPhotos" :key="photo.id" class="photo-tab-item">
                <img :src="`/uploads/${photo.filename}`" alt="" class="photo-tab-thumb" />
                <div class="photo-tab-meta">
                  <span class="photo-tab-type">{{ photo.photo_type || 'general' }}</span>
                  <button
                    class="unplace-btn"
                    :disabled="photoTabDeletingId === photo.id"
                    @click="deletePhotoTabPhoto(photo)"
                    title="Delete photo"
                  >&#10005;</button>
                </div>
              </div>
              <div v-if="photoTabPhotos.length === 0" class="bar-list-empty">No photos yet</div>
            </div>

            <div class="photo-tab-upload">
              <div class="edit-field">
                <label>Upload Photo</label>
                <input
                  ref="photoTabFileInput"
                  type="file"
                  accept="image/*"
                  @change="onPhotoTabFileSelect"
                  class="edit-file-input"
                />
              </div>
              <WinButton
                :disabled="!photoTabFile || photoTabUploading"
                @click="uploadPhotoTabPhoto"
                style="margin-top: 4px"
              >{{ photoTabUploading ? 'Uploading...' : 'Upload' }}</WinButton>
              <div v-if="photoTabError" class="upload-error">{{ photoTabError }}</div>
            </div>
          </template>
        </template>

        <!-- Tags tab -->
        <template v-if="mainTab === 'tags'">
          <div class="tag-list">
            <div
              v-for="(tag, i) in tags"
              :key="tag.id"
              :class="['tag-list-item', { 'drag-over': dragOverTagIndex === i }]"
              draggable="true"
              @dragstart="onTagDragStart($event, i)"
              @dragover="onTagDragOver($event, i)"
              @drop="onTagDrop($event, i)"
              @dragend="onTagDragEnd"
            >
              <span class="drag-handle" title="Drag to reorder">&#10303;</span>
              <span class="tag-swatch" :style="{ background: tag.color }"></span>
              <TagIcon :icon="tag.icon" :size="12" />
              <span class="tag-label-text">{{ tag.label }}</span>
              <span class="tag-id">({{ tag.id }})</span>
              <button class="unplace-btn" @click="removeTag(tag.id)" title="Delete tag">&#10005;</button>
            </div>
          </div>
          <div class="tag-add-form">
            <div class="edit-field">
              <label>ID</label>
              <WinTextInput v-model="newTagId" placeholder="e.g. live-music" />
            </div>
            <div class="edit-field">
              <label>Label</label>
              <WinTextInput v-model="newTagLabel" placeholder="e.g. Live Music" />
            </div>
            <div class="edit-row">
              <div class="edit-field" style="flex:1">
                <label>Icon (emoji or image URL)</label>
                <WinTextInput v-model="newTagIcon" placeholder="emoji or /icons/foo.png" />
              </div>
              <div class="edit-field" style="width: 70px">
                <label>Color</label>
                <input type="color" v-model="newTagColor" class="color-input" />
              </div>
            </div>
            <div v-if="newTagIcon" class="icon-preview">
              <span class="edit-field-hint">Preview:</span>
              <TagIcon :icon="newTagIcon" :size="16" />
            </div>
            <WinButton @click="addTag" :disabled="tagSaving || !newTagId || !newTagLabel" style="margin-top: 4px">
              Add Tag
            </WinButton>
          </div>
        </template>

        <!-- Buildings tab -->
        <template v-if="mainTab === 'buildings'">
          <div v-if="!selectedBuilding" class="bar-list-empty">
            Click a building on the map to select it for editing.
          </div>
          <div v-else class="building-editor">
            <div class="building-id">{{ selectedBuilding }}</div>

            <div class="edit-field">
              <label>Partitions</label>
              <div class="partition-controls">
                <WinButton small @click="removePartition" :disabled="!currentPartition || currentPartition.partitions.length === 0">&minus;</WinButton>
                <span class="partition-count">{{ currentPartition ? currentPartition.partitions.length : 0 }}</span>
                <WinButton small @click="addPartition">+</WinButton>
              </div>
            </div>

            <div class="edit-field">
              <label>Split Direction</label>
              <select
                class="split-select"
                :value="currentPartition ? currentPartition.splitDirection : 'auto'"
                @change="setSplitDirection($event.target.value)"
              >
                <option value="auto">Auto</option>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>

            <div v-if="currentPartition && currentPartition.partitions.length > 0" class="edit-field">
              <label>Split Angle</label>
              <div class="angle-controls">
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="1"
                  :value="currentPartition.splitAngle || 0"
                  @input="setSplitAngle($event.target.value)"
                  class="angle-slider"
                />
                <span class="angle-value">{{ currentPartition.splitAngle || 0 }}&deg;</span>
              </div>
            </div>

            <div v-if="currentPartition && currentPartition.partitions.length > 0" class="edit-field">
              <label>Center X</label>
              <div class="angle-controls">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="currentPartition.splitCenterX ?? 50"
                  @input="setSplitCenter('x', $event.target.value)"
                  class="angle-slider"
                />
                <span class="angle-value">{{ currentPartition.splitCenterX ?? 50 }}%</span>
              </div>
            </div>

            <div v-if="currentPartition && currentPartition.partitions.length > 0" class="edit-field">
              <label>Center Y</label>
              <div class="angle-controls">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :value="currentPartition.splitCenterY ?? 50"
                  @input="setSplitCenter('y', $event.target.value)"
                  class="angle-slider"
                />
                <span class="angle-value">{{ currentPartition.splitCenterY ?? 50 }}%</span>
              </div>
            </div>

            <div v-if="currentPartition && currentPartition.partitions.length > 0" class="partition-colors">
              <div v-for="(p, i) in currentPartition.partitions" :key="i" class="partition-color-item">
                <div class="partition-color-row">
                  <span class="partition-label">Slot {{ i + 1 }}</span>
                  <span
                    class="partition-floor-swatch"
                    :style="{ background: getPartitionFloorColor(p) }"
                    :title="p.barId ? 'Floor color' : 'No bar assigned'"
                  ></span>
                </div>
                <select
                  class="split-select"
                  :value="p.barId || ''"
                  @change="setPartitionBar(i, $event.target.value)"
                >
                  <option value="">-- No bar --</option>
                  <option
                    v-for="bar in barsInSelectedBuilding"
                    :key="bar.id"
                    :value="bar.id"
                  >{{ (bar.name_en || bar.name_jp) + ' (' + (bar.floor >= 0 ? bar.floor + 'F' : 'B' + Math.abs(bar.floor) + 'F') + ')' }}</option>
                </select>
                <div class="angle-controls">
                  <span class="partition-label">Size</span>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.1"
                    :value="p.weight || 1"
                    @input="setPartitionWeight(i, $event.target.value)"
                    class="angle-slider"
                  />
                  <span class="angle-value">{{ (p.weight || 1).toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

      </WinTabs>
    </template>
  </div>
</template>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
}

.admin-db-row {
  padding: 4px 4px 2px;
  flex-shrink: 0;
}

/* Sub tabs */
.sub-tabs {
  display: flex;
  gap: 1px;
  margin-bottom: 4px;
}

.sub-tab {
  flex: 1;
  padding: 2px 0;
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
}

.sub-tab.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: var(--valhalla-orange);
  font-weight: bold;
}

/* Bar list */
.bar-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}

.bar-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 4px;
  cursor: pointer;
}

.bar-list-item:hover {
  background: var(--win-highlight);
  color: var(--win-highlight-text);
}

.bar-list-content { flex: 1; min-width: 0; }
.bar-list-name { font-weight: 600; }
.bar-list-sub { font-size: 10px; color: var(--win-text-disabled); }
.bar-list-item:hover .bar-list-sub { color: var(--win-highlight-text); opacity: 0.7; }
.bar-list-meta { font-size: 9px; color: var(--win-text-disabled); margin-top: 1px; }
.bar-list-item:hover .bar-list-meta { color: var(--win-highlight-text); opacity: 0.7; }
.bldg-tag { color: var(--valhalla-orange); margin-left: 4px; font-weight: bold; }
.bar-list-item:hover .bldg-tag { color: var(--win-highlight-text); }

.unplace-btn {
  background: var(--win-bg);
  border: none;
  box-shadow: inset 1px 1px 0 var(--win-border-light), inset -1px -1px 0 var(--win-border-dark);
  width: 16px; height: 16px;
  cursor: pointer; font-size: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: var(--win-text);
}
.unplace-btn:active {
  box-shadow: inset 1px 1px 0 var(--win-border-dark), inset -1px -1px 0 var(--win-border-light);
}

.bar-list-empty { padding: 12px; text-align: center; color: var(--win-text-disabled); }

/* Placing info */
.placing-info {
  padding: 8px;
  background: var(--win-bg-dark);
  box-shadow: inset 1px 1px 0 var(--win-border-dark), inset -1px -1px 0 var(--win-border-light);
  text-align: center;
}
.placing-name { font-weight: 700; color: var(--valhalla-orange); }
.placing-sub { font-size: 10px; color: var(--win-text-disabled); }
.placing-hint { color: var(--valhalla-pink); margin-top: 4px; font-size: 10px; }

/* Edit bar toolbar */
.edit-bar-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 4px;
}

/* Edit form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 350px;
  overflow-y: auto;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.edit-field label {
  font-size: 9px;
  color: var(--win-text-disabled);
  text-transform: uppercase;
}

.edit-row {
  display: flex;
  gap: 4px;
}

.edit-textarea {
  width: 100%;
  min-height: 50px;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  outline: none;
  resize: vertical;
}

.edit-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.edit-tag-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  cursor: pointer;
}

.edit-tag-item input {
  accent-color: var(--valhalla-orange);
}

.edit-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  justify-content: flex-end;
}

/* Tags tab */
.tag-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.tag-list-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
}

.tag-list-item:hover {
  background: var(--win-bg-dark);
}

.tag-swatch {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
}

.tag-icon { font-size: 12px; flex-shrink: 0; }
.tag-label-text { flex: 1; }
.tag-id { font-size: 9px; color: var(--win-text-disabled); }

.tag-add-form {
  border-top: 1px solid var(--win-border-dark);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-input {
  width: 100%;
  height: 21px;
  padding: 1px;
  border: none;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  cursor: pointer;
}

/* Photo upload */
.edit-photos-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
  min-height: 20px;
}

.edit-photo-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.edit-photo-thumb {
  width: 72px;
  height: 54px;
  object-fit: cover;
  display: block;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.edit-photo-empty {
  font-size: 10px;
  color: var(--win-text-disabled);
  padding: 4px 0;
}

.edit-photo-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.edit-file-input {
  flex: 1;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
}

/* Icon preview */
.icon-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.edit-field-hint {
  font-size: 9px;
  color: var(--win-text-disabled);
}

/* Tag drag reorder */
.drag-handle {
  cursor: grab;
  color: var(--win-text-disabled);
  font-size: 14px;
  flex-shrink: 0;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.tag-list-item.drag-over {
  border-top: 2px solid var(--valhalla-orange);
}

/* Building editor */
.building-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.building-id {
  font-weight: 700;
  color: var(--valhalla-orange);
  padding: 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.partition-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.partition-count {
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}

.split-select {
  width: 100%;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  outline: none;
}

.partition-colors {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.partition-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.partition-label {
  font-size: 10px;
  color: var(--win-text-disabled);
  min-width: 40px;
}

.partition-color-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background: var(--win-bg-dark);
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.partition-floor-swatch {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 2px;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.angle-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.angle-slider {
  flex: 1;
  height: 14px;
}

.angle-value {
  font-size: 10px;
  min-width: 30px;
  text-align: right;
}

/* Schedule editor */
.edit-time-input {
  width: 100%;
  padding: 2px 4px;
  font-family: var(--win-font);
  font-size: var(--win-font-size);
  color: var(--win-text);
  background: var(--win-bg-dark);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  outline: none;
}

.closed-day-buttons {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
}

.closed-day-btn {
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  background: var(--win-bg);
  border: none;
  padding: 2px 6px;
  cursor: pointer;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
}

.closed-day-btn:active,
.closed-day-btn.active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
  background: var(--win-bg-dark);
  color: #e05050;
  font-weight: bold;
}

.override-add-btn {
  background: none;
  border: none;
  color: var(--valhalla-orange);
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  padding: 0 4px;
}

.override-row {
  align-items: center;
}

/* Photos tab */
.photo-tab-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--win-border-dark);
}

.photo-tab-back {
  background: var(--win-bg);
  border: none;
  box-shadow:
    inset 1px 1px 0 var(--win-border-light),
    inset -1px -1px 0 var(--win-border-dark);
  padding: 2px 6px;
  cursor: pointer;
  font-family: var(--win-font);
  font-size: 10px;
  color: var(--win-text);
  flex-shrink: 0;
}

.photo-tab-back:active {
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.photo-tab-title {
  min-width: 0;
  flex: 1;
}

.photo-tab-name {
  font-weight: 700;
  color: var(--valhalla-orange);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-tab-sub {
  font-size: 9px;
  color: var(--win-text-disabled);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-tab-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  padding: 2px;
  margin-bottom: 8px;
}

.photo-tab-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 80px;
}

.photo-tab-thumb {
  width: 80px;
  height: 60px;
  object-fit: cover;
  display: block;
  box-shadow:
    inset 1px 1px 0 var(--win-border-dark),
    inset -1px -1px 0 var(--win-border-light);
}

.photo-tab-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
}

.photo-tab-type {
  font-size: 9px;
  color: var(--win-text-disabled);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.photo-tab-upload {
  border-top: 1px solid var(--win-border-dark);
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.upload-error {
  font-size: 10px;
  color: #c0392b;
  padding: 2px 0;
}
</style>
