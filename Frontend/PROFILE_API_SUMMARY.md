# Profile Management API - Summary

## ✅ GOOD NEWS: Everything is Already Implemented!

Your backend and frontend already have **complete profile editing APIs** including profile image upload. Here's what exists:

---

## Backend APIs (Already Working)

### 1. **Get Profile**
- **Endpoint**: `GET /api/profile`
- **Authentication**: Required (Bearer token)
- **Returns**: Complete user profile data

### 2. **Update Profile** ⭐
- **Endpoint**: `PUT /api/profile`
- **Authentication**: Required (Bearer token)
- **Supported Fields**:
  - `display_name` - User's display name
  - `avatar_url` - Profile image URL
  - `learning_style` - visual, auditory, or interactive
  - `study_goals` - User's study objectives
  - `bio` - User bio/description
  - `phone_number` - Contact number
  - `date_of_birth` - Birthday
  - `education_level` - Educational level
  - `institution` - School/University name
  - `preferred_language` - Language preference

### 3. **Upload Avatar** 📸 ⭐
- **Endpoint**: `POST /api/profile/avatar`
- **Authentication**: Required (Bearer token)
- **Features**:
  - Accepts: JPEG, PNG, WebP
  - Max size: 5MB
  - Auto-resize to 400x400
  - Auto-compression (85% quality JPEG)
  - Stores in `/public/avatars/` directory
  - Updates `avatar_url` in database automatically

### 4. **Remove Avatar**
- **Endpoint**: `DELETE /api/profile/avatar`
- **Authentication**: Required
- **Action**: Removes avatar image and clears `avatar_url`

### 5. **Change Password**
- **Endpoint**: `PUT /api/profile/password`
- **Authentication**: Required
- **Fields**: `current_password`, `new_password`

### 6. **Change Email**
- **Endpoint**: `PUT /api/profile/email`
- **Authentication**: Required
- **Fields**: `new_email`, `password`
- **Note**: Sends confirmation email to new address

---

## Frontend API Functions (Already Available)

Located in: `src/api/profile.js`

```javascript
// Import these functions in your profile edit screen:
import {
  getProfile,        // Fetch current profile
  updateProfile,     // Update profile fields
  uploadAvatar,      // Upload profile image
  removeAvatar,      // Remove profile image
  changePassword,    // Change password
  changeEmail,       // Change email
} from '../api/profile';
```

### Usage Examples:

#### Update Profile
```javascript
await updateProfile({
  display_name: 'John Doe',
  bio: 'Student at XYZ University',
  learning_style: 'visual',
  institution: 'MIT',
});
```

#### Upload Profile Image
```javascript
// imageUri from image picker
await uploadAvatar(imageUri);
// Returns new avatar_url automatically
```

#### Change Password
```javascript
await changePassword('oldPassword123', 'newPassword456');
```

---

## Database Schema (Already Exists)

The `profiles` table already has all required columns:
- ✅ `avatar_url` - TEXT (URL to profile image)
- ✅ `display_name` - TEXT
- ✅ `learning_style` - TEXT
- ✅ `study_goals` - TEXT
- ✅ `bio` - TEXT
- ✅ `phone_number` - VARCHAR(20)
- ✅ `date_of_birth` - DATE
- ✅ `education_level` - VARCHAR(50)
- ✅ `institution` - VARCHAR(255)
- ✅ `preferred_language` - VARCHAR(10)
- ✅ `onboarding_completed` - BOOLEAN
- ✅ `created_at` - TIMESTAMP
- ✅ `updated_at` - TIMESTAMP

**Migration SQL**: Already in `Backend/docs/RUN_THIS_SQL_NOW.sql`

---

## Image Upload Flow

1. **User selects image** (using Expo ImagePicker)
2. **Frontend calls** `uploadAvatar(imageUri)`
3. **Backend receives** multipart/form-data
4. **Backend processes**:
   - Validates image type & size
   - Resizes to 400x400px
   - Compresses to 85% JPEG quality
   - Saves to `/public/avatars/`
   - Generates filename: `avatar_{userId}_{timestamp}.jpg`
5. **Backend updates** `profiles.avatar_url` automatically
6. **Backend returns** new avatar URL
7. **Frontend updates** UI with new image

---

## Avatar URL Access

Avatar images are served statically:
```
http://your-backend-url/avatars/avatar_123_1234567890.jpg
```

The backend already has static file serving configured:
```typescript
app.use('/avatars', express.static(path.join(__dirname, '../public/avatars')));
```

---

## What You Need to Do

### 1. Create Profile Edit Screen (Frontend Only)

You need to create a screen like:
- `src/screens/EditProfileScreen.js`

Example structure:
```javascript
import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, uploadAvatar } from '../api/profile';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const [profile, setProfile] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const result = await getProfile();
    setProfile(result.data.profile);
    setDisplayName(result.data.profile.display_name || '');
    setBio(result.data.profile.bio || '');
  };

  const handleSave = async () => {
    setLoading(true);
    await updateProfile({
      display_name: displayName,
      bio: bio,
    });
    setLoading(false);
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
      await loadProfile(); // Refresh to get new avatar
    }
  };

  // ... render UI
}
```

### 2. Add Image Picker Package (If Not Already Installed)

```bash
npx expo install expo-image-picker
```

### 3. Update Navigation

Add the EditProfileScreen to your navigator:
```javascript
<Stack.Screen name="EditProfile" component={EditProfileScreen} />
```

---

## Summary

🎉 **Everything is ready!** You have:
- ✅ Complete backend API with avatar upload
- ✅ Frontend API wrapper functions
- ✅ Database schema with all fields
- ✅ Image processing (resize, compress)
- ✅ Static file serving for avatars

**You only need to:**
1. Create the UI screen for profile editing
2. Use the existing API functions
3. Add image picker for avatar selection

No backend changes needed! No database migrations needed! Everything is already there! 🚀
