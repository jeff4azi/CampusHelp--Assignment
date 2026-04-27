import { useContext } from "react";
import { PostsContext } from "../context/PostsContext.jsx";

export const usePosts = () => useContext(PostsContext);
