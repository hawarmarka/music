import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUser,
  FiMessageCircle,
  FiImage,
  FiSettings,
} from "react-icons/fi";

const items = [
  { to: "/", label: "Home", icon: <FiHome /> },
  { to: "/profile", label: "Profile", icon: <FiUser /> },
  { to: "/messages", label: "Messages", icon: <FiMessageCircle /> },
  { to: "/gallery", label: "Gallery", icon: <FiImage /> },
  { to: "/settings", label: "Settings", icon: <FiSettings /> },
];

export default function BottomNav() {
  return (
    <nav className="hm-bottom-nav-wrap">
      <div className="hm-bottom-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `hm-nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="hm-nav-icon">{item.icon}</span>
            <span className="hm-nav-text">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
