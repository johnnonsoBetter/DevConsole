import { Camera, Edit3, Image, MousePointer2, Plus, StickyNote, Wand2 } from 'lucide-react';
import React, { useState } from 'react';

export const StickyNotesSection: React.FC = () => {
  const [activeNote, setActiveNote] = useState<string>('yellow');
  const [notes, setNotes] = useState([
    { id: 'yellow', color: 'yellow', title: 'Bug Report', content: 'Login button doesn\'t work on mobile Safari. Need to check touch event handlers.', pinned: false, minimized: false, hasScreenshot: true },
    { id: 'pink', color: 'pink', title: 'Feature Idea', content: 'Add dark mode toggle in settings. Users have requested this multiple times.', pinned: true, minimized: false, hasScreenshot: false },
    { id: 'blue', color: 'blue', title: 'Quick TODO', content: '✓ Fix network panel filter\n○ Update GraphQL schema\n○ Test on Firefox', pinned: false, minimized: false, hasScreenshot: false },
    { id: 'purple', color: 'purple', title: 'API Documentation', content: 'Remember to update the API docs for v2.0 release', pinned: false, minimized: true, hasScreenshot: false },
  ]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  
  const colorStyles: Record<string, { bg: string; border: string; header: string; text: string; ring: string }> = {
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'from-yellow-100', text: 'text-yellow-900', ring: 'ring-yellow-400' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', header: 'from-pink-100', text: 'text-pink-900', ring: 'ring-pink-400' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', header: 'from-blue-100', text: 'text-blue-900', ring: 'ring-blue-400' },
    green: { bg: 'bg-green-50', border: 'border-green-200', header: 'from-green-100', text: 'text-green-900', ring: 'ring-green-400' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'from-purple-100', text: 'text-purple-900', ring: 'ring-purple-400' },
  };
  
  const toggleMinimize = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, minimized: !n.minimized } : n));
  };
  
  const togglePin = (id: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  };
  
  const changeColor = (id: string, newColor: string) => {
    setNotes(notes.map(n => n.id === id ? { ...n, color: newColor } : n));
  };
  
  const startEditing = (note: typeof notes[0]) => {
    setActiveNote(note.id);
    setEditContent(note.content);
    setIsEditing(true);
  };
  
  const saveEdit = () => {
    setNotes(notes.map(n => n.id === activeNote ? { ...n, content: editContent } : n));
    setIsEditing(false);
  };

  const activeNoteData = notes.find(n => n.id === activeNote);
  const style = activeNoteData ? colorStyles[activeNoteData.color] : colorStyles.yellow;

  return (
    <section className="py-32 px-6 lg:px-10 bg-white overflow-hidden border-t border-gray-100">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Interactive Sticky Notes Board */}
          <div className="relative order-2 lg:order-1">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/30 via-pink-200/20 to-purple-200/30 rounded-3xl blur-3xl" />
            
            {/* Cork Board Style Container */}
            <div className="relative bg-amber-50/50 rounded-2xl p-6 min-h-[520px] border border-amber-200/30 shadow-inner">
              {/* Board texture */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d97706\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
              
              {/* Notes Grid */}
              <div className="relative grid grid-cols-2 gap-4">
                {notes.filter(n => !n.minimized).map((note) => {
                  const noteStyle = colorStyles[note.color];
                  const isActive = activeNote === note.id;
                  
                  return (
                    <div
                      key={note.id}
                      onClick={() => setActiveNote(note.id)}
                      className={`${noteStyle.bg} rounded-xl shadow-lg border ${noteStyle.border} cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                        isActive ? `ring-2 ${noteStyle.ring} scale-[1.02] z-10` : 'z-0'
                      } ${note.id === 'blue' ? 'col-span-1' : ''}`}
                    >
                      {/* Note Header */}
                      <div className={`px-4 py-3 border-b ${noteStyle.border} bg-gradient-to-r ${noteStyle.header} to-transparent flex items-center justify-between rounded-t-xl`}>
                        <div className="flex items-center gap-2">
                          <StickyNote className={`w-4 h-4 ${noteStyle.text}`} />
                          <span className={`text-sm font-semibold ${noteStyle.text}`}>{note.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {note.pinned && <span className="text-xs opacity-70">📌</span>}
                          {isActive && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                                className={`p-1 hover:bg-black/5 rounded ${note.pinned ? 'text-amber-600' : noteStyle.text} opacity-70 transition-colors`}
                                title="Pin note"
                              >
                                📌
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleMinimize(note.id); }}
                                className={`p-1 hover:bg-black/5 rounded ${noteStyle.text} opacity-70 transition-colors`}
                                title="Minimize note"
                              >
                                —
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Note Content */}
                      <div className="p-4">
                        {isActive && isEditing ? (
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onBlur={saveEdit}
                            autoFocus
                            className={`w-full bg-transparent resize-none text-sm ${noteStyle.text} leading-relaxed focus:outline-none min-h-[80px]`}
                          />
                        ) : (
                          <p className={`text-sm ${noteStyle.text} leading-relaxed whitespace-pre-line`}>
                            {note.content}
                          </p>
                        )}
                        
                        {/* Screenshot Preview */}
                        {note.hasScreenshot && (
                          <div className="mt-3 bg-gray-900/5 rounded-lg p-2 h-20 flex items-center justify-center group/screenshot border border-black/5">
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <Image className="w-4 h-4" />
                              <span>Screenshot attached</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Note Footer - Color Picker (only for active) */}
                      {isActive && (
                        <div className={`px-4 py-2 border-t ${noteStyle.border} flex items-center justify-between bg-white/30 rounded-b-xl`}>
                          <div className="flex gap-1.5">
                            {['yellow', 'pink', 'blue', 'green', 'purple'].map((color) => (
                              <button
                                key={color}
                                onClick={(e) => { e.stopPropagation(); changeColor(note.id, color); }}
                                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                                  color === 'yellow' ? 'bg-yellow-400' :
                                  color === 'pink' ? 'bg-pink-400' :
                                  color === 'blue' ? 'bg-blue-400' :
                                  color === 'green' ? 'bg-green-400' :
                                  'bg-purple-400'
                                } ${note.color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                aria-label={`Change color to ${color}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(note); }}
                              className={`p-1.5 hover:bg-black/5 rounded ${noteStyle.text} transition-colors`}
                              title="Edit note"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className={`p-1.5 hover:bg-black/5 rounded ${noteStyle.text} transition-colors`}
                              title="Attach screenshot"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Minimized Notes Tray */}
              {notes.some(n => n.minimized) && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {notes.filter(n => n.minimized).map((note) => {
                    const noteStyle = colorStyles[note.color];
                    return (
                      <button
                        key={note.id}
                        onClick={() => toggleMinimize(note.id)}
                        className={`${noteStyle.bg} rounded-lg shadow-md border ${noteStyle.border} px-3 py-2 flex items-center gap-2 hover:shadow-lg transition-all whitespace-nowrap`}
                      >
                        <span className={`w-2 h-2 rounded-full bg-${note.color}-500`} />
                        <span className={`text-xs font-medium ${noteStyle.text} truncate max-w-[100px]`}>{note.title}</span>
                        <span className={`${noteStyle.text} opacity-50`}>▢</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Add Note Button */}
              <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all z-20">
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Text Content */}
          <div className="order-1 lg:order-2">
            <span className={`inline-block px-3 py-1 ${style.bg} ${style.text} text-xs font-semibold rounded-full mb-6 uppercase tracking-wider transition-colors`}>
              Sticky Notes
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-6">
              Capture thoughts<br />
              <span className="text-gray-400">without leaving flow</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Draggable, colorful sticky notes that live right in your DevTools. 
              Jot down bugs, ideas, or TODOs without breaking your debugging concentration.
            </p>
            
            {/* Interactive Feature Demo */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
              <p className="text-sm text-gray-500 mb-4 font-medium">Try it out — click on notes to:</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MousePointer2, label: 'Select & Focus', desc: 'Click any note' },
                  { icon: Edit3, label: 'Edit Content', desc: 'Click the pencil icon' },
                  { icon: Camera, label: 'Change Colors', desc: 'Pick from 5 colors' },
                  { icon: Wand2, label: 'Minimize', desc: 'Collapse to tray' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <item.icon className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{item.label}</p>
                      <p className="text-[10px] text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Feature List */}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: MousePointer2, title: 'Drag Anywhere', desc: 'Move notes to any position' },
                { icon: Camera, title: 'Screenshot Capture', desc: 'Attach visual context instantly' },
                { icon: Edit3, title: 'Rich Colors', desc: '5 colors to organize your thoughts' },
                { icon: Wand2, title: 'Auto-Save', desc: 'Never lose a note again' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
