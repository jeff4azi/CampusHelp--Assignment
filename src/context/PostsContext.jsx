import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { supabase } from "../lib/supabase.js";
import { SessionsContext } from "./SessionsContext.jsx";
import { NotificationsContext } from "./NotificationsContext.jsx";
import toast from "react-hot-toast";

export const PostsContext = createContext(null);

export function PostsProvider({ children }) {
  const { createSession } = useContext(SessionsContext);
  const { createNotification } = useContext(NotificationsContext);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // offers keyed by postId: { [postId]: Offer[] }
  const [offersByPost, setOffersByPost] = useState({});

  // ── Helpers ──────────────────────────────────────────────────────────────

  function mapPost(p) {
    return {
      id: p.id,
      userId: p.user_id,
      course: p.course,
      description: p.description,
      budget: p.budget,
      status: p.status ?? "open",
      createdAt: p.created_at,
    };
  }

  function mapOffer(o) {
    return {
      id: o.id,
      postId: o.post_id,
      helperId: o.helper_id,
      helperEmail: o.helper_email ?? null,
      message: o.message,
      accepted: o.accepted,
      createdAt: o.created_at,
    };
  }

  // ── Posts ─────────────────────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    setPostsLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setPosts(data.map(mapPost));
    setPostsLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function addPost(postData, userId) {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        course: postData.course,
        description: postData.description,
        budget: Number(postData.budget),
        status: "open",
      })
      .select()
      .single();

    if (!error && data) {
      setPosts((prev) => [mapPost(data), ...prev]);
    }
  }

  async function updatePostStatus(postId, status) {
    const { error } = await supabase
      .from("posts")
      .update({ status })
      .eq("id", postId);

    if (!error) {
      // Update local state directly — no .select() to avoid 406 from RLS
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status } : p)),
      );
    } else {
      throw error;
    }
  }

  // ── Offers ────────────────────────────────────────────────────────────────

  async function fetchOffersForPost(postId) {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setOffersByPost((prev) => ({ ...prev, [postId]: data.map(mapOffer) }));
    }
  }

  async function submitOffer(postId, helperId, message) {
    const { data, error } = await supabase
      .from("offers")
      .insert({ post_id: postId, helper_id: helperId, message })
      .select()
      .single();

    if (error) throw error;

    setOffersByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), mapOffer(data)],
    }));
    // Notification is handled by the on_offer_created DB trigger
  }

  async function acceptOffer(offer, postOwnerId) {
    // 1. Mark offer as accepted
    const { error: offerErr } = await supabase
      .from("offers")
      .update({ accepted: true })
      .eq("id", offer.id);
    if (offerErr) throw offerErr;

    // 2. Update post status
    await updatePostStatus(offer.postId, "in_progress");

    // 3. Create work session — this is the core change
    const session = await createSession({
      postId: offer.postId,
      ownerId: postOwnerId,
      helperId: offer.helperId,
    });

    // 4. Update local offers state
    setOffersByPost((prev) => ({
      ...prev,
      [offer.postId]: (prev[offer.postId] ?? []).map((o) =>
        o.id === offer.id ? { ...o, accepted: true } : o,
      ),
    }));

    // Notify the helper their offer was accepted
    await createNotification({
      userId: offer.helperId,
      type: "offer_accepted",
      title: "Your offer was accepted! 🎉",
      body: "The student accepted your offer. Head to your Helping tab to get started.",
      refId: session.id,
    });

    toast.success("Offer accepted! Session started.");
    return session;
  }

  return (
    <PostsContext.Provider
      value={{
        posts,
        postsLoading,
        addPost,
        updatePostStatus,
        offersByPost,
        fetchOffersForPost,
        submitOffer,
        acceptOffer,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
}
