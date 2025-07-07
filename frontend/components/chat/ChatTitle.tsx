'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ChatTitleProps {
  title: string;
}

/**
 * ChatTitle displays the chat title with a typewriter animation
 * when the title is received from GPT-4
 */
export const ChatTitle: React.FC<ChatTitleProps> = ({ title }) => {
  if (!title || title === 'New Chat') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 text-center"
    >
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
    </motion.div>
  );
}; 