import React from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative px-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full sm:h-screen h-[calc(100vh-2rem)] lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape/>
            <div className="flex items-center max-w-xs">
              <Link to="/" className="block mb-4">
                <img
                    width={120}
                    height={48}
                    src="/images/logo/lo.png"
                    alt="Logo"
                />
              </Link>
              <h1 className="text-3xl font-extrabold text-white">RenalCare</h1>
            </div>
          </div>
        </div>
        <div className="fixed z-50 bottom-6 right-6 ">
          <ThemeTogglerTwo/>
        </div>
      </div>
    </div>
  );
}
