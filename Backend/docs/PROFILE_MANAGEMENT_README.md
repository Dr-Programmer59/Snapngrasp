## Profile Management System Documentation

### Overview
Comprehensive profile management system allowing users to view and edit their profile information, change passwords, update email, and customize learning preferences.

---

## Database Setup

### 1. Run the Migration

Execute the SQL migration in your Supabase dashboard:

```bash
Backend/docs/profile_fields_migration.sql
```

This adds the following columns to the `profiles` table:
- `study_goals` - User's study goals and objectives
- `bio` - User biography or about section
- `phone_number` - Phone number for contact
- `date_of_birth` - Date of birth
- `education_level` - Current education level
- `institution` - School, college, or university name
- `preferred_language` - Preferred language code (default: 'en')

---

## Backend API

### Endpoints

#### 1. Get Profile
**GET** `/api/profile`

Get current authenticated user's profile.

**Response:**
```json
{
  "status": "success",
  "data": {
    "profile": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "John Doe",
      "avatar_url": "https://...",
      "role": "user",
      "learning_style": "visual",
      "study_goals": "Master biology and chemistry",
      "bio": "Passionate learner...",
      "phone_number": "+1234567890",
      "education_level": "Undergraduate",
      "institution": "University Name",
      "onboarding_completed": true,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-20T15:30:00Z"
    }
  }
}
```

#### 2. Update Profile
**PUT** `/api/profile`

Update profile fields (only sends fields that are provided).

**Request Body:**
```json
{
  "display_name": "John Doe",
  "bio": "Passionate student of science",
  "phone_number": "+1234567890",
  "learning_style": "visual",
  "study_goals": "Ace my finals",
  "education_level": "Undergraduate",
  "institution": "MIT",
  "preferred_language": "en"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "profile": { /* updated profile */ }
  },
  "message": "Profile updated successfully"
}
```

#### 3. Change Password
**PUT** `/api/profile/password`

Change user password (requires current password verification).

**Request Body:**
```json
{
  "current_password": "oldPassword123",
  "new_password": "newPassword456"
}
```

**Validation:**
- Current password must be correct
- New password must be at least 8 characters

**Response:**
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

#### 4. Change Email
**PUT** `/api/profile/email`

Request email change (sends confirmation email to new address).

**Request Body:**
```json
{
  "new_email": "newemail@example.com",
  "password": "currentPassword123"
}
```

**Validation:**
- Password must be correct
- Email must be valid format
- Email must not be already registered

**Response:**
```json
{
  "status": "success",
  "message": "Confirmation email sent to new address. Please verify to complete the change."
}
```

#### 5. Remove Avatar
**DELETE** `/api/profile/avatar`

Remove user's avatar (sets to null).

**Response:**
```json
{
  "status": "success",
  "data": {
    "profile": { /* updated profile */ }
  },
  "message": "Avatar removed successfully"
}
```

---

## Frontend Integration

### API Client Functions

All functions are in `src/api/profile.js`:

#### Get Profile
```javascript
import { getProfile } from '../api/profile';

const fetchProfile = async () => {
  try {
    const result = await getProfile();
    console.log('Profile:', result.data.profile);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

#### Update Profile
```javascript
import { updateProfile } from '../api/profile';

const saveProfile = async () => {
  try {
    const result = await updateProfile({
      display_name: 'John Doe',
      bio: 'Student and learner',
      learning_style: 'visual',
      study_goals: 'Master chemistry',
      education_level: 'Undergraduate',
      institution: 'MIT',
    });
    console.log('Updated:', result.data.profile);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

#### Change Password
```javascript
import { changePassword } from '../api/profile';

const updatePassword = async () => {
  try {
    await changePassword('currentPass123', 'newPass456');
    Alert.alert('Success', 'Password changed');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

#### Change Email
```javascript
import { changeEmail } from '../api/profile';

const updateEmail = async () => {
  try {
    await changeEmail('newemail@example.com', 'password123');
    Alert.alert('Success', 'Check your email to confirm');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

---

## Profile Edit Screen

### Usage

Navigate to the profile edit screen:

```javascript
navigation.navigate('ProfileEditScreen');
```

### Features

1. **Basic Information**
   - Full Name (editable)
   - Email (read-only, change via support)
   - Phone Number (editable)
   - Bio (multiline text)

2. **Education**
   - Education Level (e.g., "Undergraduate", "Graduate")
   - Institution (school/college/university name)

3. **Learning Preferences**
   - Learning Style selector (Visual, Auditory, Interactive)
   - Study Goals (multiline text)

4. **Password Management**
   - Collapsible section
   - Current password verification
   - New password (min 8 characters)
   - Confirmation field
   - Validation before submission

5. **Data Persistence**
   - Auto-loads current profile on mount
   - Saves only changed fields
   - Shows loading/saving states
   - Success/error alerts

---

## Integration Guide

### 1. Add to Navigation

Update your navigation stack to include ProfileEditScreen:

```javascript
// In your navigator file
import ProfileEditScreen from './src/screens/ProfileEditScreen';

<Stack.Screen 
  name="ProfileEditScreen" 
  component={ProfileEditScreen}
  options={{ headerShown: false }}
/>
```

### 2. Link from Settings/Profile

Add a button to navigate to profile edit:

```javascript
<TouchableOpacity onPress={() => navigation.navigate('ProfileEditScreen')}>
  <Text>Edit Profile</Text>
</TouchableOpacity>
```

### 3. Display Profile Data

Use the profile data from Dashboard or validate token:

```javascript
import { validateToken } from '../api/auth';

const [profile, setProfile] = useState(null);

useEffect(() => {
  const loadProfile = async () => {
    const result = await validateToken();
    setProfile(result?.profile);
  };
  loadProfile();
}, []);

// Display
<Text>{profile?.display_name}</Text>
<Text>{profile?.email}</Text>
<Text>Learning Style: {profile?.learning_style}</Text>
```

---

## Field Validation

### Display Name
- Optional
- Trimmed before saving

### Email
- Cannot be changed directly in profile (security)
- Use changeEmail API with password verification
- Requires email confirmation

### Password
- Current password must be correct
- New password minimum 8 characters
- Must match confirmation field

### Phone Number
- Optional
- No format validation (international support)

### Learning Style
- Required field
- Must be: 'visual', 'auditory', or 'interactive'

### Bio / Study Goals
- Optional
- Multiline text
- No length limit

---

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Password Verification**: Password/email changes require current password
3. **Email Confirmation**: Email changes send confirmation to new address
4. **Field Validation**: Server-side validation for all inputs
5. **RLS Policies**: Database Row Level Security ensures users only access their own data

---

## Error Handling

### Common Errors

**401 Unauthorized**
- Token expired or invalid
- Solution: Re-login

**400 Bad Request**
- Invalid learning_style value
- Password too short
- Missing required fields

**409 Conflict**
- Email already registered
- Solution: Use different email

**500 Server Error**
- Database connection issue
- Solution: Check backend logs

### Frontend Error Display

```javascript
try {
  await updateProfile(data);
  Alert.alert('Success', 'Profile updated');
} catch (error) {
  if (error.message.includes('already registered')) {
    Alert.alert('Error', 'Email already in use');
  } else {
    Alert.alert('Error', error.message || 'Something went wrong');
  }
}
```

---

## Testing

### Test Profile Update

1. Navigate to ProfileEditScreen
2. Change display name
3. Update learning style
4. Add bio and study goals
5. Click "Save Changes"
6. Verify success alert
7. Navigate back and reload - changes should persist

### Test Password Change

1. Open password section
2. Enter current password
3. Enter new password (min 8 chars)
4. Confirm new password
5. Click "Update Password"
6. Logout and login with new password

### Test Email Change

1. Enter new email address
2. Enter current password
3. Submit change
4. Check new email inbox for confirmation
5. Click confirmation link
6. Login with new email

---

## Database Schema

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  learning_style VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- New fields
  study_goals TEXT,
  bio TEXT,
  phone_number VARCHAR(20),
  date_of_birth DATE,
  education_level VARCHAR(50),
  institution VARCHAR(255),
  preferred_language VARCHAR(10) DEFAULT 'en',
  
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Future Enhancements

- [ ] Avatar upload functionality
- [ ] Email verification status display
- [ ] Two-factor authentication
- [ ] Account deletion option
- [ ] Export user data (GDPR compliance)
- [ ] Profile completeness indicator
- [ ] Social media links
- [ ] Timezone selection
- [ ] Notification preferences
