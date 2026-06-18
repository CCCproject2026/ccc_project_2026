"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Smartphone,
  ClipboardList,
  UserCog,
  LogOut,
} from "lucide-react";
import clsx from "clsx";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Residents",
    href: "/residents",
    icon: Users,
  },
  {
    label: "Devices",
    href: "/devices",
    icon: Smartphone,
  },
  {
    label: "Staff",
    href: "/staff",
    icon: UserCog,
  },
  {
    label: "Response",
    href: "/response",
    icon: ClipboardList,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo */}
      <div className="border-b px-6 py-5">
        <h1 className="text-xl font-bold text-blue-600">
          CCC
        </h1>
        <p className="text-sm text-gray-500">
          Care Connect Center
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                    active
                      ? "bg-blue-100 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="mb-4">
          <p className="font-medium">Admin</p>
          <p className="text-sm text-gray-500">
            admin@example.com
          </p>
        </div>

        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 transition hover:bg-red-50">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}