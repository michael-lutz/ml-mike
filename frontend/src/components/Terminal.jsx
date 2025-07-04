import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../services/api.js';

const Terminal = () => {
  const [history, setHistory] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState('michael:/$ ');
  const [currentInput, setCurrentInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const processedRedirects = useRef(new Set());

  // check if user is at bottom of terminal
  const checkIfAtBottom = () => {
    if (!terminalRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    // Account for input prompt line height (~20px) plus some buffer
    const threshold = 50; // pixels from bottom to account for input prompt
    return scrollTop + clientHeight >= scrollHeight - threshold;
  };

  // scroll to bottom of terminal
  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  // handle scroll events
  const handleScroll = () => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    setShowScrollIndicator(!atBottom);
  };

  // handle touch events for mobile scrolling
  const handleTouchStart = (e) => {
    // Allow touch scrolling on mobile
    if (inputRef.current && !isExecuting) {
      // Don't prevent default - allow scrolling
    }
  };

  const handleTouchMove = (e) => {
    // Allow touch scrolling on mobile
    if (inputRef.current && !isExecuting) {
      // Don't prevent default - allow scrolling
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    ApiService.getPrompt().then(data => {
      setCurrentPrompt(data.prompt);
    });
  }, []);

  useEffect(() => {
    // Only auto-scroll when history changes during execution
    // This prevents scrolling when user is manually browsing history
    if (isExecuting) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        setIsAtBottom(true);
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [history, isExecuting]);

  // add scroll and touch event listeners
  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal) {
      terminal.addEventListener('scroll', handleScroll);
      terminal.addEventListener('touchstart', handleTouchStart, { passive: true });
      terminal.addEventListener('touchmove', handleTouchMove, { passive: true });
      
      return () => {
        terminal.removeEventListener('scroll', handleScroll);
        terminal.removeEventListener('touchstart', handleTouchStart);
        terminal.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, []);

  // refocus input and scroll when execution finishes
  useEffect(() => {
    if (!isExecuting && inputRef.current) {
      inputRef.current.focus();
      // Scroll to bottom after execution completes and input is rendered
      setTimeout(() => scrollToBottom(), 100);
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

    const handleDocumentClick = (e) => {
      // Don't focus on scroll indicator clicks or if user is selecting text
      if (!isExecuting && inputRef.current && 
          !e.target.closest('.scroll-indicator') && 
          !window.getSelection().toString()) {
        inputRef.current.focus();
      }
    };

    const handleDocumentKeyDown = (e) => {
      if (e.key === 'Tab' && !isExecuting) {
        e.preventDefault();
        console.log('Document Tab pressed, current input:', currentInput);
        
        // handle tab completion asynchronously
        getTabCompletions(currentInput).then(completions => {
          console.log('Document completions found:', completions);
          
          if (completions.length === 1) {
            const { command, args } = parseCommand(currentInput);
            const completion = completions[0];
            
            if (args.length === 0) {
              // completing command
              setCurrentInput(completion);
            } else {
              // completing argument - replace last word
              const newArgs = [...args.slice(0, -1), completion];
              setCurrentInput(`${command} ${newArgs.join(' ')}`);
            }
          } else if (completions.length > 1) {
            console.log('Document showing multiple completions:', completions);
            setHistory(prev => {
              const last = prev[prev.length - 1];
              const completionsStr = completions.join('  ');
              if (last && last.type === 'output' && last.content === completionsStr) {
                return prev; // Don't add duplicate
              }
              return [...prev, {
                type: 'output',
                content: completionsStr,
                success: true
              }];
            });
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isExecuting, currentInput]);

  const getAvailableCommands = () => {
    return ['ls', 'cd', 'cat', 'pwd', 'clear', 'open', 'help'];
  };

  const parseCommand = (input) => {
    const parts = input.trim().split(/\s+/);
    return {
      command: parts[0] || '',
      args: parts.slice(1),
      lastWord: parts[parts.length - 1] || ''
    };
  };

  const getCurrentPath = () => {
    // extract current path from prompt (e.g., "michael:/projects$ " -> "/projects")
    const match = currentPrompt.match(/michael:([^$]+)\$/);
    return match ? match[1] : '/';
  };

  const getTabCompletions = async (input) => {
    if (!input.trim()) return [];
    
    const { command, args, lastWord } = parseCommand(input);
    const commands = getAvailableCommands();
    
    // if we're completing the command itself
    if (args.length === 0) {
      return commands.filter(cmd => cmd.startsWith(lastWord));
    }
    
    // if we're completing arguments (files/directories)
    try {
      const currentPath = getCurrentPath();
      const result = await ApiService.getCompletions(currentPath, lastWord);
      return result.completions || [];
    } catch (error) {
      console.error('Error getting completions:', error);
      return [];
    }
  };

  const executeCommand = async (command) => {
    if (!command.trim() || isExecuting) return;

    // add to command history
    setCommandHistory(prev => {
      const newHistory = [...prev];
      if (command !== newHistory[newHistory.length - 1]) {
        newHistory.push(command);
      }
      return newHistory.slice(-50); // keep last 50 commands
    });
    setHistoryIndex(-1);

    setIsExecuting(true);
    
    // add command to history
    setHistory(prev => [...prev, {
      type: 'command',
      prompt: currentPrompt,
      content: command
    }]);

    // Don't scroll here - wait until execution is complete
    
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

        // Don't scroll here - wait until execution is complete and input is rendered
        
      } catch (error) {
      setHistory(prev => [...prev, {
        type: 'output',
        content: '',
        error: `Error: ${error.message}`,
        success: false
      }]);
      
      // Don't scroll here - wait until execution is complete and input is rendered
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(currentInput);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      console.log('Tab pressed, current input:', currentInput);
      
      // handle tab completion asynchronously
      getTabCompletions(currentInput).then(completions => {
        console.log('Completions found:', completions);
        
        if (completions.length === 1) {
          // single completion - complete it
          const { command, args } = parseCommand(currentInput);
          const completion = completions[0];
          
          if (args.length === 0) {
            // completing command
            setCurrentInput(completion);
          } else {
            // completing argument - replace last word
            const newArgs = [...args.slice(0, -1), completion];
            setCurrentInput(`${command} ${newArgs.join(' ')}`);
          }
        } else if (completions.length > 1) {
          // multiple completions - show them
          console.log('Showing multiple completions:', completions);
          setHistory(prev => {
            const last = prev[prev.length - 1];
            const completionsStr = completions.join('  ');
            if (last && last.type === 'output' && last.content === completionsStr) {
              return prev; // Don't add duplicate
            }
            return [...prev, {
              type: 'output',
              content: completionsStr,
              success: true
            }];
          });
        }
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          // reached the end of history, clear input
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      scrollToBottom();
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
        // only process redirect once per entry
        const redirectKey = `${index}-${entry.redirect}`;
        if (!processedRedirects.current.has(redirectKey)) {
          processedRedirects.current.add(redirectKey);
          window.open(entry.redirect, '_blank');
        }
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
      
      {showScrollIndicator && (
        <div className="scroll-indicator" onClick={scrollToBottom}>
          <span>↓</span>
        </div>
      )}
    </div>
  );
};

export default Terminal; 