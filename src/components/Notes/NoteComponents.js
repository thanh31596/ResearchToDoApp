// src/components/Notes/NoteComponents.js
import React, { useState, useEffect, useRef } from 'react';
import { 
    Edit3, 
    FileText,
    X, 
    Trash2, 
    Download, 
    Search,
    BookOpen,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Save,
} from 'lucide-react';
import apiService from '../../services/api';

const renderMarkdown = (text) => {
    if (!text) return '';

    return text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code blocks
        .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
        // LaTeX equations (simple $ ... $ support)
        .replace(/\$(.*?)\$/g, '<span class="bg-yellow-100 px-1 py-0.5 rounded text-sm font-mono">$1</span>')
        // Bullet points
        .replace(/^[\s]*[-*+][\s]+(.*$)/gm, '<li class="ml-4">$1</li>')
        // Line breaks
        .replace(/\n/g, '<br>');
};

// Note Icon Component
export const NoteIcon = ({ hasNote, onClick, className = "" }) => {
    return (
        <button
            onClick={onClick}
            className={`p-1 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                hasNote
                    ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
            } ${className}`}
            title={hasNote ? 'View/Edit Note' : 'Add Note'}
        >
            {hasNote ? (
                <FileText className="w-4 h-4" />
            ) : (
                <Edit3 className="w-4 h-4" />
            )}
        </button>
    );
};

// Note Editor Component with Manual Save
export const NoteEditor = ({
                        note,
                        onSave,
                        onClose,
                        onDelete,
                        type, // 'task' or 'phase'
                        itemId,
                        ticketId,
                        placeholder = "Add your research notes here...",
                        className = ""
                    }) => {
    const [content, setContent] = useState(note?.content || '');
    const [isPreview, setIsPreview] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    // Track if there are unsaved changes
    useEffect(() => {
        setHasChanges(content !== (note?.content || ''));
    }, [content, note?.content]);

    const handleSave = async () => {
        if (content.trim() === (note?.content || '')) {
            return; // No changes
        }

        setIsSaving(true);
        try {
            const noteData = {
                content: content.trim(),
                ticketId: ticketId,
                ...(type === 'task' ? { taskId: itemId } : { phaseId: itemId })
            };

            await apiService.createOrUpdateNote(noteData);
            onSave && onSave(content.trim());
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (note?.id && window.confirm('Are you sure you want to delete this note?')) {
            try {
                await apiService.deleteNote(note.id);
                onDelete && onDelete();
            } catch (error) {
                console.error('Error deleting note:', error);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            setIsPreview(!isPreview);
        }
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div className={`bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-lg ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-2 rounded-lg">
                        <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-medium text-gray-800">
                        {type === 'task' ? 'Task' : 'Phase'} Note
                    </h3>
                    {hasChanges && (
                        <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                            Unsaved changes
                        </div>
                    )}
                    {isSaving && (
                        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                            Saving...
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsPreview(!isPreview)}
                        className="text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors"
                    >
                        {isPreview ? 'Edit' : 'Preview'}
                    </button>
                    {note?.id && (
                        <button
                            onClick={handleDelete}
                            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete note"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {isPreview ? (
                    <div className="min-h-[100px] p-3 bg-gray-50 rounded-lg">
                        {content.trim() ? (
                            <div
                                className="prose prose-sm max-w-none text-gray-700"
                                dangerouslySetInnerHTML={{
                                    __html: renderMarkdown(content)
                                }}
                            />
                        ) : (
                            <div className="text-gray-500 italic">No content to preview</div>
                        )}
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-sm"
                        style={{ minHeight: '100px', maxHeight: '300px' }}
                    />
                )}

                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <span><strong>**bold**</strong></span>
                        <span><em>*italic*</em></span>
                        <span><code>`code`</code></span>
                        <span>$equation$</span>
                        <span>- bullet</span>
                    </div>
                    <div className="mt-1">
                        Press Ctrl+Enter to toggle preview • Ctrl+S to save • Esc to close
                    </div>
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                    >
                        {isSaving ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-3 h-3" />
                                <span>Save Note</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Notes Sidebar Component
export const NotesSidebar = ({ isOpen, onClose, notes, onNoteClick, onExport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredNotes, setFilteredNotes] = useState(notes || []);

    useEffect(() => {
        if (!notes) return;
        
        const filtered = notes.filter(note => 
            note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (note.task_title && note.task_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (note.phase_name && note.phase_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (note.ticket_title && note.ticket_title.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredNotes(filtered);
    }, [notes, searchTerm]);

    const handleExport = async () => {
        try {
            const blob = await apiService.exportNotes();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `research-notes-${new Date().toISOString().split('T')[0]}.md`;
            a.click();
            window.URL.revokeObjectURL(url);
            onExport && onExport();
        } catch (error) {
            console.error('Error exporting notes:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex">
            {/* Sidebar */}
            <div className="w-96 bg-white/90 backdrop-blur-lg shadow-2xl border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Research Notes
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        className="mt-3 w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Notes</span>
                    </button>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        {filteredNotes.length > 0 ? (
                            filteredNotes.map(note => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    onClick={() => onNoteClick(note)}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    {searchTerm ? 'No notes found' : 'No notes yet'}
                                </h3>
                                <p className="text-gray-500">
                                    {searchTerm 
                                        ? 'Try a different search term'
                                        : 'Start adding notes to your tasks and phases'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay */}
            <div className="flex-1" onClick={onClose} />
        </div>
    );
};

// Note Card Component for sidebar
const NoteCard = ({ note, onClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const previewText = note.content.length > 100 
        ? note.content.substring(0, 100) + '...' 
        : note.content;

    return (
        <div 
            className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-white/80"
            onClick={() => onClick(note)}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-1 rounded-lg">
                        <Lightbulb className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <h4 className="font-medium text-gray-800 text-sm">
                            {note.task_title || note.phase_name}
                        </h4>
                        <p className="text-xs text-gray-500">{note.ticket_title}</p>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                >
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            <div className="text-sm text-gray-600">
                {isExpanded ? (
                    <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: renderMarkdown(note.content)
                        }}
                    />
                ) : (
                    <p>{previewText}</p>
                )}
            </div>

            <div className="mt-3 text-xs text-gray-400">
                Last updated: {new Date(note.updated_at).toLocaleDateString()}
            </div>
        </div>
    );
};