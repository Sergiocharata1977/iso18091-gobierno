// Barrel export para el módulo de chat
// SOLO COMPONENTES Y HOOKS PARA CLIENTE

// Types (safe for both server and client)
export * from './types';

// Hooks (client-side only)
export { useChat } from './hooks/useChat';

// Components (client-side only)
export { ChatContainer } from './components/ChatContainer';
export { ChatWindow } from './components/ChatWindow';
export { DonCandidoFAB } from './components/DonCandidoFAB';
export { MessageList } from './components/MessageList';
export { SessionList } from './components/SessionList';

// NOTE: Services (ChatService, ContextService) are SERVER-ONLY
// and should be imported directly in API routes:
// import { ChatService } from '@/features/chat/services/ChatService';
// import { ContextService } from '@/features/chat/services/ContextService';
