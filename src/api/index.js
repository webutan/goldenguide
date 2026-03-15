const BASE = '/api'

let adminPassword = ''

export function setAdminPassword(pwd) {
  adminPassword = pwd
}

function adminHeaders(extra = {}) {
  return { 'X-Admin-Password': adminPassword, ...extra }
}

export async function fetchBars() {
  const res = await fetch(`${BASE}/bars`)
  if (!res.ok) throw new Error('Failed to fetch bars')
  return res.json()
}

export async function fetchBar(slug) {
  const res = await fetch(`${BASE}/bars/${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error('Failed to fetch bar')
  return res.json()
}

export async function fetchTags() {
  const res = await fetch(`${BASE}/tags`)
  if (!res.ok) throw new Error('Failed to fetch tags')
  return res.json()
}

export async function updateBar(id, data) {
  const res = await fetch(`${BASE}/bars/${id}`, {
    method: 'PATCH',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update bar')
  return res.json()
}

export async function createTag(data) {
  const res = await fetch(`${BASE}/tags`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create tag')
  return res.json()
}

export async function updateTag(id, data) {
  const res = await fetch(`${BASE}/tags/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update tag')
  return res.json()
}

export async function deleteTag(id) {
  const res = await fetch(`${BASE}/tags/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete tag')
  return res.json()
}

export async function createBar(data) {
  const res = await fetch(`${BASE}/bars`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create bar')
  return res.json()
}

export async function deleteBar(id) {
  const res = await fetch(`${BASE}/bars/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete bar')
  return res.json()
}

export async function fetchFeed() {
  const res = await fetch(`${BASE}/feed`)
  if (!res.ok) throw new Error('Failed to fetch feed')
  return res.json()
}

export async function fetchBarFeed(handle) {
  const res = await fetch(`${BASE}/feed/account/${encodeURIComponent(handle)}`)
  if (!res.ok) throw new Error('Failed to fetch bar feed')
  return res.json()
}

export async function fetchAnnotations() {
  const res = await fetch(`${BASE}/annotations`)
  if (!res.ok) throw new Error('Failed to fetch annotations')
  return res.json()
}

export async function createAnnotation(data) {
  const res = await fetch(`${BASE}/annotations`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create annotation')
  return res.json()
}

export async function updateAnnotation(id, data) {
  const res = await fetch(`${BASE}/annotations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update annotation')
  return res.json()
}

export async function deleteAnnotation(id) {
  const res = await fetch(`${BASE}/annotations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete annotation')
  return res.json()
}

export async function uploadAnnotationIcon(annotationId, file) {
  const form = new FormData()
  form.append('icon', file)
  const res = await fetch(`${BASE}/annotations/${encodeURIComponent(annotationId)}/icon`, {
    method: 'POST',
    headers: adminHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload annotation icon')
  return res.json()
}

export async function fetchPartitions() {
  const res = await fetch(`${BASE}/partitions`)
  if (!res.ok) throw new Error('Failed to fetch partitions')
  return res.json()
}

export async function savePartition(buildingId, data) {
  const res = await fetch(`${BASE}/partitions/${encodeURIComponent(buildingId)}`, {
    method: 'PUT',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save partition')
  return res.json()
}

export async function uploadPhoto(barId, file, type = 'general') {
  const form = new FormData()
  form.append('photo', file)
  form.append('type', type)
  const res = await fetch(`${BASE}/bars/${barId}/photos`, {
    method: 'POST',
    headers: adminHeaders(),
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload photo')
  return res.json()
}

export async function fetchBarPhotos(barId) {
  const res = await fetch(`${BASE}/bars/${barId}/photos`)
  if (!res.ok) throw new Error('Failed to fetch photos')
  return res.json()
}

export async function deletePhoto(photoId) {
  const res = await fetch(`${BASE}/photos/${photoId}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  })
  if (!res.ok) throw new Error('Failed to delete photo')
  return res.json()
}
