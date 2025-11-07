import LogoutButton from "./LogoutButton"

export default function Header({title, currentUser}) {


    return (
            <div
                className="relative flex items-end justify-center flex-shrink-0"
                style={{ height: "70px", backgroundColor: "rgba(255,255,255,0.31)" }}
            >
                {/* Logo left */}
                <img
                src="src/assets/aidxlogo.png"
                alt="AiDx Medical Logo"
                className="absolute left-[0px] top-[2px] bottom-[0px] pl-[3px] h-[40px]"
                />
                {/* Title middle */}
                <h1
                className="text-[#000000] text-[30px] font-[600] italic mb-[-2px]"
                style={{ textShadow: "0px 1px 0px rgba(0,0,0,0.15)" }}
                >
                {title}
                </h1>
                {/* Logout right */}
                <div className="absolute right-[10px] top-[5px] flex flex-col items-center ">
                    {currentUser && (
                        <span className="text-sm text-gray-500 ">
                            {currentUser.username }
                        </span>
                        )}
                    <LogoutButton/>
                </div>
            </div>
    );
}