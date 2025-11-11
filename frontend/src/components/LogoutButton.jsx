import React, {useContext} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function LogoutButton() {
    const {logout} = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();

        navigate("/", {replace: true});
    };

    return (
       
        <div className="flex items-center cursor-pointer hover:opacity-80 transition"
        onClick={handleLogout}>
            <img
                src="src/assets/logout.png"
                alt="Edit"
                className="w-[22px] h-[22px] mb-[2px] mt-[20px] mr-[5px] "
              />
            
            <span className="text-[18px] font-[450] mt-[20px] text-[#000000] mr-[9px] ">
            Log out
            </span>  
        </div>
);
}