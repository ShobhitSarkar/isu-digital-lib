"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import styles from './Chat.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  type: 'search' | 'chat';
  createdAt: string;
}

type TabType = 'search' | 'chat';

export default function Chat() {
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChatId, chatHistories]);

  const createNewChat = () => {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: `New ${activeTab === 'search' ? 'Search' : 'Chat'} ${chatHistories.length + 1}`,
      messages: [],
      type: activeTab,
      createdAt: new Date().toISOString(),
    };
    setChatHistories(prev => [...prev, newChat]);
    setActiveChatId(newChat.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeChatId) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const newMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setChatHistories(prev => prev.map(chat => 
      chat.id === activeChatId 
        ? { ...chat, messages: [...chat.messages, newMessage] }
        : chat
    ));

    try {
      const response = await axios.post('/api/chat', {
        message: userMessage,
        mode: activeTab
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
      };

      setChatHistories(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [...chat.messages, assistantMessage] }
          : chat
      ));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setChatHistories(prev => prev.map(chat => 
        chat.id === activeChatId 
          ? { ...chat, messages: [...chat.messages, errorMessage] }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholder = () => {
    return activeTab === 'search' 
      ? "Search through Iowa State Digital Repository papers..."
      : "Ask questions about a specific paper...";
  };

  const activeChat = chatHistories.find(chat => chat.id === activeChatId);
  const filteredChats = chatHistories.filter(chat => chat.type === activeTab);

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Iowa State Digital Repository</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'search' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search Papers
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'chat' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat with Paper
          </button>
        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.sidebar}>
          <button 
            className={styles.newChatButton}
            onClick={createNewChat}
          >
            <PlusIcon className={styles.plusIcon} />
            New Chat
          </button>
          <div className={styles.chatList}>
            {filteredChats.map(chat => (
              <button
                key={chat.id}
                className={`${styles.chatItem} ${chat.id === activeChatId ? styles.activeChatItem : ''}`}
                onClick={() => setActiveChatId(chat.id)}
              >
                {chat.title}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chatArea}>
          {!activeChatId ? (
            <div className={styles.welcomeMessage}>
              <h2>Welcome to Iowa State Digital Repository</h2>
              <p>
                {activeTab === 'search' 
                  ? "Start a new chat to search through our extensive collection of papers and research documents."
                  : "Start a new chat to ask questions about specific papers."}
              </p>
              <button 
                className={styles.startChatButton}
                onClick={createNewChat}
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <div className={styles.messagesContainer}>
              {activeChat?.messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`${styles.message} ${
                    message.role === 'user' ? styles.userMessage : styles.assistantMessage
                  }`}
                >
                  <div className={styles.messageContent}>
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className={`${styles.message} ${styles.assistantMessage}`}>
                  <div className={styles.messageContent}>
                    <div className={styles.typingIndicator}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={getPlaceholder()}
              className={styles.input}
              disabled={isLoading || !activeChatId}
            />
            <button 
              type="submit" 
              className={styles.sendButton}
              disabled={isLoading || !input.trim() || !activeChatId}
            >
              <PaperAirplaneIcon className={styles.sendIcon} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 