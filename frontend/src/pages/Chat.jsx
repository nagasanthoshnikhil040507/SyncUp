import { motion } from 'framer-motion';

const Chat = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark"
    >
      <div className="glass-card p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">💬 Chat</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Messaging interface will be built in Phase 4
        </p>
      </div>
    </motion.div>
  );
};

export default Chat;
