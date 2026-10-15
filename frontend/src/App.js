import React from 'react';
import ChatWidget from './components/ChatWidget';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>NoteWise</h1>
        <p>Ask questions about your uploaded PDFs</p>
      </header>
      <main>
        <ChatWidget />
      </main>
    </div>
  );
}

export default App;
