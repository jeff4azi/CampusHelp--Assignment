import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import Feed from "../components/Feed.jsx";
import CreatePostModal from "../components/CreatePostModal.jsx";
import DashboardPreloader from "../components/DashboardPreloader.jsx";

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const [preloading, setPreloading] = useState(true); // always true on mount

  return (
    <>
      {preloading && <DashboardPreloader onDone={() => setPreloading(false)} />}

      <DashboardLayout>
        <div className="max-w-2xl mx-auto px-6 pt-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">Marketplace</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Browse open assignment requests
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <span className="text-base leading-none">+</span> Post a Job
          </button>
        </div>

        <Feed />

        {showModal && <CreatePostModal onClose={() => setShowModal(false)} />}
      </DashboardLayout>
    </>
  );
}
