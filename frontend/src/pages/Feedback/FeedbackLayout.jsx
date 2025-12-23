import FeedbackSidebar from "./components/FeedbackSidebar";
import aidxlogo from "/src/assets/aidxlogo.png";
import { AuthContext } from "../../components/AuthContext";
import { useContext } from "react";
import Header from "../../components/Header";

export default function FeedbackLayout({ children }) {

    const {currentUser} = useContext(AuthContext);

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-[#44F3C9] to-[#3F7790] select-none">

      {/* HEADER */}
      {/* Top Header */}
        <div className="bg-[#44F3C9]">
            <Header title="Actions" currentUser={currentUser} />
        </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-row h-[calc(100vh-70px)] w-full overflow-hidden">
        <FeedbackSidebar />
        <div className="flex-1 overflow-auto p-[30px] datasets-scroll">
          {children}
        </div>
      </div>
    </div>
  );
}
