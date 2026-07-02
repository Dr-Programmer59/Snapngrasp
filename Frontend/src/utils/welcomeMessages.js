// src/utils/welcomeMessages.js
// Dynamic welcome messages for dashboard based on user context

/**
 * Get time-based greeting
 */
export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

/**
 * Get motivational message based on performance
 */
export const getPerformanceMessage = (stats) => {
  const { accuracy, streak, quizzes, flashcards } = stats;
  
  const performanceMessages = [
    {
      condition: streak >= 7,
      messages: [
        `🔥 ${streak} day streak! You're on fire! Keep the momentum going!`,
        `Amazing! ${streak} days straight. You're a learning champion! 💪`,
        `Incredible streak of ${streak} days! Your consistency is inspiring! ⭐`,
      ]
    },
    {
      condition: streak >= 3 && streak < 7,
      messages: [
        `Great job! ${streak} days in a row. Can you make it a week? 🎯`,
        `${streak} day streak! You're building an amazing habit! 🚀`,
        `Keep it up! ${streak} days and counting. You're doing awesome! ✨`,
      ]
    },
    {
      condition: accuracy >= 90,
      messages: [
        `${accuracy}% accuracy! You're absolutely crushing it! 🎯`,
        `Wow! ${accuracy}% correct. You're a quiz master! 🏆`,
        `Outstanding ${accuracy}% accuracy. Your hard work is paying off! ⭐`,
      ]
    },
    {
      condition: accuracy >= 75 && accuracy < 90,
      messages: [
        `Solid ${accuracy}% accuracy! You're making great progress! 💪`,
        `${accuracy}% correct! Keep practicing and you'll ace everything! 📚`,
        `Nice work! ${accuracy}% accuracy shows you're learning well! 🌟`,
      ]
    },
    {
      condition: quizzes >= 20,
      messages: [
        `${quizzes} quizzes completed! You're dedicated to success! 📊`,
        `Impressive! ${quizzes} quizzes done. That's commitment! 💯`,
        `${quizzes} quizzes under your belt. You're unstoppable! 🚀`,
      ]
    },
    {
      condition: flashcards >= 50,
      messages: [
        `${flashcards} flashcards created! You're building a great study library! 📚`,
        `Wow! ${flashcards} flashcards. You're really invested in learning! 🎓`,
        `${flashcards} flashcards! Your future self will thank you! ✨`,
      ]
    },
  ];
  
  // Find matching conditions and pick random message
  const matching = performanceMessages.filter(pm => pm.condition);
  if (matching.length > 0) {
    const selected = matching[Math.floor(Math.random() * matching.length)];
    return selected.messages[Math.floor(Math.random() * selected.messages.length)];
  }
  
  // Default encouraging messages
  const defaultMessages = [
    "Every expert was once a beginner. You're on the right path! 🌱",
    "Small steps every day lead to big results! Keep going! 💪",
    "Your dedication today builds your success tomorrow! 🚀",
    "Ready to turn your notes into knowledge? Let's do this! 📚",
    "Learning is a journey, and you're making great progress! ✨",
  ];
  
  return defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
};

/**
 * Get message about incomplete MCQs
 */
export const getIncompleteMCQMessage = (recentActivity) => {
  // Find MCQs that were started but not completed
  const incompleteMCQs = recentActivity.filter(activity => {
    if (activity.type !== 'mcq') return false;
    
    // Check if it's incomplete (progress < 100%)
    const progress = activity.progress_percentage || 0;
    return progress > 0 && progress < 100;
  });
  
  if (incompleteMCQs.length === 0) return null;
  
  // Get the most recent incomplete MCQ
  const latestIncomplete = incompleteMCQs[0];
  const title = latestIncomplete.title || 'Quiz';
  const progress = Math.round(latestIncomplete.progress_percentage || 0);
  
  const messages = [
    `📝 Hey! You left "${title}" at ${progress}%. Ready to finish it?`,
    `🎯 "${title}" is waiting for you at ${progress}%. Let's complete it!`,
    `💪 You were ${progress}% through "${title}". Finish strong today!`,
    `⏰ "${title}" is ${progress}% done. Pick up where you left off!`,
    `🚀 Almost there! "${title}" is ${progress}% complete. Let's finish this!`,
  ];
  
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    activity: latestIncomplete
  };
};

/**
 * Get message about incomplete flashcards
 */
export const getIncompleteFlashcardsMessage = (recentActivity) => {
  const incompleteFlashcards = recentActivity.filter(activity => {
    if (activity.type !== 'flashcard') return false;
    const progress = activity.progress_percentage || 0;
    return progress > 0 && progress < 100;
  });
  
  if (incompleteFlashcards.length === 0) return null;
  
  const latest = incompleteFlashcards[0];
  const title = latest.title || 'Flashcard Set';
  const progress = Math.round(latest.progress_percentage || 0);
  
  const messages = [
    `🎴 "${title}" flashcards are ${progress}% reviewed. Continue your practice!`,
    `📚 You're ${progress}% through "${title}". Keep building that memory!`,
    `✨ "${title}" awaits! You're ${progress}% done. Let's master them!`,
  ];
  
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    activity: latest
  };
};

/**
 * Get streak reminder message
 */
export const getStreakReminder = (streak, lastCheckIn) => {
  if (!lastCheckIn) return null;
  
  const now = new Date();
  const lastCheckInDate = new Date(lastCheckIn);
  const hoursSinceCheckIn = (now - lastCheckInDate) / (1000 * 60 * 60);
  
  // If checked in within last 12 hours, show streak celebration
  if (hoursSinceCheckIn < 12 && streak > 0) {
    const messages = [
      `🔥 ${streak} day streak! Come back tomorrow to keep it alive!`,
      `🌟 ${streak} days strong! Don't break your amazing streak tomorrow!`,
      `💪 ${streak} consecutive days! You're building a powerful habit!`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  return null;
};

/**
 * Get milestone celebration message
 */
export const getMilestoneMessage = (stats) => {
  const { flashcards, quizzes, streak, accuracy } = stats;
  
  const milestones = [
    {
      condition: flashcards === 100,
      message: "🎉 Milestone Alert! You've created 100 flashcards! Incredible! 🎊"
    },
    {
      condition: quizzes === 50,
      message: "🏆 50 quizzes completed! You're a quiz champion! 💯"
    },
    {
      condition: streak === 30,
      message: "🔥 30 DAY STREAK! You're a learning legend! 🌟"
    },
    {
      condition: streak === 7,
      message: "✨ One week streak! You're building unstoppable momentum! 🚀"
    },
    {
      condition: accuracy === 100 && quizzes >= 5,
      message: "🎯 Perfect accuracy! You're mastering everything! ⭐"
    },
  ];
  
  const achieved = milestones.find(m => m.condition);
  return achieved ? achieved.message : null;
};

/**
 * Get random encouraging tip
 */
export const getRandomTip = () => {
  const tips = [
    "💡 Tip: Review flashcards right before bed for better retention!",
    "🧠 Did you know? Spaced repetition is proven to boost memory by 200%!",
    "⏰ Best time to study? Research shows mornings are great for learning!",
    "🎯 Pro tip: Take 5-minute breaks between study sessions for better focus!",
    "📱 Fun fact: Mobile learning can be just as effective as traditional methods!",
    "✨ Remember: Consistency beats intensity. Small daily efforts = big results!",
    "🚀 Quick tip: Teach what you learn to someone else to master it faster!",
    "📚 Study hack: Use visuals and diagrams to remember complex concepts!",
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
};

/**
 * Get AI chat bubble message based on user context
 * Returns personalized, RANDOM message using REAL user data for variety
 */
export const getAIChatMessage = (stats, recentActivity, userStreak, isFirstCheckIn) => {
  const { accuracy, streak, quizzes, flashcards } = stats;
  const greeting = getTimeBasedGreeting();
  
  // Collect ALL possible message categories based on available data
  const messagePool = [];
  
  // Category 1: Last activity messages (what they were working on)
  if (recentActivity && recentActivity.length > 0) {
    const lastActivity = recentActivity[0];
    const activityMessages = [
      `Hey! 👋 Last time you were working on "${lastActivity.title}". Ready to continue? 💪`,
      `I see you were studying "${lastActivity.title}"! 📚 Want to pick up where you left off? 🎯`,
      `"${lastActivity.title}" is waiting for you! 🌟 Let's dive back in! 🚀`,
      `You were exploring "${lastActivity.title}" recently! 📖 Ready for more? ✨`,
    ];
    messagePool.push(...activityMessages);
  }
  
  // Category 2: Incomplete tasks (high priority for engagement)
  const incompleteMCQ = getIncompleteMCQMessage(recentActivity);
  if (incompleteMCQ) {
    const progress = Math.round(incompleteMCQ.activity.progress_percentage || 0);
    messagePool.push(
      `Hey! 📝 You left "${incompleteMCQ.activity.title}" at ${progress}%. Let's finish it! 💪`,
      `Don't forget "${incompleteMCQ.activity.title}"! ${100 - progress}% to go! 🎯`,
      `Quick reminder! 📊 "${incompleteMCQ.activity.title}" needs completion! ✨`
    );
  }
  
  const incompleteFlashcard = getIncompleteFlashcardsMessage(recentActivity);
  if (incompleteFlashcard) {
    messagePool.push(
      `🎴 "${incompleteFlashcard.activity.title}" flashcards need review! 💡`,
      `Continue "${incompleteFlashcard.activity.title}" - your memory will thank you! 🧠`,
      `Time to practice "${incompleteFlashcard.activity.title}"! 🎯`
    );
  }
  
  // Category 3: Streak messages
  if (streak === 0 && quizzes > 0) {
    messagePool.push(
      `Your streak reset! 😔 But hey, every champion starts again. Let's rebuild! 🔥💪`,
      `0 day streak? No worries! 🌱 Today is Day 1 of your comeback! 🚀`
    );
  }
  
  if (streak === 1) {
    messagePool.push(
      `Day 1 of your streak! 🌱 Awesome start! Tomorrow makes it 2! 💪`,
      `You started a streak! 🔥 Keep it going tomorrow! ✨`
    );
  }
  
  if (streak >= 2 && streak < 5) {
    messagePool.push(
      `${streak} day streak! 🔥 You're building a habit! Don't break it! 💪`,
      `Day ${streak}! 🌟 Consistency is key! Keep showing up! 🎯`,
      `${streak} days strong! 💪 You're on your way to greatness! 🚀`
    );
  }
  
  if (streak >= 5 && streak < 7) {
    messagePool.push(
      `${streak} day streak! 🔥 Almost a full week! Can you make it to 7? 💪`,
      `Day ${streak}! 🌟 You're so close to a week! Keep pushing! 🎯`
    );
  }
  
  if (streak >= 7) {
    messagePool.push(
      `🔥 ${streak} day streak! You're unstoppable! Amazing dedication! 🏆`,
      `WOW! ${streak} days in a row! 🌟 You're a learning machine! 💪`,
      `${streak} day streak! 🎉 Your consistency is inspiring! Keep it up! ✨`
    );
  }
  
  // Category 4: Accuracy-based messages (but not always!)
  if (accuracy < 40 && quizzes >= 3) {
    messagePool.push(
      `${accuracy}% accuracy... 😔 Tough spot, but mistakes teach! Let's improve! 💪`,
      `${accuracy}% shows you're trying! 💙 Keep practicing, you'll get there! 🎯`
    );
  }
  
  if (accuracy >= 40 && accuracy < 60 && quizzes >= 3) {
    messagePool.push(
      `${accuracy}% accuracy! 📈 You're improving! Keep pushing! 🚀`,
      `${accuracy}% - progress! 🌟 You're building momentum! 💯`
    );
  }
  
  if (accuracy >= 60 && accuracy < 80 && quizzes >= 3) {
    messagePool.push(
      `${accuracy}% accuracy! 👏 Solid work! Push for 80%! 🎯`,
      `${accuracy}% correct! 🌟 You're on the right track! 💪`
    );
  }
  
  if (accuracy >= 80 && quizzes >= 3) {
    messagePool.push(
      `${accuracy}% accuracy! 🎉 You're crushing it! 🏆`,
      `${accuracy}% correct! 💯 Quiz master status! ⭐`
    );
  }
  
  // Category 5: Overall progress messages
  if (quizzes > 0 || flashcards > 0) {
    if (quizzes >= 1 && flashcards >= 1) {
      messagePool.push(
        `You've created ${quizzes} quizzes and ${flashcards} flashcards! 📊 Great progress! 🌟`,
        `${quizzes} quizzes, ${flashcards} flashcards! 🎯 You're building something amazing! 💪`
      );
    }
    
    if (quizzes >= 5) {
      messagePool.push(
        `${quizzes} quizzes completed! 📝 Your dedication shows! Keep going! 🚀`,
        `You've done ${quizzes} quizzes! 🎯 That's commitment! 💪`
      );
    }
    
    if (flashcards >= 10) {
      messagePool.push(
        `${flashcards} flashcards! 🎴 Your study library is growing! 📚`,
        `${flashcards} flashcards created! 💡 Building knowledge brick by brick! 🏗️`
      );
    }
  }
  
  // Category 6: First check-in special messages
  if (isFirstCheckIn) {
    messagePool.push(
      `${greeting}! 🌅 Fresh day, fresh opportunities! Let's make it count! 💪`,
      `${greeting}! ☀️ Welcome back! Ready to learn something amazing? 🎯`,
      `${greeting}! ✨ New day to grow! What will you learn today? 🚀`
    );
    
    if (userStreak && userStreak.current_streak >= 3) {
      messagePool.push(
        `${greeting}! 🔥 Day ${userStreak.current_streak} of your streak! Momentum! 💪`,
        `${greeting}! Day ${userStreak.current_streak}! 🌟 Keep that fire burning! 🔥`
      );
    }
  }
  
  // Category 7: Time-based greetings with motivation
  messagePool.push(
    `${greeting}! 🌟 Ready to turn knowledge into power? 💪`,
    `${greeting}! 🎯 Let's make today a learning win! 🚀`,
    `${greeting}! 💡 Your brain is ready for action! Let's go! ✨`,
    `${greeting}! 📚 Every session brings you closer to mastery! 🎓`
  );
  
  // Category 8: Generic motivational messages
  messagePool.push(
    "Hey! Ready to learn something new today? 🎯",
    "Your brain is ready for knowledge! Let's make it productive! 💪",
    "Every study session is progress! Keep moving forward! ✨",
    "Let's turn effort into excellence! Ready? 📚",
    "Small steps today = big wins tomorrow! Let's go! 🌟",
    "Learning mode: ON! 🚀 What's first on your list? 🎯",
    "Another day, another chance to grow! 💪 Let's do this! ✨"
  );
  
  // If no specific data, add beginner-friendly messages
  if (quizzes === 0 && flashcards === 0) {
    messagePool.push(
      `Ready to start your learning journey? 🌟 Let's create something! 📚`,
      `Upload a document and watch the magic happen! ✨ Let's begin! 🚀`,
      `New here? Perfect! 🎯 Let's turn your notes into study power! 💪`
    );
  }
  
  // Return a RANDOM message from the pool for variety!
  if (messagePool.length > 0) {
    const randomIndex = Math.floor(Math.random() * messagePool.length);
    return messagePool[randomIndex];
  }
  
  // Fallback if somehow no messages (shouldn't happen)
  return "Hey! Ready to learn something new today? 🎯";
};

/**
 * Get contextual welcome banner with priority system
 * Returns the most relevant message for the user
 */
export const getWelcomeBanner = (stats, recentActivity, userStreak) => {
  // Priority 1: Milestone celebrations
  const milestone = getMilestoneMessage(stats);
  if (milestone) {
    return {
      type: 'milestone',
      icon: '🎉',
      title: 'Milestone Achieved!',
      message: milestone,
      color: '#F59E0B', // amber
      action: null
    };
  }
  
  // Priority 2: Incomplete MCQs (encourage completion)
  const incompleteMCQ = getIncompleteMCQMessage(recentActivity);
  if (incompleteMCQ) {
    return {
      type: 'incomplete_mcq',
      icon: '📝',
      title: 'Continue Your Quiz',
      message: incompleteMCQ.message,
      color: '#8B5CF6', // purple
      action: {
        label: 'Resume Now',
        activity: incompleteMCQ.activity
      }
    };
  }
  
  // Priority 3: Incomplete Flashcards
  const incompleteFlashcard = getIncompleteFlashcardsMessage(recentActivity);
  if (incompleteFlashcard) {
    return {
      type: 'incomplete_flashcard',
      icon: '🎴',
      title: 'Continue Learning',
      message: incompleteFlashcard.message,
      color: '#10B981', // green
      action: {
        label: 'Continue',
        activity: incompleteFlashcard.activity
      }
    };
  }
  
  // Priority 4: Performance-based motivation
  const performanceMsg = getPerformanceMessage(stats);
  return {
    type: 'performance',
    icon: '✨',
    title: getTimeBasedGreeting(),
    message: performanceMsg,
    color: '#6366F1', // indigo
    action: null
  };
};
