import { useContext } from "react";
import { NotificationsContext } from "../context/NotificationsContext.jsx";

export const useNotifications = () => useContext(NotificationsContext);
