'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { updateUserName } from '@/lib/actions';
import {
  updateUserEmoji,
  createRoom,
  updateRoom,
  deleteRoom,
  reorderRooms,
  createChore,
  updateChore,
  deleteChore,
  importData,
} from '@/lib/settings-actions';

type User = { id: number; name: string; avatarEmoji: string };
type Room = { id: number; name: string; icon: string; sortOrder: number };
type Chore = { id: number; roomId: number; name: string; frequencyDays: number; effort: string; createdAt: string };

const EMOJI_OPTIONS = [
  '👤', '👩', '👨', '🧑', '👧', '👦', '🧒', '👶',
  '😀', '😎', '🤓', '🥳', '😺', '🐶', '🦊', '🐻',
  '🌟', '🌈', '🔥', '💎', '🎯', '🎨', '🎵', '🌸',
  '🍕', '🌮', '☕', '🧁', '🍣', '🥑', '🍩', '🧋',
];

const ROOM_ICONS = [
  '🍳', '🛁', '🛋️', '🛏️', '👕', '🏠', '🧹', '🪴',
  '🚗', '🏡', '📚', '🎮', '🧸', '🪑', '🍽️', '🏢',
];

export function SettingsClient({ currentUser, allUsers, rooms: initialRooms, chores: initialChores }: {
  currentUser: User | null;
  allUsers: User[];
  rooms: Room[];
  chores: Chore[];
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState<number | null>(null);

  // Room editing
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomIcon, setRoomIcon] = useState('🏠');
  const [showNewRoom, setShowNewRoom] = useState(false);

  // Chore editing
  const [editingChore, setEditingChore] = useState<number | null>(null);
  const [choreName, setChoreName] = useState('');
  const [choreFreq, setChoreFreq] = useState(7);
  const [choreEffort, setChoreEffort] = useState<'quick' | 'medium' | 'intensive'>('medium');
  const [addingChoreRoom, setAddingChoreRoom] = useState<number | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Expanded rooms
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());

  const handleEmojiSelect = async (userId: number, emoji: string) => {
    await updateUserEmoji(userId, emoji);
    setShowEmojiPicker(null);
    router.refresh();
  };

  const handleSaveRoom = async (roomId: number) => {
    if (!roomName.trim()) return;
    await updateRoom(roomId, roomName, roomIcon);
    setEditingRoom(null);
    router.refresh();
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    await createRoom(roomName, roomIcon);
    setShowNewRoom(false);
    setRoomName('');
    setRoomIcon('🏠');
    router.refresh();
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Delete this room and all its chores? This cannot be undone.')) return;
    await deleteRoom(roomId);
    router.refresh();
  };

  const handleMoveRoom = async (index: number, direction: 'up' | 'down') => {
    const ids = initialRooms.map(r => r.id);
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    [ids[index], ids[swapIdx]] = [ids[swapIdx], ids[index]];
    await reorderRooms(ids);
    router.refresh();
  };

  const handleSaveChore = async (choreId: number) => {
    if (!choreName.trim()) return;
    await updateChore(choreId, choreName, choreFreq, choreEffort);
    setEditingChore(null);
    router.refresh();
  };

  const handleCreateChore = async (roomId: number) => {
    if (!choreName.trim()) return;
    await createChore(roomId, choreName, choreFreq, choreEffort);
    setAddingChoreRoom(null);
    setChoreName('');
    setChoreFreq(7);
    setChoreEffort('medium');
    router.refresh();
  };

  const handleDeleteChore = async (choreId: number) => {
    if (!confirm('Delete this chore and all its history?')) return;
    await deleteChore(choreId);
    router.refresh();
  };

  const handleExport = () => {
    window.location.href = '/api/export';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setShowImportConfirm(true);
    }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      await importData(text);
      setShowImportConfirm(false);
      setImportFile(null);
      router.refresh();
      alert('Data imported successfully!');
    } catch (err: any) {
      alert('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const toggleRoom = (roomId: number) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const startEditChore = (c: Chore) => {
    setEditingChore(c.id);
    setChoreName(c.name);
    setChoreFreq(c.frequencyDays);
    setChoreEffort(c.effort as 'quick' | 'medium' | 'intensive');
  };

  const startAddChore = (roomId: number) => {
    setAddingChoreRoom(roomId);
    setChoreName('');
    setChoreFreq(7);
    setChoreEffort('medium');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-warm-900 dark:text-warm-100">⚙️ Settings</h1>

      {/* User Profiles */}
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">User Profiles</h2>
        <div className="space-y-4">
          {allUsers.map(user => (
            <div key={user.id} className="flex items-center gap-3">
              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === user.id ? null : user.id)}
                className="text-3xl hover:scale-110 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-warm-100 dark:hover:bg-warm-700"
                title="Change avatar"
              >
                {user.avatarEmoji}
              </button>
              <EditableName userId={user.id} name={user.name} onSave={async (name) => { await updateUserName(user.id, name); router.refresh(); }} />
              {currentUser?.id === user.id && (
                <span className="text-xs bg-sage-100 dark:bg-sage-900/40 text-sage-700 dark:text-sage-300 px-2 py-0.5 rounded-full">You</span>
              )}
            </div>
          ))}
          {showEmojiPicker !== null && (
            <div className="grid grid-cols-8 gap-1 p-3 bg-warm-50 dark:bg-warm-900 rounded-xl border border-warm-200 dark:border-warm-700">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(showEmojiPicker, emoji)}
                  className="text-2xl p-1.5 rounded-lg hover:bg-warm-200 dark:hover:bg-warm-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Theme */}
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                theme === t
                  ? 'bg-sage-100 dark:bg-sage-900/40 text-sage-800 dark:text-sage-200 ring-2 ring-sage-400'
                  : 'bg-warm-100 dark:bg-warm-700 text-warm-600 dark:text-warm-300 hover:bg-warm-200 dark:hover:bg-warm-600'
              }`}
            >
              {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🌓'} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Rooms & Chores */}
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rooms & Chores</h2>
          <button
            onClick={() => { setShowNewRoom(true); setRoomName(''); setRoomIcon('🏠'); }}
            className="text-sm font-medium text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-200 transition-colors"
          >
            + Add Room
          </button>
        </div>

        {showNewRoom && (
          <div className="mb-4 p-4 bg-warm-50 dark:bg-warm-900 rounded-xl border border-warm-200 dark:border-warm-700 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button className="text-2xl p-1" onClick={() => {/* cycle through icons inline */}}>
                  {roomIcon}
                </button>
                <div className="grid grid-cols-8 gap-1 mt-1">
                  {ROOM_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setRoomIcon(icon)}
                      className={`text-xl p-1 rounded-lg hover:bg-warm-200 dark:hover:bg-warm-700 ${roomIcon === icon ? 'bg-sage-100 dark:bg-sage-900/40 ring-1 ring-sage-400' : ''}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full px-3 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
              onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom(); }}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleCreateRoom} className="px-4 py-2 bg-sage-600 text-white rounded-lg text-sm font-medium hover:bg-sage-700 transition-colors">
                Add Room
              </button>
              <button onClick={() => setShowNewRoom(false)} className="px-4 py-2 text-warm-500 text-sm hover:text-warm-700 dark:hover:text-warm-300">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {initialRooms.map((room, idx) => (
            <div key={room.id} className="border border-warm-200 dark:border-warm-700 rounded-xl overflow-hidden">
              {editingRoom === room.id ? (
                <div className="p-4 space-y-3 bg-warm-50 dark:bg-warm-900">
                  <div className="grid grid-cols-8 gap-1">
                    {ROOM_ICONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setRoomIcon(icon)}
                        className={`text-xl p-1 rounded-lg hover:bg-warm-200 dark:hover:bg-warm-700 ${roomIcon === icon ? 'bg-sage-100 dark:bg-sage-900/40 ring-1 ring-sage-400' : ''}`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <input
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveRoom(room.id); }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveRoom(room.id)} className="px-3 py-1.5 bg-sage-600 text-white rounded-lg text-sm font-medium hover:bg-sage-700">Save</button>
                    <button onClick={() => setEditingRoom(null)} className="px-3 py-1.5 text-warm-500 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => toggleRoom(room.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <span className="text-xl">{room.icon}</span>
                    <span className="font-medium text-sm truncate">{room.name}</span>
                    <span className="text-xs text-warm-400 ml-1">
                      {initialChores.filter(c => c.roomId === room.id).length} chores
                    </span>
                    <span className={`ml-auto text-warm-400 transition-transform ${expandedRooms.has(room.id) ? 'rotate-90' : ''}`}>▶</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveRoom(idx, 'up')} disabled={idx === 0} className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 disabled:opacity-30 p-1 text-xs">▲</button>
                    <button onClick={() => handleMoveRoom(idx, 'down')} disabled={idx === initialRooms.length - 1} className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 disabled:opacity-30 p-1 text-xs">▼</button>
                    <button onClick={() => { setEditingRoom(room.id); setRoomName(room.name); setRoomIcon(room.icon); }} className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 p-1 text-xs">✏️</button>
                    <button onClick={() => handleDeleteRoom(room.id)} className="text-red-400 hover:text-red-600 p-1 text-xs">🗑️</button>
                  </div>
                </div>
              )}

              {/* Expanded chores list */}
              {expandedRooms.has(room.id) && (
                <div className="border-t border-warm-200 dark:border-warm-700 bg-warm-50/50 dark:bg-warm-900/50">
                  {initialChores.filter(c => c.roomId === room.id).map(chore => (
                    <div key={chore.id}>
                      {editingChore === chore.id ? (
                        <ChoreForm
                          name={choreName}
                          freq={choreFreq}
                          effort={choreEffort}
                          onNameChange={setChoreName}
                          onFreqChange={setChoreFreq}
                          onEffortChange={setChoreEffort}
                          onSave={() => handleSaveChore(chore.id)}
                          onCancel={() => setEditingChore(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-3 px-6 py-2.5 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors">
                          <span className="text-sm flex-1">{chore.name}</span>
                          <span className="text-xs text-warm-400">{chore.frequencyDays}d</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            chore.effort === 'quick' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            chore.effort === 'intensive' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}>{chore.effort}</span>
                          <button onClick={() => startEditChore(chore)} className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 p-1 text-xs">✏️</button>
                          <button onClick={() => handleDeleteChore(chore.id)} className="text-red-400 hover:text-red-600 p-1 text-xs">🗑️</button>
                        </div>
                      )}
                    </div>
                  ))}

                  {addingChoreRoom === room.id ? (
                    <ChoreForm
                      name={choreName}
                      freq={choreFreq}
                      effort={choreEffort}
                      onNameChange={setChoreName}
                      onFreqChange={setChoreFreq}
                      onEffortChange={setChoreEffort}
                      onSave={() => handleCreateChore(room.id)}
                      onCancel={() => setAddingChoreRoom(null)}
                    />
                  ) : (
                    <button
                      onClick={() => startAddChore(room.id)}
                      className="w-full text-left px-6 py-2.5 text-sm text-sage-600 dark:text-sage-400 hover:bg-warm-100 dark:hover:bg-warm-800 transition-colors"
                    >
                      + Add chore
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>
        <p className="text-sm text-warm-500 dark:text-warm-400 mb-4">
          Export all your data as a JSON backup, or import a previous backup to restore.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-3 px-4 bg-sage-600 text-white rounded-xl font-medium text-sm hover:bg-sage-700 transition-colors"
          >
            📥 Export Data
          </button>
          <button
            onClick={handleImportClick}
            className="flex-1 py-3 px-4 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-200 rounded-xl font-medium text-sm hover:bg-warm-300 dark:hover:bg-warm-600 transition-colors"
          >
            📤 Import Data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </section>

      {/* Import Confirmation Dialog */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-warm-800 rounded-2xl p-6 max-w-md w-full shadow-xl border border-warm-200 dark:border-warm-700">
            <h3 className="text-lg font-semibold mb-2">⚠️ Import Backup</h3>
            <p className="text-sm text-warm-600 dark:text-warm-400 mb-4">
              This will <strong>overwrite all existing data</strong> with the contents of the backup file. This action cannot be undone.
            </p>
            <p className="text-xs text-warm-400 mb-6">
              File: {importFile?.name}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportConfirm(false); setImportFile(null); }}
                className="flex-1 py-2.5 px-4 bg-warm-200 dark:bg-warm-700 text-warm-700 dark:text-warm-200 rounded-xl font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importing}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Overwrite & Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About */}
      <section className="bg-white dark:bg-warm-800 rounded-2xl p-5 shadow-sm border border-warm-200 dark:border-warm-700">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="space-y-2 text-sm text-warm-600 dark:text-warm-400">
          <p><span className="font-medium text-warm-700 dark:text-warm-300">TidyHouse</span> v1.0.0</p>
          <p>A self-hosted household management app.</p>
          <a
            href="https://github.com/damhof/tidyhouse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sage-600 dark:text-sage-400 hover:text-sage-800 dark:hover:text-sage-200 transition-colors mt-2"
          >
            🔗 GitHub Repository
          </a>
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}

function EditableName({ userId, name, onSave }: { userId: number; name: string; onSave: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const save = async () => {
    if (value.trim() && value.trim() !== name) {
      await onSave(value.trim());
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        className="text-sm font-medium bg-white dark:bg-warm-900 border border-warm-300 dark:border-warm-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sage-400"
        autoFocus
      />
    );
  }

  return (
    <button onClick={() => { setEditing(true); setValue(name); }} className="text-sm font-medium hover:text-sage-600 dark:hover:text-sage-400 transition-colors">
      {name}
    </button>
  );
}

function ChoreForm({ name, freq, effort, onNameChange, onFreqChange, onEffortChange, onSave, onCancel }: {
  name: string; freq: number; effort: 'quick' | 'medium' | 'intensive';
  onNameChange: (v: string) => void; onFreqChange: (v: number) => void; onEffortChange: (v: 'quick' | 'medium' | 'intensive') => void;
  onSave: () => void; onCancel: () => void;
}) {
  return (
    <div className="px-6 py-3 space-y-2 bg-warm-50 dark:bg-warm-900">
      <input
        value={name}
        onChange={e => onNameChange(e.target.value)}
        placeholder="Chore name"
        className="w-full px-3 py-1.5 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
        onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
        autoFocus
      />
      <div className="flex gap-3 items-center">
        <label className="text-xs text-warm-500">Every</label>
        <input
          type="number"
          min={1}
          max={365}
          value={freq}
          onChange={e => onFreqChange(parseInt(e.target.value) || 1)}
          className="w-16 px-2 py-1 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sage-400"
        />
        <label className="text-xs text-warm-500">days</label>
        <select
          value={effort}
          onChange={e => onEffortChange(e.target.value as any)}
          className="px-2 py-1 rounded-lg border border-warm-300 dark:border-warm-600 bg-white dark:bg-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
        >
          <option value="quick">Quick</option>
          <option value="medium">Medium</option>
          <option value="intensive">Intensive</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1.5 bg-sage-600 text-white rounded-lg text-xs font-medium hover:bg-sage-700">Save</button>
        <button onClick={onCancel} className="px-3 py-1.5 text-warm-500 text-xs">Cancel</button>
      </div>
    </div>
  );
}
