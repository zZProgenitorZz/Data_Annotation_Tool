import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllDatasets } from "../../services/datasetService";
import { getAllUsers } from "../../services/authService";
import { getAllLogs } from "../../services/logService";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDatasets: 0,
    totalUsers: 0,
    recent: [],
  });

  const [hoverCard, setHoverCard] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [datasets, users, logs] = await Promise.all([
          getAllDatasets(),
          getAllUsers(),
          getAllLogs(),
        ]);

        const userMap = new Map(users.map((u) => [u.id, u.username]));

        const recent = (logs || [])
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, 50)
          .map((log) => ({
            time: new Date(log.timestamp).toLocaleString(),
            action: log.action,
            entity: log.target ?? "",
            user: userMap.get(log.userId) ?? "Unknown",
          }));

        setStats({
          totalDatasets: datasets?.length ?? 0,
          totalUsers: users?.length ?? 0,
          recent,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };

    fetchDashboardData();
  }, []);

  const baseShadow = "0 4px 10px rgba(0,0,0,0.18)";
  const hoverShadow = "0 10px 24px rgba(0,0,0,0.28)";
  const navigate = useNavigate();

  return (
    <div
      className="w-full select-none"
      style={{
        minHeight: "100vh",
        paddingBottom: "40px",
        boxSizing: "border-box",
      }}
    >
      {/* PAGE TITLE */}
      <h1
        className="italic mb-[30px]"
        style={{ fontSize: "32px", fontWeight: 600, color: "#000" }}
      >
        Dashboard
      </h1>

      {/* TWO CARDS ROW (can wrap on smaller screens) */}
      <div className="flex flex-wrap gap-[40px]">
        {/* DATASETS CARD */}
        <div
          onClick={() => navigate("/admin/datasets")}
          onMouseEnter={() => setHoverCard("datasets")}
          onMouseLeave={() => setHoverCard(null)}
          className="
            rounded-[10px] overflow-hidden cursor-pointer
            transition-all duration-200
            hover:scale-[1.015]
          "
          style={{
            width: "340px",
            height: "170px",
            backgroundColor: "#44F3C9",
            boxShadow: hoverCard === "datasets" ? hoverShadow : baseShadow,
            borderRadius: "10px",
          }}
        >
          <div className="h-[125px] flex flex-col justify-end pl-[20px] pb-[10px]">
            <span style={{ fontSize: "48px", fontWeight: 600 }}>
              {stats.totalDatasets}
            </span>

            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginTop: "-6px",
              }}
            >
              Datasets
            </span>
          </div>

          {/* FOOTER */}
          <div
            className="flex items-center justify-center"
            style={{
              height: "35px",
              backgroundColor: "#37D5AF",
              fontSize: "16px",
              fontWeight: 600,
              fontStyle: "italic",
              color: "#000",
            }}
          >
            View Datasets
          </div>
        </div>

        {/* USERS CARD */}
        <div
          onClick={() => navigate("/admin/users")}
          onMouseEnter={() => setHoverCard("users")}
          onMouseLeave={() => setHoverCard(null)}
          className="
            rounded-[10px] overflow-hidden cursor-pointer
            transition-all duration-200
            hover:scale-[1.015]
          "
          style={{
            width: "340px",
            height: "170px",
            backgroundColor: "#FFCC00",
            boxShadow: hoverCard === "users" ? hoverShadow : baseShadow,
            borderRadius: "10px",
          }}
        >
          <div className="h-[125px] flex flex-col justify-end pl-[20px] pb-[10px]">
            <span style={{ fontSize: "48px", fontWeight: 600 }}>
              {stats.totalUsers}
            </span>

            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginTop: "-6px",
              }}
            >
              Users
            </span>
          </div>

          {/* FOOTER */}
          <div
            className="flex items-center justify-center"
            style={{
              height: "35px",
              backgroundColor: "#DEB200",
              fontSize: "16px",
              fontWeight: 600,
              fontStyle: "italic",
              color: "#000",
            }}
          >
            View Users
          </div>
        </div>
      </div>

      {/* SEPARATOR */}
      <div
        className="w-full my-[40px]"
        style={{ height: "2px", backgroundColor: "rgba(0,0,0,0.15)" }}
      ></div>

      {/* RECENT ACTIVITY TITLE */}
      <h2
        className="italic mb-[20px]"
        style={{ fontSize: "28px", fontWeight: 600, color: "#000" }}
      >
        Recent Activity
      </h2>

      {/* TABLE WRAPPER */}
      <div
        className="overflow-x-auto rounded-[12px]"
        style={{
          width: "760px",
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
          borderRadius: "12px",
        }}
      >
        {/* TABLE INNER */}
        <div
          className="overflow-hidden select-text"
          style={{
            width: "760px",
            backgroundColor: "#ffffff",
          }}
        >
          {/* TABLE HEADER */}
          <div
            className="flex"
            style={{
              backgroundColor: "#44F3C9",
              fontWeight: 600,
              fontSize: "16px",
              height: "40px",
              alignItems: "center",
              paddingLeft: "20px",
            }}
          >
            <div className="w-[160px] truncate">Time/Date</div>
            <div className="w-[200px] truncate">Action</div>
            <div className="w-[200px] truncate">Entity</div>
            <div className="w-[160px] truncate">Performed by</div>
          </div>

          {/* SCROLL BODY (only rows scroll) */}
          <div
            className="datasets-scroll"
            style={{
              maxHeight: "360px",
              overflowY: "auto",
              overflowX: "hidden",
              backgroundColor: "#F2F2F2",
            }}
          >
            {stats.recent.map((row, index) => (
              <div
                key={index}
                className="flex border-b border-[#D6D6D6]"
                style={{
                  backgroundColor: "#F2F2F2",
                  height: "36px",
                  alignItems: "center",
                  paddingLeft: "20px",
                  fontSize: "15px",
                }}
              >
                <div className="w-[160px] truncate">{row.time}</div>
                <div className="w-[200px] truncate">{row.action}</div>
                <div className="w-[200px] truncate">{row.entity}</div>
                <div className="w-[160px] truncate">{row.user}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
