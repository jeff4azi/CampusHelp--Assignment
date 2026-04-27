import { useContext } from "react";
import { SessionsContext } from "../context/SessionsContext.jsx";

export const useSessions = () => useContext(SessionsContext);
