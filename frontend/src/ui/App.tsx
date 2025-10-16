import React from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { createWorkspace, getWorkspace, listProjects, listNotes, createProject, createNote, updateNote, getNote, updateWorkspace } from '../util/api'
import { encryptText, decryptText, genWK, base64url, hmacWriteToken, deriveKEK, encryptRaw, decryptRaw } from '../util/crypto'
import { saveWK, loadWK, forgetWK } from '../util/storage'
import './styles.css'

function NewWorkspace() {
  const nav = useNavigate()
  const [name, setName] = React.useState('My Workspace')
  const [password, setPassword] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [showPw, setShowPw] = React.useState(false)
  const [error, setError] = React.useState('')

  const onCreate = async () => {
    if (!password) return
    setBusy(true)
    try {
      setError('')
      const wk = genWK()
      const iterations = 150000
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const kek = await deriveKEK(password, salt, iterations)
      const wkBlob = await encryptRaw(kek, wk)
      const wt = await hmacWriteToken(wk)
      const nameEnc = await encryptText(wk, name)
      const res = await createWorkspace({
        wk_blob: wkBlob,
        wk_salt: base64url(salt),
        iterations,
        write_token: wt,
        name_enc: nameEnc,
      })
      if (remember) await saveWK(res.id, wk)
      nav(`/notes/${res.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <div className="card auth-card">
        <div className="brand">Supernote</div>
        <div className="title">Create Workspace</div>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="My Workspace" />
        </div>
        <div className="field">
          <label>Password</label>
          <div className="password-row">
            <input
              className="input"
              type={showPw? 'text':'password'}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Choose a password"
              onKeyDown={e=>{ if (e.key==='Enter' && password && !busy) onCreate() }}
            />
            <button className="btn" onClick={()=>setShowPw(s=>!s)}>{showPw? 'Hide':'Show'}</button>
          </div>
        </div>
        <div className="row-between">
          <label className="checkbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Remember this device</label>
          <button className="btn primary" disabled={busy || !password} onClick={onCreate}>{busy? 'Creating…':'Create'}</button>
        </div>
      </div>
    </div>
  )
}

function Unlock() {
  const { workspaceId } = useParams()
  const nav = useNavigate()
  const [password, setPassword] = React.useState('')
  const [remember, setRemember] = React.useState(true)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [showPw, setShowPw] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      if (!workspaceId) return
      const w = await loadWK(workspaceId)
      if (w) {
        nav(`/notes/${workspaceId}/ws`)
      } else {
        setLoading(false)
      }
    })()
  }, [workspaceId])

  const onUnlock = async () => {
    if (!workspaceId) return
    setError('')
    setBusy(true)
    const ws = await getWorkspace(workspaceId)
    try {
      const saltBuf = base64url('').decode(ws.wk_salt)
      const kek = await deriveKEK(password, new Uint8Array(saltBuf), ws.iterations)
      const wk = await decryptRaw(kek, ws.wk_blob)
      if (remember) await saveWK(workspaceId, wk)
      nav(`/notes/${workspaceId}/ws`)
    } catch (e) {
      setError('Invalid password')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="center"><div className="spinner" /></div>
  const shortId = workspaceId ? `${workspaceId.slice(0,8)}…` : ''
  return (
    <div className="center">
      <div className="card auth-card">
        <div className="brand">Supernote</div>
        <div className="title">Unlock Workspace</div>
        {workspaceId && <div className="subtitle">ID: {shortId}</div>}
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Password</label>
          <div className="password-row">
            <input
              className="input"
              type={showPw? 'text':'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>{ if (e.key==='Enter' && password && !busy) onUnlock() }}
              autoFocus
            />
            <button className="btn" onClick={()=>setShowPw(s=>!s)} aria-label="Toggle password visibility">{showPw? 'Hide':'Show'}</button>
          </div>
        </div>
        <div className="row-between">
          <label className="checkbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Remember this device</label>
          <button className="btn primary" onClick={onUnlock} disabled={!password || busy}>{busy? 'Unlocking…':'Unlock'}</button>
        </div>
        <div className="auth-footer">
          <a className="link" href="/notes/new">Create a new workspace</a>
        </div>
      </div>
    </div>
  )
}

function WorkspaceView() {
  const { workspaceId } = useParams()
  const nav = useNavigate()
  const [wk, setWk] = React.useState<Uint8Array | null>(null)
  const [wt, setWt] = React.useState('')
  const [wsName, setWsName] = React.useState('')
  const [projects, setProjects] = React.useState<any[]>([])
  const [notes, setNotes] = React.useState<any[]>([])
  const [currentProject, setCurrentProject] = React.useState<string>('')
  const [newProjectName, setNewProjectName] = React.useState('')
  const [selectedNoteId, setSelectedNoteId] = React.useState<string>('')
  const [noteTitle, setNoteTitle] = React.useState('')
  const [noteBody, setNoteBody] = React.useState('')
  const [noteTranscript, setNoteTranscript] = React.useState('')
  const [saving, setSaving] = React.useState<'idle'|'saving'|'saved'>('idle')
  const saveTimer = React.useRef<number | null>(null)
  const [aiKey, setAiKey] = React.useState('')
  const [aiKeyInput, setAiKeyInput] = React.useState('')
  const [aiKeyVisible, setAiKeyVisible] = React.useState(false)
  const [aiKeyStatus, setAiKeyStatus] = React.useState<'idle'|'saving'|'error'>('idle')
  const [aiKeyError, setAiKeyError] = React.useState('')
  const [aiQuestion, setAiQuestion] = React.useState('')
  const [aiAnswer, setAiAnswer] = React.useState('')
  const [aiBusy, setAiBusy] = React.useState(false)
  const [aiError, setAiError] = React.useState('')

  React.useEffect(() => {
    (async () => {
      if (!workspaceId) return
      const w = await loadWK(workspaceId)
      if (!w) { nav(`/notes/${workspaceId}`); return }
      setWk(w)
      const wt = await hmacWriteToken(w)
      setWt(wt)
      const ws = await getWorkspace(workspaceId)
      const name = await decryptText(w, ws.name_enc)
      setWsName(name)
      if (ws.ai_key_enc) {
        try {
          const k = await decryptText(w, ws.ai_key_enc)
          setAiKey(k)
        } catch (err) {
          console.error('Failed to decrypt AI key', err)
          setAiKey('')
        }
      } else {
        setAiKey('')
      }
      setAiKeyInput('')
      setAiKeyStatus('idle')
      setAiKeyError('')
      const prjs = await listProjects(workspaceId)
      const dec = await Promise.all(prjs.map(async (p:any) => ({...p, name: await decryptText(w, p.name_enc)})))
      setProjects(dec)
      if (dec[0]) setCurrentProject(dec[0].id)
    })()
  }, [workspaceId])

  React.useEffect(() => {
    (async () => {
      if (!currentProject || !wk) { setNotes([]); setSelectedNoteId(''); return }
      const ns = await listNotes(currentProject)
      const dec = await Promise.all(ns.map(async (n:any) => ({
        ...n,
        title: await decryptText(wk, n.title_enc),
      })))
      setNotes(dec)
      if (dec.length && !selectedNoteId) setSelectedNoteId(dec[0].id)
    })()
  }, [currentProject, wk])

  React.useEffect(() => {
    (async () => {
      if (!wk || !selectedNoteId) { setNoteTitle(''); setNoteBody(''); setNoteTranscript(''); return }
      const n = await getNote(selectedNoteId)
      const title = await decryptText(wk, n.title_enc)
      const body = await decryptText(wk, n.body_enc)
      const transcript = n.transcript_enc ? await decryptText(wk, n.transcript_enc) : ''
      setNoteTitle(title)
      setNoteBody(body)
      setNoteTranscript(transcript)
    })()
  }, [selectedNoteId, wk])

  const onCreateProject = async () => {
    if (!wk || !workspaceId) return
    const name = newProjectName.trim() || 'Project'
    const nameEnc = await encryptText(wk, name)
    const p = await createProject({workspace: workspaceId, name_enc: nameEnc, position: projects.length}, wt)
    setProjects([...projects, {...p, name}])
    setCurrentProject(p.id)
    setNewProjectName('')
  }

  const onCreateNote = async () => {
    if (!wk || !currentProject) return
    const title = ''
    const body = ''
    const title_enc = await encryptText(wk, title)
    const body_enc = await encryptText(wk, body)
    const note = await createNote({project: currentProject, title_enc, body_enc, position: notes.length}, wt)
    const newList = [...notes, {...note, title}]
    setNotes(newList)
    setSelectedNoteId(note.id)
  }

  const scheduleSave = async (title: string, body: string, transcript: string) => {
    if (!wk || !selectedNoteId) return
    setSaving('saving')
    const [title_enc, body_enc, transcript_enc] = await Promise.all([
      encryptText(wk, title),
      encryptText(wk, body),
      transcript ? encryptText(wk, transcript) : Promise.resolve(null)
    ])
    await updateNote(selectedNoteId, { title_enc, body_enc, transcript_enc }, wt)
    setSaving('saved')
    window.setTimeout(() => setSaving('idle'), 600)
  }

  const onTitleChange = (v: string) => {
    setNoteTitle(v)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => scheduleSave(v, noteBody, noteTranscript), 400)
  }

  const onBodyChange = (v: string) => {
    setNoteBody(v)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => scheduleSave(noteTitle, v, noteTranscript), 400)
  }

  const onTranscriptChange = (v: string) => {
    setNoteTranscript(v)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => scheduleSave(noteTitle, noteBody, v), 400)
  }

  const onSaveAiKey = async () => {
    if (!wk || !workspaceId) return
    const trimmed = aiKeyInput.trim()
    if (!trimmed) {
      setAiKeyError('Enter a key before saving')
      setAiKeyStatus('error')
      return
    }
    try {
      setAiKeyStatus('saving')
      setAiKeyError('')
      const enc = await encryptText(wk, trimmed)
      await updateWorkspace(workspaceId, { ai_key_enc: enc }, wt)
      setAiKey(trimmed)
      setAiKeyInput('')
      setAiKeyVisible(false)
      setAiKeyStatus('idle')
    } catch (err) {
      console.error('Failed to save AI key', err)
      setAiKeyStatus('error')
      setAiKeyError('Unable to save key. Try again.')
    }
  }

  const onClearAiKey = async () => {
    if (!wk || !workspaceId) return
    try {
      setAiKeyStatus('saving')
      setAiKeyError('')
      await updateWorkspace(workspaceId, { ai_key_enc: null }, wt)
      setAiKey('')
      setAiKeyInput('')
      setAiKeyVisible(false)
      setAiKeyStatus('idle')
    } catch (err) {
      console.error('Failed to clear AI key', err)
      setAiKeyStatus('error')
      setAiKeyError('Unable to remove key. Try again.')
    }
  }

  const collectWorkspaceNotes = async () => {
    if (!wk || !workspaceId) return []
    const projectContexts = await Promise.all(projects.map(async (p:any) => {
      const ns = await listNotes(p.id)
      const entries = await Promise.all(ns.map(async (n:any) => {
        const title = await decryptText(wk, n.title_enc)
        const body = await decryptText(wk, n.body_enc)
        const transcript = n.transcript_enc ? await decryptText(wk, n.transcript_enc) : ''
        return { title, body, transcript }
      }))
      return { projectName: p.name as string, notes: entries }
    }))
    return projectContexts
  }

  const onAskAi = async () => {
    if (!aiKey) {
      setAiError('Add and save an OpenAI API key to ask questions.')
      return
    }
    const question = aiQuestion.trim()
    if (!question) {
      setAiError('Enter a question first.')
      return
    }
    try {
      setAiBusy(true)
      setAiError('')
      setAiAnswer('')
      const context = await collectWorkspaceNotes()
      if (!context.length) {
        setAiError('No notes found to build context.')
        setAiBusy(false)
        return
      }
      const segments: string[] = []
      context.forEach(project => {
        if (!project.notes.length) return
        project.notes.forEach(note => {
          segments.push([
            `Project: ${project.projectName || 'Untitled Project'}`,
            `Note: ${note.title || 'Untitled Note'}`,
            `Body:\n${note.body || '(empty)'}`,
            note.transcript ? `Transcript:\n${note.transcript}` : ''
          ].filter(Boolean).join('\n\n'))
        })
      })
      if (!segments.length) {
        setAiError('No note content available for the assistant.')
        setAiBusy(false)
        return
      }
      let contextText = segments.join('\n\n---\n\n')
      const maxContextChars = 15000
      if (contextText.length > maxContextChars) {
        contextText = contextText.slice(contextText.length - maxContextChars)
      }
      const payload = {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that answers questions about encrypted workspace notes. Use only the provided context. Respond in GitHub-flavored Markdown.'
          },
          {
            role: 'user',
            content: `Context:\n${contextText}\n\nQuestion:\n${question}`
          }
        ],
        temperature: 0.2,
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiKey}`
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
      }
      const data = await res.json()
      const answer = data?.choices?.[0]?.message?.content?.trim()
      if (!answer) {
        setAiError('Received an empty response from the assistant.')
      } else {
        setAiAnswer(answer)
      }
    } catch (err: any) {
      console.error('AI query failed', err)
      setAiError(err?.message || 'Assistant request failed. Try again.')
    } finally {
      setAiBusy(false)
    }
  }

  const onLock = async () => {
    if (!workspaceId) return
    await forgetWK(workspaceId)
    nav(`/notes/${workspaceId}`)
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="ws-name">{wsName}</span>
          <button className="btn" onClick={onLock}>Lock</button>
        </div>
        <div className="sidebar-section">
          <div className="input-row">
            <input className="input" placeholder="New project" value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} />
            <button className="btn" onClick={onCreateProject}>Add</button>
          </div>
          <ul className="list">
            {projects.map(p => (
              <li className={p.id===currentProject? 'list-item active' : 'list-item'} key={p.id} onClick={()=>setCurrentProject(p.id)}>
                {p.name || 'Untitled'}
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar-section ai-section">
          <div className="section-title">AI Assistant</div>
          {aiKey ? (
            <div className="ai-key-row">
              <span className="ai-key-status">{aiKeyVisible ? aiKey : 'Key saved'}</span>
              <div className="ai-key-actions">
                <button className="btn" onClick={()=>setAiKeyVisible(v=>!v)}>{aiKeyVisible ? 'Hide' : 'Show'}</button>
                <button className="btn" onClick={onClearAiKey} disabled={aiKeyStatus==='saving'}>Remove</button>
              </div>
            </div>
          ) : (
            <div className="ai-key-status muted">No key saved</div>
          )}
          <div className="field ai-field">
            <label>Store / update key</label>
            <div className="password-row">
              <input
                className="input"
                type="password"
                placeholder="sk-..."
                value={aiKeyInput}
                onChange={e=>{ setAiKeyInput(e.target.value); setAiKeyError(''); setAiKeyStatus('idle') }}
              />
              <button className="btn primary" onClick={onSaveAiKey} disabled={aiKeyStatus==='saving'}>
                {aiKeyStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          {aiKeyError && <div className="error">{aiKeyError}</div>}
        </div>
      </aside>
      <section className="notes">
        <div className="notes-header">
          <button className="btn primary" onClick={onCreateNote}>+ New note</button>
        </div>
        <ul className="list notes-list">
          {notes.map(n => (
            <li key={n.id} className={n.id===selectedNoteId? 'list-item active' : 'list-item'} onClick={()=>setSelectedNoteId(n.id)}>
              {n.title || 'Untitled'}
            </li>
          ))}
        </ul>
      </section>
      <section className="editor">
        <div className="editor-header">
          <input className="title-input" placeholder="Title" value={noteTitle} onChange={e=>onTitleChange(e.target.value)} />
          <span className={`saving ${saving}`}>{saving==='saving'?'Saving…':saving==='saved'?'Saved':''}</span>
        </div>
        <div className="editor-body">
          <textarea className="textarea" placeholder="Write your note…" value={noteBody} onChange={e=>onBodyChange(e.target.value)} />
          <div className="divider" />
          <textarea className="textarea" placeholder="Transcript (optional)" value={noteTranscript} onChange={e=>onTranscriptChange(e.target.value)} />
        </div>
        <div className="assistant-panel">
          <div className="assistant-header">
            <span className="assistant-title">Ask AI About This Workspace</span>
            <span className={`assistant-status ${aiBusy ? 'busy' : aiAnswer ? 'done' : ''}`}>
              {aiBusy ? 'Thinking…' : aiAnswer ? 'Done' : ''}
            </span>
          </div>
          <textarea
            className="assistant-question"
            placeholder="Ask a question about the notes across all projects…"
            value={aiQuestion}
            onChange={e=>{ setAiQuestion(e.target.value); if (aiError) setAiError('') }}
          />
          <div className="assistant-actions">
            <button className="btn" onClick={()=>{ setAiQuestion(''); setAiAnswer(''); setAiError('') }} disabled={aiBusy}>
              Clear
            </button>
            <button className="btn primary" onClick={onAskAi} disabled={aiBusy}>
              {aiBusy ? 'Asking…' : 'Ask'}
            </button>
          </div>
          {aiError && <div className="error">{aiError}</div>}
          {aiAnswer && (
            <pre className="assistant-answer">{aiAnswer}</pre>
          )}
        </div>
      </section>
    </div>
  )
}

export default function App(){
  return (
    <Routes>
      <Route path="new" element={<NewWorkspace />} />
      <Route path=":workspaceId" element={<Unlock />} />
      <Route path=":workspaceId/ws" element={<WorkspaceView />} />
      <Route path="*" element={<Navigate to="/notes/new" replace />} />
    </Routes>
  )
}
