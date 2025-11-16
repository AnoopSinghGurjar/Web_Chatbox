const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const send = document.getElementById('send');
const usernameInput = document.getElementById('username');
const searchInput = document.getElementById('search');
const clearBtn = document.getElementById('clear');
const typingEl = document.getElementById('typing');
const openLogin = document.getElementById('openLogin');
const openSignup = document.getElementById('openSignup');
const authModal = document.getElementById('authModal');
const closeAuth = document.getElementById('closeAuth');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const doLogin = document.getElementById('doLogin');
const doSignup = document.getElementById('doSignup');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logout');
const userStatus = document.getElementById('userStatus');

let socket = null;
let typingTimer = null;
let isTyping = false;

// Luxury color palette for avatars
const colors = [
  'hsl(265, 100%, 60%)',
  'hsl(45, 100%, 60%)',
  'hsl(0, 100%, 60%)',
  'hsl(120, 100%, 40%)',
  'hsl(200, 100%, 50%)',
  'hsl(285, 100%, 55%)',
  'hsl(30, 100%, 55%)',
];

function avatarColor(name){
  let h = 0;
  for(let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i);
  return colors[Math.abs(h) % colors.length];
}

function formatTime(ts){
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch(e){
    return '';
  }
}

function addMessage(msg, isOptimistic = false){
  const p = document.createElement('div');
  
  if(msg.system){
    p.className = 'msg system';
    p.innerText = msg.text;
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
    return;
  }
  
  p.className = 'msg ' + (msg.user === usernameInput.value ? 'self' : 'other');
  if(isOptimistic) p.style.opacity = '0.7';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.background = avatarColor(msg.user || 'A');
  avatar.innerText = (msg.user || 'User').split(' ').map(s => s[0] || '').slice(0, 2).join('').toUpperCase();
  
  const body = document.createElement('div');
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.width = '100%';
  
  const content = document.createElement('div');
  content.innerText = msg.text;
  content.style.lineHeight = '1.4';
  
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.innerText = `${msg.user}${msg.createdAt ? ' • ' + formatTime(msg.createdAt) : ''}`;
  
  body.appendChild(content);
  body.appendChild(meta);

  p.appendChild(avatar);
  p.appendChild(body);

  // actions
  const actions = document.createElement('div');
  actions.className = 'actions';
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.title = 'Copy message';
  copyBtn.innerText = '📋';
  copyBtn.onclick = (e) => {
    e.preventDefault();
    navigator.clipboard?.writeText(msg.text || '').then(() => {
      copyBtn.innerText = '✓';
      setTimeout(() => { copyBtn.innerText = '📋'; }, 2000);
    });
  };
  
  actions.appendChild(copyBtn);
  p.appendChild(actions);

  chat.appendChild(p);
  
  // smooth scroll
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 10);
}

async function loadHistory(){
  try{
    const res = await fetch('/api/messages?limit=200');
    if(!res.ok) return;
    const data = await res.json();
    data.forEach(msg => addMessage(msg));
  }catch(e){
    console.warn('History load failed', e);
  }
}

function connectSocket(){
  const token = localStorage.getItem('token');
  socket = io({ auth: { token } });

  socket.on('connect', () => {
    console.log('socket connected', socket.id);
  });
  
  socket.on('chatMessage', (msg) => {
    addMessage(msg);
  });
  
  socket.on('typing', ({user}) => {
    if(user !== usernameInput.value) {
      typingEl.innerText = `✨ ${user} is typing...`;
    }
  });
  
  socket.on('stopTyping', ({user}) => {
    typingEl.innerText = '';
  });
}

connectSocket();

send.onclick = () => sendMessage();

input.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  
  if(!isTyping){
    isTyping = true;
    socket.emit('typing', usernameInput.value || 'Anonymous');
  }
  
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    isTyping = false;
    socket.emit('stopTyping', usernameInput.value || 'Anonymous');
  }, 900);
});

function sendMessage(){
  const name = usernameInput.value || localStorage.getItem('username') || 'Anonymous';
  const text = input.value.trim();
  if(!text) return;
  
  const msg = { user: name, text };
  
  // optimistic add with pending effect
  addMessage({ user: name, text, createdAt: Date.now() }, true);
  
  socket.emit('chatMessage', msg);
  input.value = '';
  socket.emit('stopTyping', name);
  isTyping = false;
  
  input.focus();
}

clearBtn.onclick = () => {
  if(confirm('Clear all messages from view?')) {
    chat.innerHTML = '';
  }
};

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  Array.from(chat.children).forEach(node => {
    if(node.classList.contains('system')){
      node.style.display = q ? 'none' : '';
      return;
    }
    const txt = node.innerText.toLowerCase();
    node.style.display = txt.includes(q) ? '' : 'none';
  });
});

// Auth UI handlers
openLogin.onclick = () => {
  authModal.style.display = 'flex';
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  document.getElementById('loginUser').focus();
};

openSignup.onclick = () => {
  authModal.style.display = 'flex';
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
  document.getElementById('signupUser').focus();
};

closeAuth.onclick = () => {
  authModal.style.display = 'none';
};

showSignup.onclick = (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
  document.getElementById('signupUser').focus();
};

showLogin.onclick = (e) => {
  e.preventDefault();
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  document.getElementById('loginUser').focus();
};

async function doLoginHandler(e){
  e.preventDefault();
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  
  if(!u || !p) {
    alert('Enter username and password');
    return;
  }

  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    
    const data = await res.json();
    
    if(!res.ok) {
      alert(data.error || 'Login failed');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    usernameInput.value = data.username;
    usernameInput.readOnly = true;
    userStatus.innerText = '✓ ' + data.username;
    logoutBtn.style.display = 'inline-block';
    openLogin.style.display = 'none';
    openSignup.style.display = 'none';
    authModal.style.display = 'none';
    
    try{ socket.disconnect(); }catch(e){}
    connectSocket();
  }catch(e){
    console.warn('login err', e);
    alert('Login failed');
  }
}

async function doSignupHandler(e){
  e.preventDefault();
  const u = document.getElementById('signupUser').value.trim();
  const p = document.getElementById('signupPass').value;
  
  if(!u || !p){
    alert('Enter username and password');
    return;
  }

  try{
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    
    const data = await res.json();
    
    if(!res.ok){
      alert(data.error || 'Signup failed');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    usernameInput.value = data.username;
    usernameInput.readOnly = true;
    userStatus.innerText = '✓ ' + data.username;
    logoutBtn.style.display = 'inline-block';
    openLogin.style.display = 'none';
    openSignup.style.display = 'none';
    authModal.style.display = 'none';
    
    try{ socket.disconnect(); }catch(e){}
    connectSocket();
  }catch(e){
    console.warn('signup err', e);
    alert('Signup failed');
  }
}

loginForm.addEventListener('submit', doLoginHandler);
signupForm.addEventListener('submit', doSignupHandler);

authModal.addEventListener('click', (e) => {
  if(e.target === authModal) authModal.style.display = 'none';
});

logoutBtn.onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  usernameInput.readOnly = false;
  usernameInput.value = '';
  userStatus.innerText = 'Not signed in';
  logoutBtn.style.display = 'none';
  openLogin.style.display = 'inline-block';
  openSignup.style.display = 'inline-block';
  try{ socket.disconnect(); }catch(e){}
  connectSocket();
};

// initialize
if(localStorage.getItem('username')){
  usernameInput.value = localStorage.getItem('username');
  usernameInput.readOnly = true;
  userStatus.innerText = '✓ ' + localStorage.getItem('username');
  logoutBtn.style.display = 'inline-block';
  openLogin.style.display = 'none';
  openSignup.style.display = 'none';
}

window.addEventListener('load', loadHistory);
