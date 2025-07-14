# Todo List & Journal Feature

## Overview
A comprehensive todo list and journal widget has been added to the Research Productivity App, featuring AI-powered optimization suggestions and time management tools.

## Features

### Todo List Management
- **Create Multiple Lists**: Organize tasks into different todo lists
- **Priority Levels**: Set High, Medium, or Low priority for each list
- **Time Estimates**: Add estimated completion time for each task
- **Item Types**: Choose between bullet points (•) or numbered lists (1. 2. 3.)
- **Task Completion**: Mark tasks as complete with visual feedback
- **Real-time Updates**: Changes sync immediately with the backend

### Journal Integration
- **Daily Entries**: Create journal entries with titles and content
- **Date Tracking**: Automatically timestamp entries
- **Reflection Tool**: Use for goal setting, progress tracking, and insights
- **Persistent Storage**: All entries are saved to the database

### AI-Powered Optimization
- **Goal Analysis**: AI summarizes the main objective of your todo list
- **Time Management**: Provides specific recommendations for time allocation
- **Priority Optimization**: Suggests reordering tasks based on importance
- **Efficiency Tips**: Offers ways to complete tasks more efficiently
- **Improvement Suggestions**: Recommends breaking down or combining tasks

### User Interface
- **Modern Design**: Clean, responsive interface with gradient backgrounds
- **Interactive Elements**: Hover effects, animations, and smooth transitions
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **Accessibility**: Clear visual hierarchy and intuitive navigation

## Technical Implementation

### Backend (Node.js/Express)
- **Database Tables**: 
  - `todo_lists`: Stores list metadata (title, description, priority)
  - `todo_items`: Stores individual tasks with type and time estimates
  - `journal_entries`: Stores journal entries with timestamps
- **API Endpoints**:
  - `GET /api/todo-lists`: Fetch all todo lists with items
  - `POST /api/todo-lists`: Create new todo list
  - `PUT /api/todo-lists/:id`: Update todo list
  - `DELETE /api/todo-lists/:id`: Delete todo list
  - `POST /api/todo-lists/:id/items`: Add items to list
  - `PUT /api/todo-items/:id`: Update todo item
  - `DELETE /api/todo-items/:id`: Delete todo item
  - `GET /api/journal`: Fetch journal entries
  - `POST /api/journal`: Create journal entry
  - `PUT /api/journal/:id`: Update journal entry
  - `DELETE /api/journal/:id`: Delete journal entry
  - `POST /api/ai/todo-optimization`: Get AI optimization suggestions

### Frontend (React)
- **TodoListWidget Component**: Main widget with full CRUD operations
- **State Management**: React hooks for local state management
- **API Integration**: Uses apiService for backend communication
- **Responsive Design**: Tailwind CSS for styling and responsiveness

### AI Integration
- **Gemini API**: Uses Google's Gemini 2.0 Flash model
- **Structured Analysis**: AI analyzes todo lists and provides structured feedback
- **Actionable Suggestions**: Focuses on practical, implementable advice
- **Context Awareness**: Considers user's existing todo lists and priorities

## Usage

### Creating a Todo List
1. Click "New List" button
2. Enter title, description, and priority
3. Click "Create List"

### Adding Tasks
1. Select a todo list
2. Enter task content in the input field
3. Choose item type (bullet or numbered)
4. Add time estimate (optional)
5. Click the plus button or press Enter

### Using AI Optimization
1. Select a todo list with tasks
2. Click "Optimize" button
3. Review AI suggestions in the modal
4. Click "Apply Changes" to implement recommendations

### Journal Entries
1. Click "Journal" button
2. Enter title and content
3. Click "Save Entry"

## Database Schema

```sql
-- Todo Lists
CREATE TABLE todo_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'Medium',
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Todo Items
CREATE TABLE todo_items (
    id SERIAL PRIMARY KEY,
    todo_list_id INTEGER REFERENCES todo_lists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    item_type VARCHAR(20) DEFAULT 'bullet',
    estimated_time INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries
CREATE TABLE journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Future Enhancements
- **Recurring Tasks**: Support for daily, weekly, or monthly recurring tasks
- **Task Dependencies**: Link tasks that depend on each other
- **Time Tracking**: Built-in timer for individual tasks
- **Progress Analytics**: Visual charts showing completion trends
- **Export/Import**: Backup and restore todo lists and journal entries
- **Collaboration**: Share todo lists with team members
- **Advanced AI**: More sophisticated optimization algorithms

## Installation
The feature is already integrated into the main application. No additional installation steps are required.

## Configuration
- Ensure the backend server is running
- Verify the Gemini API key is configured in environment variables
- Database tables will be created automatically on first run 