function getTokenPayload(token) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

/**
 * Constants
 */

const url = 'http://localhost:3000';
const username = prompt('Enter username');
const password = prompt('Enter password');
const chatUuid = prompt('Enter chat uuid');

let token;
let socket;

axios
  .post(`${url}/auth/login`, {
    username: username,
    password: password,
  })
  .catch((err) => alert('Invalid credentials'))
  .then(async (userToken) => {
    token = userToken.data;
    socket = io('http://localhost:3000', {
      transportOptions: { polling: { extraHeaders: { Authorization: `Bearer ${token}` } } },
    });

    /**
     * Event handler
     */

    socket.on('error', (err) => {
      console.log(err);
      alert('Error');
    });

    socket.on('disconnect', () => {});

    socket.on('MESSAGE', async ({ text, sender, createdAt, uuid, ...rest }) => {
      if (!rest || !chat) return;
      createMessage(text, sender, createdAt, uuid);
    });

    socket.on('CHAT_EDIT', ({ chat, name, ...rest }) => {
      console.log('chat edit', chat, name, rest);
      document.getElementById('group-name').innerHTML = name;
    });

    socket.on('MESSAGE_EDIT', ({ message, text, pinned }) => {
      console.log('message edited');
      const children = document.getElementById('messages').children;
      for (let child of children) {
        if (child.dataset.uuid == message) child.childNodes[1].innerHTML = text;
      }
    });

    socket.on('MEMBER_EDIT', (member) => {
      console.log('Member Edited', member);
    });

    socket.on('CHAT_DELETE', ({ chat }) => {
      console.log('Chat Deleted', chat);
    });

    socket.on('MEMBER_JOIN', ({ chat, user }) => {
      console.log(`User Joined The Chat [${chat}]`, user);
    });

    socket.on('MEMBER_LEAVE', ({ chat, user }) => {
      console.log(`User Left The Chat [${chat}]`, user);
    });

    /**
     * User initialization
     */

    console.log(token);

    const user = await axios
      .get(`${url}/user/get`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch((err) => {
        console.log(err);
      });

    const chatData = await axios.get(`${url}/chats/get/${chatUuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const chat = chatData?.data;
    console.log(chat);

    chat.messages.forEach((message) => {
      createMessage(message.text, message.sender, message.createdAt, message.uuid);
    });

    document.getElementById('group-name').innerHTML = chat.name || 'Private Chat';
  });

function sendMessage() {
  const text = document.getElementById('inpt1').value;
  socket.emit('MESSAGE', {
    chat: chatUuid,
    uuid: chatUuid,
    data: text,
  });
  document.getElementById('inpt1').value = '';
}

function changeName() {
  const text = document.getElementById('inpt2').value;
  socket.emit('CHAT_EDIT', {
    chat: chatUuid,
    uuid: chatUuid,
    name: text,
  });
  document.getElementById('inpt2').value = '';
}

function changeMessage() {
  const message = 'c1f55f00-c10f-45d9-9ac0-a79e0bec1364';
  const text = document.getElementById('inpt3').value;
  socket.emit('MESSAGE_EDIT', {
    message: message,
    text: text,
  });
  document.getElementById('inpt3').value = '';
}

function editMember() {
  //const member = '0ceeb8d2-b286-4e6d-b449-67348a5c02f4';
  const member = 'f133d099-9750-416e-b38a-9b5b7b382896';
  const role = document.getElementById('inpt4').value;
  socket.emit('MEMBER_EDIT', {
    chat: chatUuid,
    uuid: chatUuid,
    user: member,
    role: role,
    permissions: ['KICK', 'EDIT'],
  });
  document.getElementById('inpt4').value = '';
}

async function createMessage(text, sender, createdAt, uuid) {
  const messages = document.getElementById('message-container');
  const data = await axios.get(`${url}/user/get/${sender}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = data.data;
  const container = document.createElement('div');
  container.classList.add('message-container');
  container.dataset.uuid = uuid;
  const title = document.createElement('div');
  title.classList.add('message-title');
  const senderContainer = document.createElement('div');
  senderContainer.classList.add('sender-container');
  const senderName = document.createElement('div');
  const name = document.createTextNode(`${user.name}`);
  senderName.appendChild(name);
  senderName.classList.add('sender-name');
  const senderTag = document.createElement('div');
  const tag = document.createTextNode(`@${user.tag}`);
  senderTag.appendChild(tag);
  senderTag.classList.add('sender-tag');
  const date = document.createTextNode(new Date(createdAt).toLocaleString());
  senderContainer.appendChild(senderName);
  senderContainer.appendChild(senderTag);
  title.appendChild(senderContainer);
  title.appendChild(date);
  container.appendChild(title);
  const message = document.createElement('div');
  const content = document.createTextNode(`${text}`);
  message.appendChild(content);
  container.appendChild(message);
  messages.prepend(container);
}
