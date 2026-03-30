import { useState, useEffect, useRef } from "react";
import { auth, signInWithGoogle, logOut, onAuthChange, registerWithEmail, loginWithEmail } from "./firebase.js";

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const LEVELS = ["6ème","5ème","4ème","3ème","Seconde","Première","Terminale"];

const SUBJECTS = [
  { id:"maths",           label:"Mathématiques",       icon:"📐", color:"#60a5fa" },
  { id:"physique-chimie", label:"Physique-Chimie",     icon:"⚗️", color:"#4ade80" },
  { id:"svt",             label:"SVT",                 icon:"🌿", color:"#34d399" },
  { id:"histoire",        label:"Histoire-Géographie", icon:"🌍", color:"#f59e0b" },
  { id:"ses",             label:"SES",                 icon:"📊", color:"#f472b6" },
];

const SUBJECTS_BY_LEVEL = {
  "6ème":      ["maths","svt","histoire"],
  "5ème":      ["maths","physique-chimie","svt","histoire"],
  "4ème":      ["maths","physique-chimie","svt","histoire"],
  "3ème":      ["maths","physique-chimie","svt","histoire"],
  "Seconde":   ["maths","physique-chimie","svt","histoire","ses"],
  "Première":  ["maths","physique-chimie","svt","histoire","ses"],
  "Terminale": ["maths","physique-chimie","svt","histoire","ses"],
};

const CHAPTERS = {
  maths: {
    "6ème":      ["Nombres et calculs","Fractions et décimaux","Géométrie plane","Symétries","Statistiques"],
    "5ème":      ["Nombres relatifs","Proportionnalité","Triangles et angles","Calcul littéral","Aires et volumes"],
    "4ème":      ["Puissances et racines","Équations du 1er degré","Théorème de Pythagore","Fonctions linéaires","Statistiques"],
    "3ème":      ["Développements et factorisations","Équations et inéquations","Fonctions affines","Théorème de Thalès","Trigonométrie"],
    "Seconde":   ["Ensembles et raisonnement","Fonctions","Géométrie analytique","Statistiques et probabilités","Équations"],
    "Première":  ["Suites numériques","Dérivation","Fonctions exponentielles","Probabilités conditionnelles","Géométrie dans l'espace"],
    "Terminale": ["Limites et continuité","Intégration","Logarithme népérien","Loi normale","Arithmétique"],
  },
  "physique-chimie": {
    "6ème":      [],
    "5ème":      ["Atomes et molécules","Les métaux","Signaux lumineux","Courant électrique","L'air"],
    "4ème":      ["Réactions chimiques","Propriétés des matériaux","Optique géométrique","Électricité","Pression"],
    "3ème":      ["Chimie organique","Corps purs et mélanges","Électricité et magnétisme","Ondes","Réactions nucléaires"],
    "Seconde":   ["Chimie des solutions","Mouvements et interactions","Ondes et signaux","Énergie","Structure de la matière"],
    "Première":  ["Chimie organique","Cinétique chimique","Mécanique","Thermodynamique","Optique ondulatoire"],
    "Terminale": ["Chimie des équilibres","Électrochimie","Mécanique avancée","Physique quantique","Relativité"],
  },
  svt: {
    "6ème":      ["Peuplement des milieux","Nutrition des êtres vivants","Reproduction","Géologie externe","Diversité du vivant"],
    "5ème":      ["Respiration et milieux","Photosynthèse","Nutrition et digestion","Géologie interne","Évolution du vivant"],
    "4ème":      ["Reproduction sexuée","Système nerveux","Microorganismes et santé","Tectonique des plaques","Biodiversité"],
    "3ème":      ["Génétique et hérédité","Corps humain et santé","Évolution des êtres vivants","Géologie et temps","Immunologie"],
    "Seconde":   ["Cellule et origine du vivant","Alimentation et digestion","Génétique et ADN","Géosphère","Écosystèmes"],
    "Première":  ["Expression génétique","Physiologie végétale","Système nerveux","Évolution","Géologie approfondie"],
    "Terminale": ["Expression génétique avancée","Immunologie","Neurosciences","Écologie et évolution","Géologie et temps profond"],
  },
  histoire: {
    "6ème":      ["La Préhistoire","La Mésopotamie","La Grèce antique","Rome antique","Les débuts du christianisme"],
    "5ème":      ["Empire byzantin","Islam médiéval","Société féodale","Les Croisades","La Renaissance"],
    "4ème":      ["Les Lumières","La Révolution française","L'Empire napoléonien","Révolution industrielle","Le colonialisme"],
    "3ème":      ["La Première Guerre mondiale","Montée des totalitarismes","La Seconde Guerre mondiale","La Guerre froide","La décolonisation"],
    "Seconde":   ["Sociétés médiévales","Humanisme et Renaissance","Christianisme et modernité","L'État et les pouvoirs","Premières mondialisations"],
    "Première":  ["L'Europe face aux révolutions","La France 1848-1914","La Première Guerre mondiale","Les régimes totalitaires","La Seconde Guerre mondiale"],
    "Terminale": ["Fragilités des démocraties","La Guerre froide","La décolonisation","Le monde depuis 1991","La France depuis 1945"],
  },
  ses: {
    "6ème":      [], "5ème":      [], "4ème":      [], "3ème": [],
    "Seconde":   ["Marché et prix","Entreprises et production","Revenus et pouvoir d'achat","Institutions et pouvoirs","Socialisation et famille"],
    "Première":  ["Croissance économique","Stratification sociale","Mondialisation","Intégration et exclusion","Déviance et contrôle social"],
    "Terminale": ["Justice sociale","Chômage et emploi","Intégration européenne","Classes sociales","Ordre politique et démocratie"],
  },
};

const STEP_CONFIG = [
  { id:"rappel",   label:"Rappel de cours", icon:"📚", color:"#4ade80" },
  { id:"indice1",  label:"1er indice",       icon:"💡", color:"#facc15" },
  { id:"indice2",  label:"2ème indice",      icon:"🔍", color:"#fb923c" },
  { id:"solution", label:"Solution",         icon:"✅", color:"#60a5fa" },
];

const SUBJECT_NAMES = {
  "physique-chimie": "physique-chimie",
  "maths": "mathématiques",
  "svt": "SVT",
  "histoire": "histoire-géographie",
  "ses": "sciences économiques et sociales"
};

// ─── API (server-side proxy) ──────────────────────────────────────────────────

async function callAI(systemPrompt, userMessage) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 1024
    })
  });
  const data = await res.json();
  if (!res.ok) return "Erreur : " + (data.error || "Problème serveur");
  return data.content || "Réponse vide.";
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

const G = {
  bg:"#060a14", bg2:"#0d1526", bg3:"#111d33",
  border:"rgba(255,255,255,0.07)", border2:"rgba(255,255,255,0.13)",
  green:"#4ade80", yellow:"#facc15", orange:"#fb923c", blue:"#60a5fa", pink:"#f472b6",
  text:"#f1f5f9", muted:"#64748b", sub:"#94a3b8",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{background:#060a14;font-family:'Outfit',sans-serif;color:#f1f5f9;-webkit-font-smoothing:antialiased;}
  input,textarea,button{font-family:'Outfit',sans-serif;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  .fade{animation:fadeUp .4s ease forwards;}
  .spin{animation:spin .7s linear infinite;}
`;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function Spinner({ color=G.green, size=18 }) {
  return <div className="spin" style={{ width:size, height:size, borderRadius:"50%", border:`2px solid rgba(255,255,255,0.08)`, borderTopColor:color, flexShrink:0 }} />;
}

function Btn({ children, onClick, variant="primary", disabled, full, style={} }) {
  const variants = {
    primary: { background:`linear-gradient(135deg,${G.green},#22c55e)`, color:"#052e16", border:"none" },
    ghost:   { background:"rgba(255,255,255,0.04)", color:G.sub, border:`1px solid ${G.border2}` },
    yellow:  { background:`linear-gradient(135deg,${G.yellow},${G.orange})`, color:"#422006", border:"none" },
    google:  { background:"#fff", color:"#1f2937", border:"1px solid #e5e7eb" },
  };
  return (
    <button onClick={disabled?undefined:onClick} style={{
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
      padding:"13px 20px", borderRadius:13, fontWeight:700, fontSize:14,
      cursor:disabled?"not-allowed":"pointer", opacity:disabled?.45:1,
      width:full?"100%":undefined, transition:"opacity .2s",
      ...variants[variant], ...style
    }}>
      {children}
    </button>
  );
}

function Card({ children, style={}, color }) {
  return (
    <div style={{ background:G.bg2, borderRadius:16, padding:18,
      border:`1px solid ${color?color+"33":G.border}`, ...style }}>
      {children}
    </div>
  );
}

// ─── SCREEN: AUTH (Google + Email/Password) ───────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode]       = useState("login"); // login | signup
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      const result = await signInWithGoogle();
      onLogin(result.user);
    } catch(e) {
      if (e.code === "auth/popup-closed-by-user") {
        setError("Fenêtre fermée. Réessaie.");
      } else if (e.code === "auth/unauthorized-domain") {
        setError("Domaine non autorisé. Vérifie Firebase Console → Authentication → Domaines autorisés.");
      } else {
        setError("Connexion Google échouée : " + e.message);
      }
    }
    setLoading(false);
  };

  const handleEmail = async () => {
    if (!email || !password) { setError("Remplis tous les champs."); return; }
    if (mode === "signup" && !name) { setError("Entre ton prénom."); return; }
    if (password.length < 6) { setError("Mot de passe trop court (6 caractères minimum)."); return; }
    setLoading(true); setError("");
    try {
      if (mode === "signup") {
        const cred = await registerWithEmail(email, password, name);
        onLogin(cred.user);
      } else {
        const cred = await loginWithEmail(email, password);
        onLogin(cred.user);
      }
    } catch(e) {
      if (e.code === "auth/user-not-found" || e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        setError("Email ou mot de passe incorrect.");
      } else if (e.code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé. Connecte-toi.");
      } else if (e.code === "auth/invalid-email") {
        setError("Email invalide.");
      } else {
        setError(e.message);
      }
    }
    setLoading(false);
  };

  const inputStyle = {
    width:"100%", background:G.bg3, border:`1.5px solid ${G.border}`, borderRadius:11,
    color:G.text, fontSize:14, padding:"11px 13px", outline:"none",
    fontFamily:"'Outfit',sans-serif", marginBottom:10,
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20,
      background:`radial-gradient(ellipse at 30% 20%, rgba(74,222,128,0.06) 0%, transparent 55%), ${G.bg}` }}>
      <div className="fade" style={{ maxWidth:400, width:"100%" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:58, height:58, borderRadius:17, background:`linear-gradient(135deg,${G.green},#22c55e)`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 13px" }}>🧪</div>
          <h1 style={{ fontWeight:900, fontSize:26, letterSpacing:"-.5px", marginBottom:5 }}>RevizBot</h1>
          <p style={{ color:G.muted, fontSize:13 }}>Ton assistant révision intelligent</p>
        </div>

        <Card style={{ padding:26 }}>
          {/* Tabs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, background:G.bg3, borderRadius:11, padding:4, marginBottom:20 }}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError("");}}
                style={{ padding:"9px", borderRadius:9, border:"none",
                  background:mode===m?G.bg2:"transparent",
                  color:mode===m?G.text:G.muted, fontWeight:mode===m?700:500,
                  fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif",
                  boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.3)":undefined, transition:"all .2s" }}>
                {m==="login"?"Se connecter":"S'inscrire"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading}
            style={{ width:"100%", padding:"12px 16px", background:"#fff", border:"1px solid #e5e7eb",
              borderRadius:12, color:"#1f2937", fontFamily:"'Outfit',sans-serif", fontWeight:700,
              fontSize:14, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center",
              justifyContent:"center", gap:10, marginBottom:16, opacity:loading?0.6:1 }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.6 0-14.2 4.1-17.7 10.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.4l-6.6 5C9.9 39.9 16.5 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2-2 3.7-3.6 5l6.2 5.2C41.1 35 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:G.border }}/>
            <span style={{ color:G.muted, fontSize:12 }}>ou</span>
            <div style={{ flex:1, height:1, background:G.border }}/>
          </div>

          {/* Email form */}
          {mode==="signup" && (
            <input type="text" placeholder="Ton prénom" value={name}
              onChange={e=>setName(e.target.value)} style={inputStyle}
              onFocus={e=>e.target.style.borderColor=G.green}
              onBlur={e=>e.target.style.borderColor=G.border}/>
          )}
          <input type="email" placeholder="ton@email.com" value={email}
            onChange={e=>setEmail(e.target.value)} style={inputStyle}
            onFocus={e=>e.target.style.borderColor=G.green}
            onBlur={e=>e.target.style.borderColor=G.border}/>
          <input type="password" placeholder="Mot de passe (6 caractères min.)" value={password}
            onChange={e=>setPassword(e.target.value)} style={{...inputStyle, marginBottom:14}}
            onFocus={e=>e.target.style.borderColor=G.green}
            onBlur={e=>e.target.style.borderColor=G.border}
            onKeyDown={e=>e.key==="Enter"&&handleEmail()}/>

          {error && (
            <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)",
              borderRadius:10, padding:"9px 12px", marginBottom:12 }}>
              <p style={{ color:"#f87171", fontSize:12 }}>{error}</p>
            </div>
          )}

          <Btn onClick={handleEmail} disabled={loading} full>
            {loading
              ? <><Spinner color="#052e16" size={16}/> Chargement…</>
              : mode==="login" ? "🚀 Se connecter" : "✨ Créer mon compte"
            }
          </Btn>

          <p style={{ color:G.muted, fontSize:11, textAlign:"center", marginTop:14, lineHeight:1.5 }}>
            Tes données sont privées et sécurisées.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─── SCREEN: HOME ─────────────────────────────────────────────────────────────

function HomeScreen({ user, onStart, onQuiz, onLogout, sessions }) {
  const [level, setLevel]     = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [step, setStep]       = useState(1);

  const availableSubjects = SUBJECTS.filter(s => (SUBJECTS_BY_LEVEL[level]||[]).includes(s.id));
  const availableChapters = (CHAPTERS[subject]||{})[level] || [];
  const canProceed = step===1?!!level : step===2?!!subject : !!chapter;

  const handleLevelChange = (l) => { setLevel(l); setSubject(""); setChapter(""); };
  const handleSubjectChange = (s) => { setSubject(s); setChapter(""); };

  const totalExos = sessions.length;
  const quizSessions = sessions.filter(s=>s.quizScore!=null);
  const avgScore = quizSessions.length ? Math.round(quizSessions.reduce((a,s)=>a+s.quizScore,0)/quizSessions.length) : null;

  const avatar = user.photoURL
    ? <img src={user.photoURL} alt="" style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover" }}/>
    : <div style={{ width:32, height:32, borderRadius:"50%", background:`linear-gradient(135deg,${G.blue},${G.green})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>{(user.displayName||user.email||"U")[0].toUpperCase()}</div>;

  return (
    <div style={{ minHeight:"100vh", background:G.bg, paddingBottom:40 }}>
      {/* Header */}
      <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:`1px solid ${G.border}`, padding:"13px 20px",
        display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, backdropFilter:"blur(12px)", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${G.green},#22c55e)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🧪</div>
          <span style={{ fontWeight:800, fontSize:15 }}>RevizBot</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {avatar}
          <span style={{ color:G.sub, fontSize:13 }}>{user.displayName?.split(" ")[0] || "Élève"}</span>
          <button onClick={onLogout} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:12 }}>Déco</button>
        </div>
      </div>

      <div style={{ maxWidth:500, margin:"0 auto", padding:"22px 20px" }}>
        {/* Stats */}
        <div className="fade" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
          {[
            { label:"Exercices", value:totalExos, icon:"📝", color:G.green },
            { label:"Score moyen quiz", value:avgScore!=null?`${avgScore}/100`:"—", icon:"🎯", color:G.yellow },
          ].map(k=>(
            <Card key={k.label} color={k.color} style={{ padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontSize:19, marginBottom:4 }}>{k.icon}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:22, color:k.color }}>{k.value}</div>
              <div style={{ color:G.muted, fontSize:11, marginTop:2 }}>{k.label}</div>
            </Card>
          ))}
        </div>

        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", marginBottom:22 }}>
          {["Niveau","Matière","Chapitre"].map((s,i)=>{
            const done=step>i+1, active=step===i+1;
            return (
              <div key={s} style={{ display:"flex", alignItems:"center", flex:i<2?1:"auto" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <div style={{ width:27, height:27, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                    background:done?G.green:active?`${G.green}22`:"rgba(255,255,255,0.04)",
                    border:`2px solid ${done||active?G.green:G.border}`, fontSize:11, fontWeight:800,
                    color:done?"#052e16":active?G.green:G.muted, transition:"all .3s" }}>
                    {done?"✓":i+1}
                  </div>
                  <span style={{ fontSize:10, color:active?G.green:done?G.sub:G.muted, fontWeight:active?700:500 }}>{s}</span>
                </div>
                {i<2 && <div style={{ flex:1, height:2, background:done?G.green:G.border, margin:"0 4px 18px", transition:"background .3s" }}/>}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Niveau */}
        {step===1 && (
          <div className="fade">
            <p style={{ color:G.sub, fontSize:13, marginBottom:12 }}>Quel est ton niveau scolaire ?</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:22 }}>
              {LEVELS.map(l=>(
                <button key={l} onClick={()=>handleLevelChange(l)}
                  style={{ padding:"9px 15px", borderRadius:11, border:`1.5px solid ${level===l?G.green:G.border}`,
                    background:level===l?`${G.green}18`:"rgba(255,255,255,0.02)", color:level===l?G.green:G.sub,
                    fontFamily:"'Outfit',sans-serif", fontWeight:level===l?700:500, fontSize:13, cursor:"pointer", transition:"all .2s" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Matière */}
        {step===2 && (
          <div className="fade">
            <p style={{ color:G.sub, fontSize:13, marginBottom:12 }}>Quelle matière veux-tu réviser ?</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:22 }}>
              {availableSubjects.map(s=>(
                <button key={s.id} onClick={()=>handleSubjectChange(s.id)}
                  style={{ padding:"15px 13px", borderRadius:13,
                    border:`1.5px solid ${subject===s.id?s.color:G.border}`,
                    background:subject===s.id?`${s.color}16`:"rgba(255,255,255,0.02)",
                    cursor:"pointer", textAlign:"left", transition:"all .2s", position:"relative" }}>
                  <div style={{ fontSize:21, marginBottom:5 }}>{s.icon}</div>
                  <div style={{ color:G.text, fontWeight:700, fontSize:13, fontFamily:"'Outfit',sans-serif" }}>{s.label}</div>
                  {subject===s.id && <div style={{ position:"absolute", top:8, right:10, color:s.color }}>✓</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Chapitre */}
        {step===3 && (
          <div className="fade">
            <p style={{ color:G.sub, fontSize:13, marginBottom:12 }}>Quel chapitre veux-tu travailler ?</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
              {availableChapters.map(c=>(
                <button key={c} onClick={()=>setChapter(c)}
                  style={{ padding:"12px 15px", borderRadius:11,
                    border:`1.5px solid ${chapter===c?G.green:G.border}`,
                    background:chapter===c?`${G.green}12`:"rgba(255,255,255,0.02)",
                    color:chapter===c?G.green:G.sub, fontFamily:"'Outfit',sans-serif",
                    fontWeight:chapter===c?600:400, fontSize:13, cursor:"pointer",
                    textAlign:"left", display:"flex", justifyContent:"space-between", transition:"all .2s" }}>
                  {c}{chapter===c&&<span>✓</span>}
                </button>
              ))}
              {availableChapters.length===0 && (
                <p style={{ color:G.muted, fontSize:13 }}>Pas de chapitres disponibles pour cette combinaison.</p>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <div style={{ display:"flex", gap:10 }}>
          {step>1 && <Btn variant="ghost" onClick={()=>setStep(s=>s-1)} style={{ flexShrink:0 }}>← Retour</Btn>}
          <Btn onClick={()=>{ if(step<3) setStep(s=>s+1); else onStart({level,subject,chapter}); }} disabled={!canProceed} full>
            {step<3?"Continuer →":"🚀 Commencer l'exercice"}
          </Btn>
        </div>

        {/* Quiz CTA */}
        <div style={{ marginTop:14 }}>
          <button
            onClick={()=>{
              if(!level){ alert("Sélectionne d'abord ton niveau !"); return; }
              if(!chapter){ alert("Sélectionne d'abord un chapitre !"); return; }
              onQuiz({level, subject:subject||"maths", chapter});
            }}
            style={{ width:"100%", padding:"12px", background:"rgba(250,204,21,0.06)",
              border:`1.5px solid rgba(250,204,21,0.22)`, borderRadius:13,
              color:G.yellow, fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:13,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            ⚡ Quiz rapide — Évalue ton niveau
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN: QUIZ ─────────────────────────────────────────────────────────────

function QuizScreen({ config, onFinish, onBack }) {
  const [difficulty, setDifficulty] = useState(5);
  const [phase, setPhase]           = useState("intro");
  const [questions, setQuestions]   = useState([]);
  const [current, setCurrent]       = useState(0);
  const [answers, setAnswers]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [confirmed, setConfirmed]   = useState(false);
  const [score, setScore]           = useState(null);
  const [loadErr, setLoadErr]       = useState("");

  const subjectLabel = SUBJECT_NAMES[config.subject] || config.subject;

  const generate = async () => {
    setPhase("loading"); setLoadErr("");
    const subjectLabel = SUBJECT_NAMES[config.subject] || config.subject;

    const sys = `Tu es un professeur de ${subjectLabel}. Génère 10 QCM sur le chapitre "${config.chapter}" niveau ${config.level}, difficulté ${difficulty}/10.
RÈGLE: Réponds UNIQUEMENT avec du JSON brut, aucun texte avant ou après.
Format obligatoire:
{"questions":[{"q":"texte question","options":["choix1","choix2","choix3","choix4"],"answer":2,"explanation":"explication"}]}
- answer = index 0,1,2 ou 3 de la bonne réponse (varie-les aléatoirement)
- 4 options par question obligatoirement`;

    const tryParse = (raw) => {
      const attempts = [
        () => { const m = raw.match(/\{[\s\S]*"questions"[\s\S]*\}/); return m && JSON.parse(m[0]); },
        () => { const s=raw.indexOf("{"); const e=raw.lastIndexOf("}"); return s>-1&&e>s&&JSON.parse(raw.slice(s,e+1)); },
        () => JSON.parse(raw.replace(/\`\`\`json/gi,"").replace(/\`\`\`/g,"").trim()),
      ];
      for (const fn of attempts) { try { const r=fn(); if(r?.questions?.length>0) return r.questions; } catch {} }
      return null;
    };

    const fmt = (qs) => qs.slice(0,10).map((q,i) => ({
      q: q.q || q.question || "Question " + (i+1),
      options: Array.isArray(q.options)&&q.options.length===4 ? q.options : ["Option A","Option B","Option C","Option D"],
      answer: typeof q.answer==="number"&&q.answer>=0&&q.answer<=3 ? q.answer : i%4,
      explanation: q.explanation || q.explication || "Relis ton cours."
    }));

    let raw = await callAI(sys, "JSON:");
    if (raw.startsWith("Erreur")) { setLoadErr(raw); setPhase("intro"); return; }
    let qs = tryParse(raw);

    if (!qs) {
      raw = await callAI(
        `JSON uniquement. 10 QCM sur "${config.chapter}" pour ${config.level}. Format: {"questions":[{"q":"?","options":["A","B","C","D"],"answer":1,"explanation":"..."}]}`,
        "{"
      );
      qs = tryParse(raw);
    }

    if (!qs || qs.length === 0) {
      setLoadErr("Génération échouée sur ce chapitre. Réessaie ou change de chapitre.");
      setPhase("intro"); return;
    }

    setQuestions(fmt(qs));
    setCurrent(0); setAnswers([]); setSelected(null); setConfirmed(false);
    setPhase("question");
  };
  const nextQuestion = () => {
    const newAnswers = [...answers, { selected, correct: questions[current].answer }];
    setAnswers(newAnswers);
    if (current < questions.length-1) {
      setCurrent(c=>c+1); setSelected(null); setConfirmed(false);
    } else {
      const correct = newAnswers.filter(a=>a.selected===a.correct).length;
      const s = correct===0 ? 0 : Math.min(100, Math.round((correct/10)*difficulty*10));
      setScore(s); setPhase("result"); onFinish(s);
    }
  };

  const q = questions[current];
  const optColors = [G.blue, G.green, G.yellow, G.pink];

  if (phase==="intro") return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div className="fade" style={{ maxWidth:420, width:"100%" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontFamily:"'Outfit',sans-serif", marginBottom:18, fontSize:13 }}>← Retour</button>
        <Card style={{ padding:26 }}>
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <div style={{ fontSize:36, marginBottom:8 }}>⚡</div>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:4 }}>Quiz Rapide</h2>
            <p style={{ color:G.muted, fontSize:13 }}>{config.chapter} · {config.level} · {SUBJECT_NAMES[config.subject]}</p>
          </div>
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ color:G.sub, fontSize:13, fontWeight:600 }}>Niveau de difficulté</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:G.yellow, fontWeight:700, fontSize:17 }}>{difficulty}/10</span>
            </div>
            <input type="range" min={1} max={10} step={1} value={difficulty}
              onChange={e=>setDifficulty(+e.target.value)}
              style={{ width:"100%", cursor:"pointer", accentColor:G.yellow }} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
              <span style={{ color:G.muted, fontSize:11 }}>Facile</span>
              <span style={{ color:G.muted, fontSize:11 }}>Expert</span>
            </div>
          </div>
          <Card style={{ background:G.bg3, padding:12, marginBottom:18 }}>
            <p style={{ color:G.sub, fontSize:12, lineHeight:1.6, textAlign:"center" }}>
              10 questions · Score max : <strong style={{ color:G.text }}>{Math.min(100,difficulty*10)} pts</strong>
            </p>
          </Card>
          {loadErr && <p style={{ color:"#f87171", fontSize:12, marginBottom:12, textAlign:"center" }}>{loadErr}</p>}
          <Btn variant="yellow" onClick={generate} full>⚡ Lancer le quiz</Btn>
        </Card>
      </div>
    </div>
  );

  if (phase==="loading") return (
    <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
      <Spinner color={G.yellow} size={24}/>
      <p style={{ color:G.muted, fontSize:14 }}>Génération des questions…</p>
    </div>
  );

  if (phase==="question"&&q) {
    return (
      <div style={{ minHeight:"100vh", background:G.bg, paddingBottom:40 }}>
        <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:`1px solid ${G.border}`, padding:"13px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13 }}>✕ Quitter</button>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", color:G.yellow, fontWeight:700 }}>{current+1}/10</span>
          <span style={{ color:G.muted, fontSize:12 }}>Niv.{difficulty}</span>
        </div>
        <div style={{ height:3, background:G.border }}>
          <div style={{ height:"100%", width:`${(current/10)*100}%`, background:`linear-gradient(90deg,${G.yellow},${G.orange})`, transition:"width .4s" }}/>
        </div>
        <div style={{ maxWidth:500, margin:"0 auto", padding:"22px 20px" }}>
          <div className="fade" key={current}>
            <Card style={{ padding:20, marginBottom:14 }}>
              <p style={{ color:G.text, fontSize:15, lineHeight:1.65 }}>{q.q}</p>
            </Card>
            <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:18 }}>
              {q.options.map((opt,i)=>{
                let bg="rgba(255,255,255,0.02)", bdr=G.border, col=G.sub;
                if(confirmed){ if(i===q.answer){bg=`${G.green}18`;bdr=G.green;col=G.green;}
                  else if(i===selected&&i!==q.answer){bg="rgba(248,113,113,0.1)";bdr="#f87171";col="#f87171";}
                } else if(i===selected){bg=`${optColors[i]}18`;bdr=optColors[i];col=optColors[i];}
                return (
                  <button key={i} onClick={()=>!confirmed&&setSelected(i)}
                    style={{ padding:"13px 15px", borderRadius:11, border:`1.5px solid ${bdr}`, background:bg, color:col,
                      fontFamily:"'Outfit',sans-serif", fontWeight:500, fontSize:14, cursor:confirmed?"default":"pointer",
                      textAlign:"left", display:"flex", alignItems:"center", gap:11, transition:"all .2s" }}>
                    <span style={{ width:22, height:22, borderRadius:"50%", background:i===selected?bdr:"rgba(255,255,255,0.05)",
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800,
                      color:i===selected?G.bg:G.muted, flexShrink:0 }}>
                      {confirmed&&i===q.answer?"✓":confirmed&&i===selected&&i!==q.answer?"✗":"ABCD"[i]}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
            {confirmed && (
              <Card color={G.green} style={{ padding:12, marginBottom:14 }}>
                <p style={{ color:G.sub, fontSize:13, lineHeight:1.5 }}>💡 {q.explanation}</p>
              </Card>
            )}
            {!confirmed
              ? <Btn onClick={()=>setConfirmed(true)} disabled={selected===null} full>Valider ma réponse</Btn>
              : <Btn variant="yellow" onClick={nextQuestion} full>{current<9?"Question suivante →":"Voir mon score 🎯"}</Btn>
            }
          </div>
        </div>
      </div>
    );
  }

  if (phase==="result") {
    const correct = answers.filter(a=>a.selected===a.correct).length;
    const color = score>=80?G.green:score>=50?G.yellow:score>=25?G.orange:"#f87171";
    const label = score>=80?"Expert 🏆":score>=60?"Avancé ⭐":score>=40?"Intermédiaire 📈":score>=20?"Débutant 💪":"À travailler 🔥";
    return (
      <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div className="fade" style={{ maxWidth:420, width:"100%", textAlign:"center" }}>
          <h2 style={{ fontWeight:800, fontSize:22, marginBottom:4 }}>Résultat</h2>
          <p style={{ color:G.muted, fontSize:13, marginBottom:24 }}>{config.chapter} · Difficulté {difficulty}/10</p>
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:64, fontWeight:900, color, lineHeight:1, fontFamily:"'JetBrains Mono',monospace" }}>{score}</div>
            <div style={{ color:G.muted, fontSize:13 }}>/100</div>
            <div style={{ color, fontWeight:700, fontSize:15, marginTop:8 }}>{label}</div>
          </div>
          <Card style={{ padding:18, marginBottom:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
              {[{l:"Bonnes rép.",v:`${correct}/10`,c:G.green},{l:"Difficulté",v:`${difficulty}/10`,c:G.yellow},{l:"Max possible",v:`${Math.min(100,difficulty*10)}`,c:G.blue}].map(k=>(
                <div key={k.l}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:18, color:k.c }}>{k.v}</div>
                  <div style={{ color:G.muted, fontSize:10, marginTop:3 }}>{k.l}</div>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="ghost" onClick={()=>{setPhase("intro");setScore(null);}} style={{ flex:1 }}>🔄 Rejouer</Btn>
            <Btn onClick={onBack} style={{ flex:1 }}>🏠 Accueil</Btn>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// ─── SCREEN: EXERCISE ─────────────────────────────────────────────────────────

function ExerciseScreen({ config, onBack, onSave }) {
  const [exerciseText, setExerciseText] = useState("");
  const [imageBase64, setImageBase64]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [started, setStarted]           = useState(false);
  const [currentStep, setCurrentStep]   = useState("rappel");
  const [unlockedSteps, setUnlockedSteps] = useState(["rappel"]);
  const [stepContents, setStepContents] = useState({});
  const [loading, setLoading]           = useState(false);
  const [stepsUsed, setStepsUsed]       = useState(0);
  const fileRef = useRef();
  const bottomRef = useRef();

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[stepContents,loading]);

  const subjectName = SUBJECT_NAMES[config.subject] || config.subject;

  const prompts = {
    rappel:  `Tu es un professeur de ${subjectName} bienveillant et motivant pour un élève de ${config.level}, chapitre "${config.chapter}". Fournis UNIQUEMENT un rappel des notions du cours pertinentes. NE donne PAS la solution. Utilise des emojis, max 180 mots. Termine par "À toi de jouer ! 🗝️"`,
    indice1: `Tu es un professeur de ${subjectName} pour un élève de ${config.level}. Donne un PREMIER INDICE général sans résoudre. Max 100 mots, encourageant 💫`,
    indice2: `Tu es un professeur de ${subjectName} pour un élève de ${config.level}. Donne un DEUXIÈME INDICE précis. Ne donne pas le résultat final. Max 130 mots. Termine par "Tu y es presque ! 🔥"`,
    solution:`Tu es un professeur de ${subjectName} pour un élève de ${config.level}. Fournis la SOLUTION COMPLÈTE et détaillée. Félicite l'élève 🎉`,
  };

  const handleImg = e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => { setImagePreview(ev.target.result); setImageBase64(ev.target.result.split(",")[1]); };
    r.readAsDataURL(f);
  };

  const stepOrder = ["rappel","indice1","indice2","solution"];
  const currentIdx = stepOrder.indexOf(currentStep);
  const hasNext = currentIdx < stepOrder.length-1;
  const nextCfg = hasNext ? STEP_CONFIG[currentIdx+1] : null;

  const start = async () => {
    if(!exerciseText.trim()&&!imageBase64) return;
    setStarted(true); setCurrentStep("rappel"); setUnlockedSteps(["rappel"]); setStepContents({}); setStepsUsed(0);
    setLoading(true);
    const resp = await callAI(prompts.rappel, exerciseText||"Voici l'exercice en image.");
    setStepContents({rappel:resp});
    setLoading(false);
  };

  const unlockNext = async () => {
    const next = stepOrder[currentIdx+1]; if(!next) return;
    const used = stepsUsed+1; setStepsUsed(used);
    setCurrentStep(next); setUnlockedSteps(p=>[...p,next]);
    if(next==="solution") onSave({stepsUsed:used, subject:config.subject, level:config.level, chapter:config.chapter});
    setLoading(true);
    const resp = await callAI(prompts[next], exerciseText||"Voici l'exercice.");
    setStepContents(p=>({...p,[next]:resp}));
    setLoading(false);
  };

  const markDone = () => {
    if(currentStep!=="solution") onSave({stepsUsed, subject:config.subject, level:config.level, chapter:config.chapter});
    onBack();
  };

  if(!started) return (
    <div style={{ minHeight:"100vh", background:G.bg, paddingBottom:40 }}>
      <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:`1px solid ${G.border}`, padding:"13px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13 }}>← Retour</button>
        <span style={{ fontWeight:700, fontSize:14 }}>{SUBJECTS.find(s=>s.id===config.subject)?.icon} {config.chapter}</span>
        <span style={{ color:G.muted, fontSize:12 }}>{config.level}</span>
      </div>
      <div style={{ maxWidth:500, margin:"0 auto", padding:"22px 20px" }}>
        <Card color={G.green} style={{ padding:14, marginBottom:18 }}>
          <p style={{ color:G.sub, fontSize:13 }}>📖 {config.chapter} · 🎓 {config.level} · {subjectName}</p>
        </Card>
        <div style={{ marginBottom:14 }}>
          <div style={{ color:G.muted, fontSize:11, fontWeight:700, letterSpacing:".6px", textTransform:"uppercase", marginBottom:7 }}>Ton exercice</div>
          <textarea value={exerciseText} onChange={e=>setExerciseText(e.target.value)}
            placeholder="Colle l'énoncé ici… ou uploade une photo" rows={5}
            style={{ width:"100%", background:G.bg3, border:`1.5px solid ${G.border}`, borderRadius:13, color:G.text,
              fontFamily:"'Outfit',sans-serif", fontSize:14, padding:"12px 14px", resize:"vertical", lineHeight:1.6, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=G.green} onBlur={e=>e.target.style.borderColor=G.border}/>
        </div>
        <button onClick={()=>fileRef.current.click()}
          style={{ width:"100%", padding:"11px", background:"rgba(255,255,255,0.02)", border:`1.5px dashed ${G.border}`,
            borderRadius:12, color:G.muted, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13,
            fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:14 }}>
          📸 {imagePreview?"Changer la photo":"Photo de l'exercice"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display:"none" }}/>
        {imagePreview && (
          <div style={{ position:"relative", marginBottom:14 }}>
            <img src={imagePreview} alt="exo" style={{ width:"100%", borderRadius:12, maxHeight:180, objectFit:"cover" }}/>
            <button onClick={()=>{setImageBase64(null);setImagePreview(null);}}
              style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.7)", border:"none", color:"#fff", borderRadius:8, padding:"3px 8px", cursor:"pointer", fontSize:12 }}>✕</button>
          </div>
        )}
        <Btn onClick={start} disabled={!exerciseText.trim()&&!imageBase64} full>🚀 Commencer la révision</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:G.bg, paddingBottom:40 }}>
      <div style={{ background:"rgba(255,255,255,0.02)", borderBottom:`1px solid ${G.border}`, padding:"13px 20px",
        display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, backdropFilter:"blur(12px)", zIndex:10 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", color:G.muted, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:13 }}>← Retour</button>
        <span style={{ fontWeight:700, fontSize:14 }}>{config.chapter}</span>
        <span style={{ color:G.green, fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700 }}>{unlockedSteps.length}/4</span>
      </div>
      <div style={{ height:3, background:G.border }}>
        <div style={{ height:"100%", width:`${(unlockedSteps.length/4)*100}%`, background:`linear-gradient(90deg,${G.green},${G.blue})`, transition:"width .5s" }}/>
      </div>
      <div style={{ maxWidth:500, margin:"0 auto", padding:"16px 20px" }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16, justifyContent:"center" }}>
          {STEP_CONFIG.map(s=>{
            const unlocked=unlockedSteps.includes(s.id), active=currentStep===s.id;
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:999,
                border:`1.5px solid ${active?s.color:unlocked?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.04)"}`,
                background:active?`${s.color}16`:"transparent", opacity:unlocked?1:.3,
                color:active?s.color:unlocked?G.sub:G.muted, fontSize:12, fontWeight:active?700:500 }}>
                <span>{s.icon}</span><span>{s.label}</span>{!unlocked&&<span style={{fontSize:9}}>🔒</span>}
              </div>
            );
          })}
        </div>
        {(exerciseText||imagePreview) && (
          <Card style={{ padding:"11px 13px", marginBottom:12 }}>
            <div style={{ color:G.muted, fontSize:10, fontWeight:700, letterSpacing:".5px", marginBottom:5, textTransform:"uppercase" }}>Ton exercice</div>
            {imagePreview && <img src={imagePreview} alt="" style={{ width:"100%", borderRadius:8, maxHeight:100, objectFit:"cover", marginBottom:5 }}/>}
            {exerciseText && <p style={{ color:G.sub, fontSize:13, lineHeight:1.5 }}>{exerciseText}</p>}
          </Card>
        )}
        {stepOrder.map(sid=>{
          if(!unlockedSteps.includes(sid)) return null;
          const cfg=STEP_CONFIG.find(s=>s.id===sid);
          const content=stepContents[sid], isActive=currentStep===sid;
          return (
            <div key={sid} className="fade" style={{ background:G.bg2, border:`1.5px solid ${isActive?cfg.color+"44":G.border}`, borderRadius:15, padding:17, marginBottom:11 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:9 }}>
                <span style={{ fontSize:15 }}>{cfg.icon}</span>
                <span style={{ color:cfg.color, fontWeight:700, fontSize:13 }}>{cfg.label}</span>
              </div>
              {content
                ? <p style={{ color:"#cbd5e1", fontSize:14, lineHeight:1.72, whiteSpace:"pre-wrap" }}>{content}</p>
                : isActive&&loading&&<div style={{ display:"flex", alignItems:"center", gap:9, color:G.muted }}><Spinner color={cfg.color}/><span style={{fontSize:13}}>Réflexion en cours…</span></div>
              }
            </div>
          );
        })}
        <div ref={bottomRef}/>
        {!loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:9, marginTop:6 }}>
            {hasNext&&currentStep===stepOrder[currentIdx] && (
              <>
                <button onClick={unlockNext} style={{ width:"100%", padding:"13px", background:`${nextCfg.color}0e`,
                  border:`1.5px solid ${nextCfg.color}44`, borderRadius:12, color:nextCfg.color,
                  fontFamily:"'Outfit',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {nextCfg.icon} Je n'ai pas trouvé → {nextCfg.label}
                </button>
                <Btn onClick={markDone} full>✅ J'ai trouvé la solution !</Btn>
              </>
            )}
            {currentStep==="solution" && <Btn onClick={markDone} full>🎯 Exercice terminé</Btn>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen]   = useState("home");
  const [config, setConfig]   = useState(null);
  const [sessions, setSessions] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("rb_sessions")||"[]"); } catch { return []; }
  });

  useEffect(()=>{
    const unsub = onAuthChange(u=>{
      setUser(u); setAuthLoading(false);
    });
    return unsub;
  },[]);

  const saveSession = data => {
    const s = [...sessions, {...data, ts:Date.now()}];
    setSessions(s);
    try { localStorage.setItem("rb_sessions", JSON.stringify(s)); } catch {}
  };

  const handleLogout = async () => {
    await logOut();
    setUser(null); setScreen("home");
  };

  if (authLoading) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:"100vh", background:G.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
        <div className="spin" style={{ width:28, height:28, borderRadius:"50%", border:`3px solid rgba(255,255,255,0.08)`, borderTopColor:G.green }}/>
        <p style={{ color:G.muted, fontSize:14 }}>Chargement…</p>
      </div>
    </>
  );

  if (!user) return (
    <><style>{css}</style><AuthScreen onLogin={setUser}/></>
  );

  if (screen==="exercise"&&config) return (
    <><style>{css}</style><ExerciseScreen config={config} onBack={()=>setScreen("home")} onSave={saveSession}/></>
  );

  if (screen==="quiz"&&config) return (
    <><style>{css}</style><QuizScreen config={config} onBack={()=>setScreen("home")} onFinish={score=>saveSession({quizScore:score,subject:config.subject})}/></>
  );

  return (
    <><style>{css}</style>
      <HomeScreen user={user} sessions={sessions}
        onStart={cfg=>{setConfig(cfg);setScreen("exercise");}}
        onQuiz={cfg=>{setConfig(cfg);setScreen("quiz");}}
        onLogout={handleLogout}/>
    </>
  );
}
