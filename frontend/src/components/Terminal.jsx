import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api.js';

const Terminal = () => {
  const [history, setHistory] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('michael:/$ ');
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    ApiService.getPrompt().then(data => {
      setCurrentPrompt(data.prompt);
    });
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // refocus input when execution finishes
  useEffect(() => {
    if (!isExecuting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExecuting]);

  // handle tab focus events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isExecuting && inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    };

    const handleWindowFocus = () => {
      if (!isExecuting && inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleDocumentClick = () => {
      if (!isExecuting && inputRef.current) {
        inputRef.current.focus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [isExecuting]);

  const executeCommand = async (command) => {
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    
    // add command to history
    setHistory(prev => [...prev, {
      type: 'command',
      prompt: currentPrompt,
      content: command
    }]);
    
          try {
        const result = await ApiService.executeCommand(command);
        
        // handle clear command
        if (command === 'clear') {
          setHistory([]);
          setCurrentInput('');
          setIsExecuting(false);
          return;
        }
        
        // add output to history
        setHistory(prev => [...prev, {
          type: 'output',
          content: result.output || '',
          error: result.error,
          success: result.success,
          redirect: result.redirect
        }]);
        
        setCurrentPrompt(result.prompt);
        setCurrentInput('');
        
      } catch (error) {
      setHistory(prev => [...prev, {
        type: 'output',
        content: '',
        error: `Error: ${error.message}`,
        success: false
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(currentInput);
    }
  };

  const renderEntry = (entry, index) => {
    if (entry.type === 'command') {
      return (
        <div key={index} className="terminal-line">
          <span className="prompt">{entry.prompt}</span>
          <span>{entry.content}</span>
        </div>
      );
    } else if (entry.type === 'output') {
      if (entry.redirect) {
        window.open(entry.redirect, '_blank');
        return (
          <div key={index} className="terminal-line">
            <span className="output link">redirecting to: {entry.redirect}</span>
          </div>
        );
      }
      
      if (entry.error) {
        return (
          <div key={index} className="terminal-line">
            <span className="output error">{entry.error}</span>
          </div>
        );
      }
      
      if (entry.content && entry.content.includes('<')) {
        return (
          <div key={index} className="terminal-line">
            <div 
              className="output markdown-content"
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />
          </div>
        );
      }
      
      return (
        <div key={index} className="terminal-line">
          <span className="output">{entry.content}</span>
        </div>
      );
    }
  };

  return (
    <div className="terminal" ref={terminalRef}>
      {history.map((entry, index) => renderEntry(entry, index))}
      
      {!isExecuting && (
        <div className="terminal-line">
          <span className="prompt">{currentPrompt}</span>
          <span className="command-text">{currentInput}</span>
          <span className="cursor">█</span>
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

export default Terminal; 