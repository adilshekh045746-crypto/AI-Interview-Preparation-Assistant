import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowRight, Award, Bot, BrainCircuit, BriefcaseBusiness, CheckCircle2, ChevronRight, CircleHelp, ClipboardList, Code2, Gauge, GraduationCap, MessageCircle, Mic2, RefreshCw, Send, Sparkles, Target, TrendingUp, UserRound, WandSparkles } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const navItems = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'questions', label: 'Question generator', icon: ClipboardList },
  { id: 'mock', label: 'Mock interview', icon: MessageCircle },
  { id: 'analysis', label: 'Answer analysis', icon: BrainCircuit },
]
const starterQuestions = [
  'Tell me about yourself and why you are interested in this role.',
  'Describe a project you are proud of. What was your contribution?',
  'How do you approach learning a new technology?',
]
export default function App() {
  const [page, setPage] = useState('overview')
  const [role, setRole] = useState('Frontend Developer')
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [topic, setTopic] = useState('Mixed')
  const [questions, setQuestions] = useState(starterQuestions)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('demo')
  const [apiOnline, setApiOnline] = useState(false)
  const [chat, setChat] = useState([])
  const [message, setMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(starterQuestions[0])
  const [answer, setAnswer] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  useEffect(() => {
    fetch(`${API}/api/status`).then(r => r.json()).then(d => { setApiOnline(true); setMode(d.ai_enabled ? 'ai' : 'demo') }).catch(() => setApiOnline(false))
  }, [])

  const average = useMemo(() => history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0, [history])

  async function generate() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/generate`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({role, difficulty, topic}) })
      if (!res.ok) throw new Error('Could not generate questions.')
      const data = await res.json(); setQuestions(data.questions); setMode(data.mode); setSelectedQuestion(data.questions[0])
    } catch { setError('Cannot reach the Python server. Start the backend and try again.') }
    finally { setLoading(false) }
  }

  async function analyze() {
    if (!answer.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/analyze`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({role, question:selectedQuestion, answer}) })
      if (!res.ok) throw new Error()
      const data = await res.json(); setAnalysis(data); setMode(data.mode); setHistory(prev => [...prev, data.score])
    } catch { setError('Cannot analyze right now. Check that the Python backend is running.') }
    finally { setLoading(false) }
  }

  async function startChat() {
    setChat([]); setChatLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/chat`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({role,difficulty,messages:[]})})
      if (!res.ok) throw new Error('AI service unavailable')
      const data = await res.json(); setChat([{role:'assistant',content:data.reply}]); setMode(data.mode)
    } catch { setError('Cannot reach the backend. Start the Python server first.') }
    finally { setChatLoading(false) }
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!message.trim() || chatLoading) return
    const next = [...chat, {role:'user',content:message.trim()}]
    setChat(next); setMessage(''); setChatLoading(true)
    try {
      const res = await fetch(`${API}/api/chat`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({role,difficulty,messages:next})})
      if (!res.ok) throw new Error('AI service unavailable')
      const data = await res.json(); setChat([...next,{role:'assistant',content:data.reply}]); setMode(data.mode)
    } catch { setError('Message not sent. Check your backend connection.') }
    finally { setChatLoading(false) }
  }

  function choosePage(id) { setPage(id); setError('') }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><WandSparkles size={21}/></div><div><b>Prepwise</b><span>AI INTERVIEW COACH</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(item => <button key={item.id} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>choosePage(item.id)}><item.icon size={18}/><span>{item.label}</span>{page===item.id&&<ChevronRight size={15} className="nav-arrow"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="upgrade-card"><div className="upgrade-icon"><GraduationCap size={18}/></div><b>Ready for your next role?</b><p>Small practice sessions build interview confidence.</p><button onClick={()=>choosePage('questions')}>Start practicing <ArrowRight size={14}/></button></div>
        <div className="profile"><div className="avatar">A</div><div><b>Adil</b><span>Candidate workspace</span></div><span className="online-dot"/></div>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{navItems.find(n=>n.id===page)?.label || 'Overview'}</b></div><div className="top-actions"><div className={`status ${apiOnline?'connected':'disconnected'}`}><i/>{apiOnline?'Backend connected':'Backend offline'}</div><div className="top-avatar">A</div></div></header>
      <div className="content">
        {error&&<div className="error-banner">{error}</div>}
        {page==='overview'&&<Overview role={role} setRole={setRole} difficulty={difficulty} setDifficulty={setDifficulty} average={average} history={history} setPage={choosePage} mode={mode}/>}
        {page==='questions'&&<section>
          <PageHeading eyebrow="PRACTICE TOOLKIT" title="Question generator" subtitle="Create focused interview questions for the role you want."/>
          <div className="panel generator-panel"><div className="panel-heading"><div className="panel-icon purple"><Sparkles size={19}/></div><div><h3>Customize your practice</h3><p>Choose a role, difficulty and interview category.</p></div></div>
            <div className="form-grid"><Field label="JOB ROLE"><input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Python Developer"/></Field><Field label="DIFFICULTY"><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field><Field label="QUESTION CATEGORY"><select value={topic} onChange={e=>setTopic(e.target.value)}><option>Mixed</option><option>Technical</option><option>HR</option><option>Behavioral</option></select></Field></div>
            <button className="primary-btn" onClick={generate} disabled={loading||!role.trim()}>{loading?<RefreshCw className="spin" size={17}/>:<WandSparkles size={17}/>} Generate questions</button>
          </div>
          <div className="section-title-row"><div><h3>Your questions</h3><p>{questions.length} questions prepared for {role || 'your role'}</p></div><span className="soft-tag">{mode==='ai'?'AI generated':'Practice examples'}</span></div>
          <div className="question-list">{questions.map((q,i)=><button key={i} className={`question-card ${selectedQuestion===q?'selected':''}`} onClick={()=>{setSelectedQuestion(q);setAnswer('');setAnalysis(null);setPage('analysis')}}><div className="question-number">{String(i+1).padStart(2,'0')}</div><div className="question-text"><b>{q}</b><span>{topic} <i>•</i> {difficulty}</span></div><ChevronRight size={18}/></button>)}</div>
        </section>}
        {page==='mock'&&<section><PageHeading eyebrow="REALISTIC PRACTICE" title="Mock interview" subtitle="Have a one-on-one practice session with your AI interviewer."/><div className="mock-layout"><div className="chat-panel"><div className="chat-header"><div className="interviewer-avatar"><Bot size={21}/></div><div><b>AI Interviewer</b><span><i/> Interview session · {role}</span></div><button className="icon-btn" onClick={startChat} title="Restart interview"><RefreshCw size={17}/></button></div>
          <div className="chat-body">{chat.length===0?<div className="chat-empty"><div className="empty-orb"><MessageCircle size={27}/></div><h3>Your interview starts here</h3><p>When you're ready, start a new session. The interviewer will ask one question at a time.</p><button className="primary-btn" onClick={startChat} disabled={chatLoading}><Mic2 size={17}/> Start interview</button></div>:chat.map((m,i)=><div className={`chat-message ${m.role}`} key={i}><div className="message-avatar">{m.role==='assistant'?<Bot size={15}/>:<UserRound size={15}/>}</div><div className="bubble" style={{whiteSpace: 'pre-wrap'}}>
  {m.content}
</div></div>)}{chatLoading&&<div className="typing"><i/><i/><i/> Interviewer is thinking</div>}</div>
          <form className="chat-compose" onSubmit={sendMessage}><input value={message} onChange={e=>setMessage(e.target.value)} placeholder="Type your answer here..." disabled={!chat.length||chatLoading}/><button className="send-btn" disabled={!chat.length||!message.trim()||chatLoading}><Send size={17}/></button></form></div>
          <div className="tips-panel"><div className="tips-icon"><Target size={19}/></div><h3>Interview tips</h3><ul><li>Keep answers clear and focused.</li><li>Use real examples where possible.</li><li>Explain your own contribution.</li><li>Take a moment to organize your thoughts.</li></ul><div className="tip-note"><Sparkles size={16}/><span>There is no need to rush. Thoughtful answers are better than fast answers.</span></div></div></div></section>}
        {page==='analysis'&&<section><PageHeading eyebrow="PERSONALIZED FEEDBACK" title="Answer analysis" subtitle="Review an answer and get practical suggestions to improve it."/><div className="analysis-layout"><div className="panel answer-panel"><div className="panel-heading"><div className="panel-icon blue"><BrainCircuit size={19}/></div><div><h3>Your answer</h3><p>Select a question and write your response.</p></div></div><Field label="INTERVIEW QUESTION"><select value={selectedQuestion} onChange={e=>setSelectedQuestion(e.target.value)}>{questions.map((q,i)=><option key={i} value={q}>{q}</option>)}</select></Field><Field label="YOUR RESPONSE"><textarea rows="8" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Write your interview answer here. Include examples and explain your approach..."/></Field><div className="answer-footer"><span>{answer.trim()?answer.trim().split(/\s+/).length:0} words</span><button className="primary-btn" onClick={analyze} disabled={loading||!answer.trim()}>{loading?<RefreshCw className="spin" size={17}/>:<BrainCircuit size={17}/>} Analyze answer</button></div></div>
          <div className="feedback-column">{analysis?<Feedback data={analysis}/>:<div className="empty-feedback"><div className="empty-orb"><Gauge size={27}/></div><h3>Your feedback will appear here</h3><p>Submit an answer to receive a score, strengths and specific improvement tips.</p><div className="feedback-mini"><span><CheckCircle2 size={15}/> Clarity</span><span><CheckCircle2 size={15}/> Relevance</span><span><CheckCircle2 size={15}/> Structure</span></div></div>}</div></div></section>}
      </div>
      <footer>© 2026 Prepwise <span>Built to help you practice with confidence.</span></footer>
    </main>
  </div>
}

function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label> }
function PageHeading({eyebrow,title,subtitle}) { return <div className="page-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div> }
function Overview({role,setRole,difficulty,setDifficulty,average,history,setPage,mode}) {
  const stats=[{label:'Practice sessions',value:history.length,sub:'Answers reviewed',icon:ClipboardList,color:'violet'},{label:'Average score',value:average?`${average}/100`:'—',sub:average?'Across your reviews':'Complete an answer review',icon:Gauge,color:'blue'},{label:'Current focus',value:difficulty,sub:role,icon:Target,color:'green'}]
  return <section><div className="welcome-row"><div><span className="eyebrow">YOUR PERSONAL INTERVIEW COACH</span><h1>Good to see you, Adil <span>✦</span></h1><p>Build confidence one thoughtful answer at a time.</p></div><div className="date-pill"><Sparkles size={15}/> Your practice space</div></div>
    <div className="hero-card"><div className="hero-copy"><span className="hero-kicker"><span/> YOUR NEXT OPPORTUNITY STARTS HERE</span><h2>Show up prepared.<br/><em>Stand out with confidence.</em></h2><p>Practice common questions, simulate an interview and understand where you can improve.</p><button className="hero-btn" onClick={()=>setPage('questions')}>Start practicing <ArrowRight size={16}/></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-core"><Bot size={58}/><Sparkles size={20} className="sparkle s1"/><Sparkles size={14} className="sparkle s2"/></div><div className="float-card float-score"><Gauge size={16}/><div><b>Performance</b><span>Track your growth</span></div></div><div className="float-card float-ai"><BrainCircuit size={17}/><span>AI powered feedback</span></div></div></div>
    <div className="stats-grid">{stats.map((s,i)=><div className="stat-card" key={i}><div className={`stat-icon ${s.color}`}><s.icon size={19}/></div><span>{s.label}</span><b>{s.value}</b><small>{s.sub}</small></div>)}</div>
    <div className="overview-bottom"><div className="panel quick-panel"><div className="section-title-row"><div><h3>Choose your next step</h3><p>Pick a tool and get started.</p></div><span className="soft-tag">3 TOOLS</span></div><div className="quick-actions"><button onClick={()=>setPage('questions')}><div className="quick-icon violet"><ClipboardList size={20}/></div><div><b>Generate questions</b><span>Practice role-specific questions</span></div><ChevronRight size={17}/></button><button onClick={()=>setPage('mock')}><div className="quick-icon blue"><MessageCircle size={20}/></div><div><b>Start a mock interview</b><span>Practice a real conversation</span></div><ChevronRight size={17}/></button><button onClick={()=>setPage('analysis')}><div className="quick-icon green"><BrainCircuit size={20}/></div><div><b>Analyze an answer</b><span>Get actionable feedback</span></div><ChevronRight size={17}/></button></div></div>
      <div className="panel setup-panel"><div className="panel-heading"><div className="panel-icon purple"><BriefcaseBusiness size={18}/></div><div><h3>Practice settings</h3><p>Personalize your session.</p></div></div><Field label="TARGET ROLE"><input value={role} onChange={e=>setRole(e.target.value)}/></Field><Field label="DIFFICULTY"><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></Field><div className="mode-line"><span>AI connection</span><b className={mode==='ai'?'ai-on':''}>{mode==='ai'?'Live AI':'Demo mode'}</b></div></div></div>
  </section>
}
function Feedback({data}) {
  const metrics=[['Clarity',data.clarity],['Relevance',data.relevance],['Confidence',data.confidence],['Structure',data.structure]]
  return <div className="panel feedback-panel"><div className="feedback-top"><div><span className="eyebrow">YOUR RESULT</span><h3>Answer feedback</h3></div><span className="soft-tag">{data.mode==='ai'?'AI REVIEW':'DEMO REVIEW'}</span></div><div className="score-area"><div className="score-ring" style={{'--score':`${data.score}%`}}><div><b>{data.score}</b><span>/100</span></div></div><div><b className="score-label">{data.score>=80?'Great progress':data.score>=60?'Good starting point':'Room to improve'}</b><p>{data.summary}</p></div></div><div className="metric-list">{metrics.map(([name,val])=><div className="metric" key={name}><div><span>{name}</span><b>{val}/10</b></div><div className="track"><i style={{width:`${val*10}%`}}/></div></div>)}</div><div className="feedback-section"><h4><CheckCircle2 size={16}/> What went well</h4>{(data.strengths||[]).map((s,i)=><p key={i}>{s}</p>)}</div><div className="feedback-section improve"><h4><TrendingUp size={16}/> Ways to improve</h4>{(data.improvements||[]).map((s,i)=><p key={i}>{s}</p>)}</div><div className="tip-box"><Sparkles size={17}/><div><b>Coach's tip</b><p>{data.sample_tip}</p></div></div><small className="disclaimer">Practice estimate only; not a hiring assessment.</small></div>
}