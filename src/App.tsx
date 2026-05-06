import { useState } from 'react';
import { MindMapCanvas } from '@/components/MindMapCanvas';
import { Toolbar } from '@/components/Toolbar';
import { TabBar } from '@/components/TabBar';
import { NotePanel } from '@/components/NotePanel';
import { SharePanel } from '@/components/SharePanel';
import { FileManager } from '@/components/FileManager';
import { Login, isLoggedIn } from '@/components/Login';

function App() {
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const loggedIn = isLoggedIn();

  if (!loggedIn) {
    return <Login />;
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      <Toolbar
        onToggleShare={() => setShowSharePanel(!showSharePanel)}
        onToggleFileManager={() => setShowFileManager(!showFileManager)}
      />
      <TabBar />
      <div className="flex-1 relative">
        <MindMapCanvas />
        <NotePanel />
        {showSharePanel && <SharePanel />}
      </div>
      <FileManager isOpen={showFileManager} onClose={() => setShowFileManager(false)} />
    </div>
  );
}

export default App;
