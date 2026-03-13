/* eslint-disable */
import { useState, useEffect, useRef } from "react";

const AGENTS = [
  { id: "lead",       name: "Nexus",  role: "Lead Orchestrator",   emoji: "🧠", color: "#00f5d4" },
  { id: "researcher", name: "Scout",  role: "Deep Researcher",     emoji: "🔍", color: "#f72585" },
  { id: "analyst",    name: "Prism",  role: "Data Analyst",        emoji: "📊", color: "#7209b7" },
  { id: "writer",     name: "Quill",  role: "Content Strategist",  emoji: "✍️", color: "#4cc9f0" },
  { id: "critic",     name: "Edge",   role: "Quality Reviewer",    emoji: "🎯", color: "#f77f00" },
];

const SYSTEM_PROMPTS = {
  lead: `You are Nexus, the Lead Orchestrator of an AI agent swarm. Analyze the user request and create a clear task breakdown plan. List 3-4 specific subtasks and assign each to: Scout (research), Prism (analysis), Quill (writing), Edge (review). Be concise. Format: start with "SWARM PLAN:" then numbered tasks.`,
  researcher: `You are Scout, a Deep Research agent. Given a task, provide thorough research findings, facts, and background context. Be specific. Start with "RESEARCH FINDINGS:"`,
  analyst: `You are Prism, a Data Analyst agent. Given research findings, extract key patterns, insights, and analytical conclusions. Start with "ANALYSIS:"`,
  writer: `You are Quill, a Content Strategist. Given analysis and research, craft the final polished output the user needs. Be comprehensive. Start with "FINAL OUTPUT:"`,
  critic: `You are Edge, the Quality Reviewer. Review the output and provide 2-3 specific improvements or validations. Start with "REVIEW:"`,
};

async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text || "Agent unavailable.";
}

export default function SwarmOS() {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [activeAgent, setActiveAgent] = useState(null);
  const [agentOutputs, setAgentOutputs] = useState({});
  const [agentStatus, setAgentStatus] = useState({});
  const [finalResult, setFinalResult] = useState(null);
  const [error, setError] = useState(null);
  const [particles, setParticles] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    setParticles(
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        dur: Math.random() * 20 + 10,
        opacity: Math.random() * 0.35 + 0.08,
        delay: Math.random() * -20,
      }))
    );
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [agentOutputs, finalResult, error]);

  function setStatus(id, s) {
    setAgentStatus(function(p) { return Object.assign({}, p, { [id]: s }); });
  }

  function setOutput(id, t) {
    setAgentOutputs(function(p) { return Object.assign({}, p, { [id]: t }); });
  }

  async function launchSwarm() {
    if (!input.trim() || running) return;
    const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError("No API key found. Please set REACT_APP_ANTHROPIC_API_KEY in Vercel environment variables.");
      return;
    }
    setRunning(true);
    setError(null);
    setAgentOutputs({});
    setAgentStatus({});
    setFinalResult(null);

    try {
      setActiveAgent("lead");
      setStatus("lead", "thinking");
      const plan = await callClaude(SYSTEM_PROMPTS.lead, input);
      setOutput("lead", plan);
      setStatus("lead", "done");

      setActiveAgent("researcher");
      setStatus("researcher", "thinking");
      const research = await callClaude(
        SYSTEM_PROMPTS.researcher,
        "Original task: " + input + "\n\nSwarm plan:\n" + plan + "\n\nConduct your research now."
      );
      setOutput("researcher", research);
      setStatus("researcher", "done");

      setActiveAgent("analyst");
      setStatus("analyst", "thinking");
      const analysis = await callClaude(
        SYSTEM_PROMPTS.analyst,
        "Original task: " + input + "\n\nResearch:\n" + research + "\n\nProvide your analysis."
      );
      setOutput("analyst", analysis);
      setStatus("analyst", "done");

      setActiveAgent("writer");
      setStatus("writer", "thinking");
      const written = await callClaude(
        SYSTEM_PROMPTS.writer,
        "Original task: " + input + "\n\nResearch:\n" + research + "\n\nAnalysis:\n" + analysis + "\n\nCraft the final output."
      );
      setOutput("writer", written);
      setStatus("writer", "done");

      setActiveAgent("critic");
      setStatus("critic", "thinking");
      const review = await callClaude(
        SYSTEM_PROMPTS.critic,
        "Original task: " + input + "\n\nFinal output:\n" + written + "\n\nProvide your review."
      );
      setOutput("critic", review);
      setStatus("critic", "done");

      setFinalResult({ written: written, review: review });
    } catch (e) {
      setError("Error: " + e.message);
    }

    setActiveAgent(null);
    setRunning(false);
  }

  function reset() {
    setInput("");
    setAgentOutputs({});
    setAgentStatus({});
    setFinalResult(null);
    setError(null);
    setActiveAgent(null);
  }

  function statusColor(s) {
    if (s === "thinking") return "#f72585";
    if (s === "done") return "#00f5d4";
    return "#2a2a3a";
  }

  function statusLabel(s) {
    if (s === "thinking") return "ACTIVE";
    if (s === "done") return "DONE";
    return "STANDBY";
  }

  var glowMap = {
    "lead": "glow00",
    "researcher": "glowF7",
    "analyst": "glow72",
    "writer": "glow4c",
    "critic": "glowF7b"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060608",
      color: "#e8e8f0",
      fontFamily: "'Space Mono','Courier New',monospace",
      position: "relative",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@700;900&display=swap');
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-35px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-55px)} }
        @keyframes floatC { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.15)} }
        @keyframes scan { 0%{top:-4px} 100%{top:105%} }
        @keyframes glow00 { 0%,100%{box-shadow:0 0 8px #00f5d4} 50%{box-shadow:0 0 28px #00f5d4,0 0 55px rgba(0,245,212,0.3)} }
        @keyframes glowF7 { 0%,100%{box-shadow:0 0 8px #f72585} 50%{box-shadow:0 0 28px #f72585,0 0 55px rgba(247,37,133,0.3)} }
        @keyframes glow72 { 0%,100%{box-shadow:0 0 8px #7209b7} 50%{box-shadow:0 0 28px #7209b7,0 0 55px rgba(114,9,183,0.3)} }
        @keyframes glow4c { 0%,100%{box-shadow:0 0 8px #4cc9f0} 50%{box-shadow:0 0 28px #4cc9f0,0 0 55px rgba(76,201,240,0.3)} }
        @keyframes glowF7b { 0%,100%{box-shadow:0 0 8px #f77f00} 50%{box-shadow:0 0 28px #f77f00,0 0 55px rgba(247,127,0,0.3)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #00f5d4; border-radius: 2px; }
      `}</style>

      {/* Background particles */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        {particles.map(function(p) {
          var anims = ["floatA","floatB","floatC"];
          return (
            <div key={p.id} style={{
              position:"absolute", left: p.x + "%", top: p.y + "%",
              width:p.size, height:p.size, borderRadius:"50%",
              background:"#00f5d4", opacity:p.opacity,
              animation: anims[p.id % 3] + " " + p.dur + "s " + p.delay + "s linear infinite",
            }}/>
          );
        })}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(0,245,212,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,212,.025) 1px,transparent 1px)",
          backgroundSize:"44px 44px",
        }}/>
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(ellipse 70% 50% at 50% 0%,rgba(0,245,212,.06) 0%,transparent 70%)",
        }}/>
      </div>

      <div style={{ position:"relative", zIndex:1, maxWidth:920, margin:"0 auto", padding:"20px 16px 80px" }}>

        {/* Header */}
        <div style={{ textAlign:"center", padding:"44px 0 32px" }}>
          <div style={{ fontSize:10, letterSpacing:8, color:"#00f5d4", marginBottom:14, opacity:.6 }}>
            AUTONOMOUS INTELLIGENCE NETWORK
          </div>
          <h1 style={{
            fontFamily:"'Orbitron',monospace", fontWeight:900, margin:0,
            fontSize:"clamp(2.2rem,7vw,4rem)", letterSpacing:3,
            background:"linear-gradient(120deg,#00f5d4 0%,#4cc9f0 40%,#f72585 80%,#f77f00 100%)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"shimmer 6s linear infinite",
          }}>SWARM OS</h1>
          <div style={{ fontSize:11, color:"#444", marginTop:10, letterSpacing:4 }}>
            MULTI-AGENT INTELLIGENCE PLATFORM · 5 AGENTS · PARALLEL COGNITION
          </div>
        </div>

        {/* Agent Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:28 }}>
          {AGENTS.map(function(agent) {
            var isActive = activeAgent === agent.id;
            var status = agentStatus[agent.id];
            return (
              <div key={agent.id} style={{
                background: isActive ? agent.color + "18" : status === "done" ? agent.color + "08" : "#0d0d15",
                border: "1px solid " + (isActive ? agent.color : status === "done" ? agent.color + "50" : "#1a1a28"),
                borderRadius:10, padding:"14px 8px", textAlign:"center",
                position:"relative", overflow:"hidden", transition:"all 0.3s",
                animation: isActive ? glowMap[agent.id] + " 1.6s ease infinite" : "none",
              }}>
                {isActive && (
                  <div style={{
                    position:"absolute", left:0, right:0, height:2,
                    background:"linear-gradient(90deg,transparent," + agent.color + ",transparent)",
                    animation:"scan 1.8s linear infinite",
                  }}/>
                )}
                <div style={{ fontSize:24, marginBottom:6 }}>{agent.emoji}</div>
                <div style={{
                  fontSize:11, fontWeight:700, letterSpacing:1,
                  color: isActive ? agent.color : status === "done" ? agent.color : "#777",
                }}>{agent.name}</div>
                <div style={{ fontSize:8, color:"#383848", marginTop:3, letterSpacing:.5 }}>
                  {agent.role.toUpperCase()}
                </div>
                <div style={{
                  fontSize:8, marginTop:8, color:statusColor(status), letterSpacing:.5,
                  animation: isActive ? "pulse 1s ease infinite" : "none",
                }}>{statusLabel(status)}</div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div style={{
          background:"#0d0d15", border:"1px solid #1c1c2e",
          borderRadius:12, padding:22, marginBottom:24,
        }}>
          <div style={{ fontSize:9, color:"#00f5d4", letterSpacing:4, marginBottom:12, opacity:.8 }}>
            // MISSION INPUT
          </div>
          <textarea
            value={input}
            onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter" && e.ctrlKey) launchSwarm(); }}
            placeholder={"Describe your mission...\n\nExamples:\n\u2022 Write a business plan for an AI startup\n\u2022 Analyze pros and cons of solar energy for homes\n\u2022 Create a marketing strategy for a SaaS product"}
            rows={5}
            style={{
              width:"100%", background:"transparent", border:"none",
              color:"#dde", fontFamily:"'Space Mono',monospace",
              fontSize:13, lineHeight:1.7, resize:"none", boxSizing:"border-box",
            }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontSize:9, color:"#2a2a3a" }}>CTRL + ENTER to launch</div>
            <button
              onClick={launchSwarm}
              disabled={running || !input.trim()}
              style={{
                background: (running || !input.trim()) ? "#111" : "linear-gradient(135deg,#00f5d4,#4cc9f0)",
                border:"none", borderRadius:7, padding:"12px 32px",
                color: (running || !input.trim()) ? "#333" : "#060608",
                fontFamily:"'Orbitron',monospace", fontWeight:700,
                fontSize:11, letterSpacing:2,
                cursor: (running || !input.trim()) ? "not-allowed" : "pointer",
                transition:"all .2s",
              }}
            >
              {running ? "SWARMING..." : "LAUNCH SWARM"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:"#1a0808", border:"1px solid rgba(247,37,133,0.4)",
            borderRadius:8, padding:"14px 18px", marginBottom:16,
            fontSize:12, color:"#f72585", animation:"fadeIn .4s ease",
          }}>{error}</div>
        )}

        {/* Agent Outputs */}
        {AGENTS.map(function(agent) {
          var output = agentOutputs[agent.id];
          var isThinking = agentStatus[agent.id] === "thinking";
          if (!output && !isThinking) return null;
          return (
            <div key={agent.id} style={{
              background:"#090910",
              border:"1px solid " + agent.color + "35",
              borderLeft:"3px solid " + agent.color,
              borderRadius:10, marginBottom:14, overflow:"hidden",
              animation:"fadeIn .45s ease",
            }}>
              <div style={{
                background: agent.color + "0d", padding:"11px 18px",
                display:"flex", alignItems:"center", gap:10,
                borderBottom:"1px solid " + agent.color + "20",
              }}>
                <span style={{ fontSize:18 }}>{agent.emoji}</span>
                <span style={{ fontFamily:"'Orbitron',monospace", fontSize:11, color:agent.color, letterSpacing:1 }}>
                  {agent.name}
                </span>
                <span style={{ fontSize:10, color:"#444" }}>— {agent.role}</span>
                {isThinking && (
                  <span style={{ marginLeft:"auto", fontSize:9, color:agent.color, animation:"pulse 1s infinite" }}>
                    PROCESSING...
                  </span>
                )}
              </div>
              <div style={{ padding:"16px 18px" }}>
                {isThinking ? (
                  <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                    {[0,1,2].map(function(i) {
                      return (
                        <div key={i} style={{
                          width:7, height:7, borderRadius:"50%", background:agent.color,
                          animation:"pulse 1s ease " + (i * 0.22) + "s infinite",
                        }}/>
                      );
                    })}
                    <span style={{ fontSize:11, color:"#333", marginLeft:6 }}>Agent is working...</span>
                  </div>
                ) : (
                  <pre style={{
                    margin:0, fontSize:12, lineHeight:1.8, color:"#c0c0d4",
                    whiteSpace:"pre-wrap", wordBreak:"break-word",
                    fontFamily:"'Space Mono',monospace",
                  }}>{output}</pre>
                )}
              </div>
            </div>
          );
        })}

        {/* Complete Banner */}
        {finalResult && (
          <div style={{
            background:"linear-gradient(135deg,rgba(0,245,212,0.07),rgba(76,201,240,0.02))",
            border:"1px solid rgba(0,245,212,0.35)", borderRadius:14,
            padding:"28px 24px", marginTop:8, textAlign:"center",
            animation:"fadeIn .6s ease",
          }}>
            <div style={{
              fontFamily:"'Orbitron',monospace", fontSize:14, color:"#00f5d4",
              letterSpacing:4, marginBottom:10,
            }}>
              SWARM MISSION COMPLETE
            </div>
            <div style={{ fontSize:11, color:"#555", marginBottom:22, letterSpacing:2 }}>
              5 AGENTS · 5 TASKS · 100% AUTONOMOUS
            </div>
            <button
              onClick={reset}
              style={{
                background:"transparent",
                border:"1px solid rgba(0,245,212,0.4)", borderRadius:7,
                padding:"10px 28px", color:"#00f5d4",
                fontFamily:"'Space Mono',monospace", fontSize:11,
                cursor:"pointer", letterSpacing:2,
              }}
            >NEW MISSION</button>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>
    </div>
  );
}
