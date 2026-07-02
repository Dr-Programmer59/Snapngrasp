import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "../contexts/ThemeContext";

// ---------------- AUTH SCREENS ---------------- //
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import VerifyModal from "../screens/VerifyModal";
import ResetPasswordScreen from "../screens/ResetPasswordScreen";

// ---------------- MAIN APP SCREENS ---------------- //
import Dashboard from "../screens/Dashboard";
import ContentInputSelection from "../screens/ContentInputSelection";
import CameraCaptureScreen from "../screens/CameraCaptureScreen";
import ChatScreen from "../screens/ChatScreen";
import FilePickerScreen from "../screens/FilePickerScreen";
import VisualUploadScreen from "../screens/VisualUploadScreen";
import FileUploadScreen from "../screens/FileUploadScreen";
import OCRResultScreen from "../screens/OCRResultScreen";
import AnalyzingScreen from "../screens/AnalyzingScreen";
import Play from "../screens/play";
import ProcessingScreen from "../screens/ProcessingScreen";
import TypePasteScreen from "../screens/TypePasteScreen";
import FeedbackScreen from "../screens/feedback_screen";
import FlashCardScreen from "../screens/FlashCardScreen";
import QuizScreen from "../screens/quiz";
import VisualScreen from "../screens/visual";
import StudyMaterialScreen from "../screens/StudyMaterialScreen";
import VoiceAgentScreen from "../screens/VoiceAgentScreen";
import MCQQuizScreen from "../screens/MCQQuizScreen";
import FlashcardPracticeScreen from "../screens/FlashcardPracticeScreen";
import LabeledVisualScreen from "../screens/LabeledVisualScreen";

// ---------------- SETTINGS & USER SCREENS ---------------- //
import SettingsScreen from "../screens/SettingsScreen";
import {
  ProfileScreen,
  SelectLeaderScreen,
  SelectStudentScreen,
} from "../screens/SettingsScreen";
import ProfileEditScreen from "../screens/ProfileEditScreen";

// ---------------- ONBOARDING & VOICE SCREENS ---------------- //
import SelectLearningStyleScreen from "../screens/SelectLearningStyleScreen";
import SelectStudyGoalScreen from "../screens/SelectStudyGoalScreen";
import VoiceStyleScreen from "../screens/VoiceStyleScreen";
import VoiceStylePreviewScreen from "../screens/VoiceStylePreviewScreen";

// ---------------- NOTES SCREENS ---------------- //
import NotesScreen from "../screens/NotesScreen";
import CreateNoteScreen from "../screens/CreateNoteScreen";
import NoteDetailScreen from "../screens/NoteDetailScreen";
import EditNotesScreen from "../screens/EditNotesScreen";
import NotesSelectionScreen from "../screens/NotesSelectionScreen";
import FoldersScreen from "../screens/FoldersScreen";

// ---------------- MILESTONE SCREENS ---------------- //
import MilestonesScreen from "../screens/MilestonesScreen";

// ---------------- SUBSCRIPTION SCREEN ---------------- //
import SubscriptionScreen from "../screens/SubscriptionScreen";
import SubscriptionReturnScreen from "../screens/SubscriptionReturnScreen";

const Stack = createNativeStackNavigator();

// ---------------- AUTH STACK ---------------- //
function AuthStack({ setIsLoggedIn }) {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.primaryBackground },
        animation: 'none',
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        initialParams={{ setIsLoggedIn }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        initialParams={{ setIsLoggedIn }}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="verify"
        component={VerifyModal}
        options={{
          presentation: "modal",
          animation: "slide",
          headerShown: false,
        }}
      />
      <Stack.Screen name="resetPassword" component={ResetPasswordScreen} />

      {/* Onboarding Flow */}
      <Stack.Screen
        name="SelectLearningStyleScreen"
        component={SelectLearningStyleScreen}
      />
      <Stack.Screen
        name="SelectStudyGoalScreen"
        component={SelectStudyGoalScreen}
      />
      <Stack.Screen name="VoiceStyleScreen" component={VoiceStyleScreen} />
      <Stack.Screen
        name="VoiceStylePreview"
        component={VoiceStylePreviewScreen}
        options={{
          presentation: "modal",
          animation: "fade",
          headerShown: false,
        }}
      />

      {/* Subscription Screen (shown after login) */}
      <Stack.Screen
        name="SubscriptionScreen"
        component={SubscriptionScreen}
        initialParams={{ setIsLoggedIn }}
      />
    </Stack.Navigator>
  );
}

// ---------------- MAIN APP STACK ---------------- //
function MainAppStack() {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.primaryBackground },
        animation: 'none',
      }}
      initialRouteName="Dashboard"
    >
      {/* Core App Screens */}
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen
        name="ContentInputSelection"
        component={ContentInputSelection}
      />
      <Stack.Screen name="Play" component={Play} />
      <Stack.Screen name="FileUpload" component={FileUploadScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="CameraCaptureScreen" component={CameraCaptureScreen} />
      <Stack.Screen name="FilePickerScreen" component={FilePickerScreen} />
      <Stack.Screen name="VisualUploadScreen" component={VisualUploadScreen} />
      <Stack.Screen name="ProcessingScreen" component={ProcessingScreen} />
      <Stack.Screen name="TypePasteScreen" component={TypePasteScreen} />
      <Stack.Screen name="OCRResultScreen" component={OCRResultScreen} />
      <Stack.Screen name="AnalyzingScreen" component={AnalyzingScreen} />
      <Stack.Screen name="NotesSelectionScreen" component={NotesSelectionScreen} />

      {/* Additional Learning & Study Screens */}
      <Stack.Screen name="VoiceAgentScreen" component={VoiceAgentScreen} />
      <Stack.Screen name="FlashCardScreen" component={FlashCardScreen} />
      <Stack.Screen name="QuizScreen" component={QuizScreen} />
      <Stack.Screen name="VisualScreen" component={VisualScreen} />
      <Stack.Screen name="feedback_screen" component={FeedbackScreen} />
      <Stack.Screen
        name="StudyMaterialScreen"
        component={StudyMaterialScreen}
      />
      
      {/* New Practice Screens with API Integration */}
      <Stack.Screen name="MCQQuizScreen" component={MCQQuizScreen} />
      <Stack.Screen name="FlashcardPracticeScreen" component={FlashcardPracticeScreen} />
      <Stack.Screen name="LabeledVisualScreen" component={LabeledVisualScreen} />

      {/* Settings & Profile */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ProfileEditScreen" component={ProfileEditScreen} />
      <Stack.Screen name="SelectLeader" component={SelectLeaderScreen} />
      <Stack.Screen name="SelectStudent" component={SelectStudentScreen} />

      {/* Notes Flow */}
      <Stack.Screen name="NotesScreen" component={NotesScreen} />
      <Stack.Screen name="CreateNoteScreen" component={CreateNoteScreen} />
      <Stack.Screen name="NoteDetailScreen" component={NoteDetailScreen} />
      <Stack.Screen name="EditNotesScreen" component={EditNotesScreen} />
      <Stack.Screen name="FoldersScreen" component={FoldersScreen} />

      {/* Milestones & Progress */}
      <Stack.Screen name="MilestonesScreen" component={MilestonesScreen} />

      {/* Subscription (from Settings upgrade) */}
      <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />

      {/* Onboarding & Voice */}
      <Stack.Screen
        name="SelectLearningStyleScreen"
        component={SelectLearningStyleScreen}
      />
      <Stack.Screen
        name="SelectStudyGoalScreen"
        component={SelectStudyGoalScreen}
      />
      <Stack.Screen name="VoiceStyleScreen" component={VoiceStyleScreen} />
      <Stack.Screen
        name="VoiceStylePreview"
        component={VoiceStylePreviewScreen}
        options={{
          presentation: "modal",
          animation: "fade",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// ---------------- ROOT NAVIGATOR ---------------- //
export default function AppNavigator({ isLoggedIn, setIsLoggedIn }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="AuthStack">
          {() => <AuthStack setIsLoggedIn={setIsLoggedIn} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="MainAppStack" component={MainAppStack} />
      )}
      <Stack.Screen name="SubscriptionSuccess" component={SubscriptionReturnScreen} />
      <Stack.Screen name="SubscriptionCancel" component={SubscriptionReturnScreen} />
    </Stack.Navigator>
  );
}
