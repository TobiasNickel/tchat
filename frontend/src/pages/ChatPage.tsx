import { useState, useRef, useEffect } from 'react';
import { useAuthState, logout } from '../state/authState';
import './ChatPage.css';

interface Message {
  id: number;
  text: string;
  type: 'incoming' | 'outgoing';
  userName?: string;
}

export function ChatPage() {
  const authState = useAuthState();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Hi! How can I help you?',
      type: 'incoming',
      userName: 'Support'
    },
    {
      id: 2,
      text: 'I have a question about my order.',
      type: 'outgoing'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showChannelsDrawer, setShowChannelsDrawer] = useState(false);
  const [showUsersDrawer, setShowUsersDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = inputValue.trim();
    if (message) {
      setMessages([...messages, {
        id: messages.length + 1,
        text: message,
        type: 'outgoing'
      }]);
      setInputValue('');
      // Here you would typically send the message to the server
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      alert('Logout error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <>
      <div className="tchat-root">
        <header className="tchat-header">
          <span className="channel-name">Chat</span>
          <button 
            className="menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-haspopup="true"
            aria-expanded={showMenu}
          >
            &#x22EE;
          </button>
          {showMenu && (
            <div className="menu-dropdown" ref={menuRef}>
              <ul>
                <li onClick={() => { setShowProfileDrawer(true); setShowMenu(false); }}>
                  Profile
                </li>
                <li onClick={() => { setShowChannelsDrawer(true); setShowMenu(false); }}>
                  Channels
                </li>
                <li onClick={() => { setShowUsersDrawer(true); setShowMenu(false); }}>
                  Users
                </li>
                <li onClick={handleLogout}>
                  Logout
                </li>
              </ul>
            </div>
          )}
        </header>

        <div className="tchat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`tchat-message tchat-message-${message.type}`}
            >
              {message.type === 'incoming' && (
                <div className="message-header">
                  <img
                    src={`https://ui-avatars.com/api/?name=${message.userName || 'User'}&background=0078d7&color=fff&size=32`}
                    alt={`${message.userName} Avatar`}
                    className="user-avatar"
                  />
                  <strong>{message.userName}</strong>
                </div>
              )}
              <div className={message.type === 'incoming' ? 'message-content' : ''}>
                {message.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="tchat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="tchat-input"
            placeholder="Type a message..."
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" className="tchat-send-btn">
            Send
          </button>
        </form>
      </div>

      {/* Drawers */}
      {showProfileDrawer && (
        <div className="drawer-overlay" onClick={() => setShowProfileDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowProfileDrawer(false)}>
              &times;
            </button>
            <h2>Profile</h2>
            <div className="drawer-content">
              <p><strong>Name:</strong> {authState.user?.name}</p>
              <p><strong>Email:</strong> {authState.user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {showChannelsDrawer && (
        <div className="drawer-overlay" onClick={() => setShowChannelsDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowChannelsDrawer(false)}>
              &times;
            </button>
            <h2>Channels</h2>
            <div className="drawer-content">
              <p>Channels list coming soon...</p>
            </div>
          </div>
        </div>
      )}

      {showUsersDrawer && (
        <div className="drawer-overlay" onClick={() => setShowUsersDrawer(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowUsersDrawer(false)}>
              &times;
            </button>
            <h2>Users</h2>
            <div className="drawer-content">
              <p>Users management coming soon...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
