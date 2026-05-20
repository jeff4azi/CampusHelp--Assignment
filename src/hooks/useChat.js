import { useContext } from "react";
import { ChatContext } from "../context/ChatContext.jsx";

export const useChat = () => useContext(ChatContext);
