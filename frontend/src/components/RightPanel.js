import React from 'react';
import ChatWidget from './ChatWidget';

const RightPanel = ({ subject, onSubjectChange }) => {
  return (
    <div className="right-panel">
      <h2>Ask NoteWise</h2>
      <ChatWidget subject={subject} onSubjectChange={onSubjectChange} />
    </div>
  );
};

export default RightPanel;