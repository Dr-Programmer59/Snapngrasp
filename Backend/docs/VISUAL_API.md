# Visual Question Cards API Documentation

## Overview
The Visual Question Cards API generates interactive labeled diagrams from uploaded notes using Claude AI for content analysis and Google Imagen for image generation. Works for any subject: Biology, Physics, Chemistry, History, etc.

## Base URL
```
http://localhost:8080/api/visuals
```

## Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Generate Visual Question Cards

Generate visual learning cards from uploaded text. Claude analyzes the content and determines the best visual representation (labeled diagram, process flow, timeline, etc.).

**Endpoint:** `POST /api/visuals/generate/:uploadId`

**Parameters:**
- `uploadId` (path): UUID of the upload

**Request Body:**
```json
{
  "subject": "Biology",
  "count": 1
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| subject | string | No | "General" | Subject area (Biology, Physics, etc.) |
| count | number | No | 1 | Number of visual cards to generate |

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "visuals": [
      {
        "id": "visual-uuid",
        "user_id": "user-uuid",
        "upload_id": "upload-uuid",
        "title": "Human brain anatomy",
        "question_text": "Identify the labeled parts of the brain",
        "visual_type": "label_diagram",
        "subject": "Biology",
        "image_prompt": "Detailed anatomical diagram of human brain...",
        "image_url": "https://example.com/brain.png",
        "instruction_text": "Select the label you want to practice...",
        "difficulty": "medium",
        "total_steps": 5,
        "generation_status": "completed",
        "labels": [
          {
            "visual_id": "visual-uuid",
            "name": "Frontal Lobe",
            "description": "Controls reasoning and movement",
            "slot_index": 0,
            "is_correct_answer": true
          },
          {
            "visual_id": "visual-uuid",
            "name": "Cerebellum",
            "description": "Coordinates movement and balance",
            "slot_index": 1,
            "is_correct_answer": true
          }
        ],
        "options": [
          {
            "visual_id": "visual-uuid",
            "option_text": "Frontal Lobe",
            "is_correct": true,
            "option_index": 0
          },
          {
            "visual_id": "visual-uuid",
            "option_text": "Cerebellum",
            "is_correct": true,
            "option_index": 1
          },
          {
            "visual_id": "visual-uuid",
            "option_text": "Parietal Lobe",
            "is_correct": false,
            "option_index": 2
          }
        ],
        "created_at": "2024-01-15T10:00:00Z"
      }
    ],
    "count": 1,
    "upload_id": "upload-uuid"
  }
}
```

**Visual Types:**
- `label_diagram` - Anatomical diagrams, structure diagrams
- `process_flow` - Water cycle, photosynthesis, chemical reactions
- `chart_labels` - Graphs, charts with labeled parts
- `timeline` - Historical events, process stages
- `concept_map` - Relationships between concepts

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/visuals/generate/UPLOAD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Biology",
    "count": 2
  }'
```

---

### 2. Get Visuals by Upload

Retrieve all visual cards for a specific upload.

**Endpoint:** `GET /api/visuals/upload/:uploadId`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "visuals": [
      {
        "id": "visual-uuid",
        "title": "Cell structure",
        "question_text": "Label the cell organelles",
        "visual_type": "label_diagram",
        "image_url": "https://example.com/cell.png",
        "labels": [...],
        "options": [...],
        "total_steps": 8
      }
    ],
    "count": 1,
    "upload_id": "upload-uuid"
  }
}
```

**Example:**
```bash
curl http://localhost:8080/api/visuals/upload/UPLOAD_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Visual by ID

Get a specific visual with progress tracking.

**Endpoint:** `GET /api/visuals/:visualId`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "visual": {
      "id": "visual-uuid",
      "title": "Human brain anatomy",
      "question_text": "Identify the labeled parts",
      "visual_type": "label_diagram",
      "image_url": "https://example.com/brain.png",
      "instruction_text": "Select the label to practice...",
      "total_steps": 5,
      "labels": [
        {
          "id": "label-uuid-1",
          "name": "Frontal Lobe",
          "description": "Controls reasoning",
          "slot_index": 0
        }
      ],
      "options": [
        { "option_text": "Frontal Lobe", "is_correct": true },
        { "option_text": "Parietal Lobe", "is_correct": false }
      ],
      "progress": {
        "current_step": 2,
        "total_steps": 5,
        "completed": false
      }
    }
  }
}
```

---

### 4. Submit Answer

Submit user's answer for a specific label.

**Endpoint:** `POST /api/visuals/:visualId/answer`

**Request Body:**
```json
{
  "label_id": "label-uuid",
  "selected_option": "Frontal Lobe",
  "time_taken_seconds": 15
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label_id | string | Yes | UUID of the label being answered |
| selected_option | string | Yes | Text of the option user selected |
| time_taken_seconds | number | No | Time user took to answer |

**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "answer": {
      "id": "answer-uuid",
      "is_correct": true,
      "correct_answer": "Frontal Lobe",
      "selected_option": "Frontal Lobe"
    },
    "progress": {
      "current_step": 3,
      "total_steps": 5,
      "completed": false
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/visuals/VISUAL_UUID/answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label_id": "LABEL_UUID",
    "selected_option": "Frontal Lobe",
    "time_taken_seconds": 12
  }'
```

---

### 5. Delete Visual

Delete a visual card.

**Endpoint:** `DELETE /api/visuals/:visualId`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Visual deleted successfully"
}
```

---

## Database Schema

### Visuals Table
```sql
CREATE TABLE visuals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  upload_id UUID REFERENCES uploads(id),
  title TEXT,
  question_text TEXT,
  visual_type TEXT CHECK (visual_type IN ('label_diagram', 'process_flow', 'chart_labels', 'timeline', 'concept_map')),
  subject TEXT,
  image_prompt TEXT,
  image_url TEXT,
  instruction_text TEXT,
  difficulty TEXT,
  total_steps INTEGER,
  generation_status TEXT,
  created_at TIMESTAMP
);
```

### Visual Labels Table
```sql
CREATE TABLE visual_labels (
  id UUID PRIMARY KEY,
  visual_id UUID REFERENCES visuals(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  position_x DECIMAL,
  position_y DECIMAL,
  slot_index INTEGER,
  is_correct_answer BOOLEAN
);
```

### Visual Options Table
```sql
CREATE TABLE visual_options (
  id UUID PRIMARY KEY,
  visual_id UUID REFERENCES visuals(id) ON DELETE CASCADE,
  option_text TEXT,
  is_correct BOOLEAN,
  option_index INTEGER,
  UNIQUE(visual_id, option_index)
);
```

### Visual User Answers Table
```sql
CREATE TABLE visual_user_answers (
  id UUID PRIMARY KEY,
  visual_id UUID REFERENCES visuals(id),
  user_id UUID REFERENCES auth.users(id),
  label_id UUID REFERENCES visual_labels(id),
  selected_option TEXT,
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  answered_at TIMESTAMP
);
```

---

## Example Usage Flows

### Complete Learning Flow

```javascript
// 1. Upload and extract text (already done)
const uploadId = 'uuid-from-upload';

// 2. Generate visual cards
const generateResponse = await fetch(
  `${API_URL}/visuals/generate/${uploadId}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'Biology',
      count: 1
    })
  }
);

const { data } = await generateResponse.json();
const visual = data.visuals[0];
console.log(`Generated: ${visual.title}`);
console.log(`Type: ${visual.visual_type}`);
console.log(`Labels: ${visual.labels.length}`);

// 3. Display visual to user
// Show image_url, question_text, and options

// 4. User selects label to practice
const labelToPractice = visual.labels[0];

// 5. User selects their answer
const userSelection = 'Frontal Lobe'; // From options

// 6. Submit answer
const answerResponse = await fetch(
  `${API_URL}/visuals/${visual.id}/answer`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      label_id: labelToPractice.id,
      selected_option: userSelection,
      time_taken_seconds: 15
    })
  }
);

const { data: answerData } = await answerResponse.json();
console.log(`Correct: ${answerData.answer.is_correct}`);
console.log(`Progress: ${answerData.progress.current_step}/${answerData.progress.total_steps}`);

// 7. Repeat for remaining labels until completed
```

### Subject-Specific Examples

**Biology - Cell Structure:**
```json
{
  "title": "Plant cell structure",
  "visual_type": "label_diagram",
  "labels": ["Chloroplast", "Cell Wall", "Nucleus", "Vacuole"],
  "options": ["Chloroplast", "Cell Wall", "Nucleus", "Vacuole", "Centriole", "Flagellum"]
}
```

**Physics - Circuit Diagram:**
```json
{
  "title": "Series circuit components",
  "visual_type": "label_diagram",
  "labels": ["Battery", "Resistor", "Switch", "Ammeter"],
  "options": ["Battery", "Resistor", "Switch", "Ammeter", "Capacitor", "Diode"]
}
```

**Chemistry - Water Cycle:**
```json
{
  "title": "The water cycle",
  "visual_type": "process_flow",
  "labels": ["Evaporation", "Condensation", "Precipitation", "Collection"],
  "options": ["Evaporation", "Condensation", "Precipitation", "Collection", "Sublimation"]
}
```

**History - Timeline:**
```json
{
  "title": "American Revolution timeline",
  "visual_type": "timeline",
  "labels": ["Boston Tea Party", "Declaration of Independence", "Battle of Yorktown"],
  "options": ["Boston Tea Party", "Declaration of Independence", "Battle of Yorktown", "Civil War"]
}
```

---

## Google Imagen Integration

### Setup (Production)

1. **Install Google Cloud SDK:**
```bash
npm install @google-cloud/aiplatform
```

2. **Set Environment Variables:**
```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

3. **Enable APIs:**
- Enable Vertex AI API in Google Cloud Console
- Create service account with Vertex AI permissions
- Download credentials JSON

### Development Mode

Currently using mock image generation. To test:
```bash
# Generate visual with mock images
curl -X POST http://localhost:8080/api/visuals/generate/UPLOAD_UUID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Biology", "count": 1}'
```

Mock images are placeholder URLs. In production, replace with real Imagen API calls in `imagen.service.ts`.

---

## Frontend Integration

### React Native API Helper

```javascript
// SnapnGraspp/src/api/visual.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.100.7:8080/api/visuals';

export const generateVisuals = async (uploadId, subject = 'General', count = 1) => {
  const token = await AsyncStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/generate/${uploadId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ subject, count })
  });
  return response.json();
};

export const getVisualsByUpload = async (uploadId) => {
  const token = await AsyncStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/upload/${uploadId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

export const submitVisualAnswer = async (visualId, labelId, selectedOption, timeTaken) => {
  const token = await AsyncStorage.getItem('access_token');
  const response = await fetch(`${API_URL}/${visualId}/answer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      label_id: labelId,
      selected_option: selectedOption,
      time_taken_seconds: timeTaken
    })
  });
  return response.json();
};
```

---

## Testing

### 1. Setup Database
```bash
# Execute in Supabase SQL Editor
# Copy contents of Backend/docs/visuals_schema.sql
```

### 2. Generate Visual
```bash
UPLOAD_ID="your-upload-uuid"
TOKEN="your-jwt-token"

curl -X POST http://localhost:8080/api/visuals/generate/$UPLOAD_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Biology", "count": 1}'
```

### 3. Get Visual
```bash
VISUAL_ID="visual-uuid-from-above"

curl http://localhost:8080/api/visuals/$VISUAL_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Practice
```bash
LABEL_ID="label-uuid"

curl -X POST http://localhost:8080/api/visuals/$VISUAL_ID/answer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label_id": "'$LABEL_ID'",
    "selected_option": "Frontal Lobe",
    "time_taken_seconds": 12
  }'
```

---

## Notes

- **Claude AI** analyzes note content and chooses appropriate visual type
- **Google Imagen** generates educational diagrams (currently using mock)
- Works for **any subject** - not limited to biology
- Tracks **user progress** per visual card
- Includes **distractors** (wrong options) for better learning
- **CASCADE deletes** ensure cleanup when uploads are deleted
- **RLS policies** secure user data

---

## Next Steps

1. Execute `visuals_schema.sql` in Supabase
2. Configure Google Cloud credentials for Imagen
3. Test visual generation with sample uploads
4. Create React Native visual practice screen
5. Implement drag-and-drop label placement UI
