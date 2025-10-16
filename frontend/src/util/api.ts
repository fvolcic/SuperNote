const headers = {
  'Content-Type': 'application/json'
}

async function http(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  if (!res.ok) throw new Error(String(res.status))
  if (res.status === 204) return null
  return res.json()
}

export async function createWorkspace(body: any) {
  return http('/api/workspaces/', { method:'POST', headers, body: JSON.stringify(body) })
}

export async function getWorkspace(id: string) {
  return http(`/api/workspaces/${id}/`)
}

export async function updateWorkspace(id: string, body: any, wt: string) {
  return http(`/api/workspaces/${id}/`, { method:'PATCH', headers: { ...headers, Authorization: `Bearer ${wt}` }, body: JSON.stringify(body) })
}

export async function listProjects(workspaceId: string) {
  return http(`/api/projects/?workspace=${workspaceId}`)
}

export async function createProject(body: any, wt: string) {
  return http('/api/projects/', { method:'POST', headers: { ...headers, Authorization: `Bearer ${wt}` }, body: JSON.stringify(body) })
}

export async function listNotes(projectId: string) {
  return http(`/api/notes/?project=${projectId}`)
}

export async function createNote(body: any, wt: string) {
  return http('/api/notes/', { method:'POST', headers: { ...headers, Authorization: `Bearer ${wt}` }, body: JSON.stringify(body) })
}

export async function updateNote(id: string, body: any, wt: string) {
  return http(`/api/notes/${id}/`, { method:'PATCH', headers: { ...headers, Authorization: `Bearer ${wt}` }, body: JSON.stringify(body) })
}

export async function getNote(id: string) {
  return http(`/api/notes/${id}/`)
}
