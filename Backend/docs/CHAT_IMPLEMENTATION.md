# AI Chat Implementation - Context-Aware Tutor

## Overview
Implemented a complete AI chat system where Claude knows what the student has been studying based on their uploaded materials.

## Backend Implementation

### 1. Chat Controller (`chat.controller.ts`)

**Key Features:**
- ✅ Fetches user's study context (uploads, subjects, topics)
- ✅ Builds intelligent system prompt with student's learning materials
- ✅ Sends conversation with context to Claude
- ✅ Saves chat history to database
- ✅ Returns AI response with metadata

**getUserStudyContext() Function:**
- Fetches user's recent 10 uploads
- Extracts unique subjects
- Lists recent topics covered
- Includes preview of extracted text (first 500 chars from top 3 uploads)
- Returns formatted context string for Claude

**sendChatMessage() Function:**
- Requires authentication
- Accepts: `message` and `conversationHistory`
- Gets user's study context
- Builds system prompt with context
- Sends full conversation to Claude with context
- Saves to database
- Returns AI response

### 2. Chat Routes (`chat.routes.ts`)
```
POST /api/chat/message - Send message to AI tutor
GET /api/chat/history - Get chat history
```

### 3. Database Schema (`chat_messages_schema.sql`)
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_message TEXT,
  ai_response TEXT,
  model TEXT,
  usage_tokens INTEGER,
  created_at TIMESTAMP
)
```

**Run this in Supabase SQL Editor to create the table!**

### 4. System Prompt
Claude receives context like:
```
You are SnapTutor, an AI tutor helping a student learn.

STUDENT'S STUDY CONTEXT:
The student has been studying: Biology, Mathematics

Recent topics covered:
1. Biology - Cell Structure and Organelles
2. Biology - Photosynthesis Process
3. Mathematics - Quadratic Equations

Key content from recent uploads:
[Biology - Cell Structure]:
Cells are the basic unit of life. They contain various organelles including the nucleus, mitochondria, chloroplasts...

YOUR ROLE:
- Help understand concepts from their materials
- Answer questions clearly
- Break down complex topics
- Provide examples
- Reference their study materials when relevant
```

## Frontend Implementation

### 1. Chat API Client (`chat.js`)
```javascript
sendChatMessage(message, conversationHistory)
getChatHistory(limit)
```

### 2. ChatScreen Updates
**Changes:**
- ✅ Removed mock responses
- ✅ Added real API integration
- ✅ Sends conversation history for context
- ✅ Shows loading state ("thinking...")
- ✅ Error handling with alerts
- ✅ Prevents double-sending with isLoading

**Flow:**
1. User types message
2. Add user message + thinking indicator to UI
3. Build conversation history
4. Call `sendChatMessage()` API
5. Backend gets user's uploads and builds context
6. Claude generates response with student's study context
7. Replace thinking indicator with AI response
8. Save to chat history

## How It Works

### Example Conversation:

**User uploads:**
- "Biology - Cell Structure and Organelles"
- "Biology - Photosynthesis Process"

**User asks:** "What is mitochondria?"

**Claude knows:**
- Student is studying Biology
- Recently covered "Cell Structure and Organelles"
- Has content about cells and organelles

**Claude responds:**
"Great question! I see you've been studying cell structure. The mitochondria is often called the 'powerhouse of the cell' because it produces energy (ATP) through cellular respiration. Based on your notes on cell organelles, you learned that cells contain various structures with specific functions - the mitochondria is one of the most important ones for providing energy to the cell..."

## API Usage

### Send Chat Message
```javascript
POST /api/chat/message

Headers:
Authorization: Bearer <token>

Body:
{
  "message": "What is photosynthesis?",
  "conversationHistory": [
    { "sender": "user", "text": "Hi" },
    { "sender": "assistant", "text": "Hello! How can I help?" }
  ]
}

Response:
{
  "status": "success",
  "data": {
    "message": "Photosynthesis is...",
    "metadata": {
      "model": "claude-sonnet-4-5-20250929",
      "usage": { "input_tokens": 500, "output_tokens": 200 }
    }
  }
}
```

### Get Chat History
```javascript
GET /api/chat/history?limit=50

Headers:
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "messages": [...],
    "count": 10
  }
}
```

## Database Migration

Run in Supabase SQL Editor:
```sql
-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  model TEXT,
  usage_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
```

## Testing

1. **Create uploads table with title/subject** (if not done)
2. **Create chat_messages table** in Supabase
3. **Upload some study materials** with the app
4. **Open Chat screen**
5. **Ask questions** related to your uploaded topics
6. **Verify** Claude references your study materials

## Benefits

✅ **Context-Aware**: Claude knows what student is studying
✅ **Personalized**: Responses reference student's actual materials
✅ **Intelligent**: Understands subjects and topics student covered
✅ **Conversational**: Maintains conversation history
✅ **Persistent**: Saves chat history to database
✅ **Scalable**: Can handle multiple subjects and topics

## Next Steps (Optional Enhancements)

1. Load chat history on screen mount
2. Add "Clear Chat" button
3. Add subject filters (chat about specific subjects)
4. Add "Ask about this topic" button on study materials
5. Voice input/output integration
6. Suggested questions based on uploads
