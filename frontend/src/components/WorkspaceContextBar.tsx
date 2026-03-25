import React from 'react';

interface WorkspaceContextBarProps {
  restaurantName: string;
}

/**
 * Shows active restaurant workspace (platform + restaurant staff).
 */
const WorkspaceContextBar: React.FC<WorkspaceContextBarProps> = ({ restaurantName }) => {
  return (
    <div className="hidden md:flex flex-1 max-w-md min-w-0">
      <div className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-4 py-2.5">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
          Workspace
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium truncate">
          {restaurantName} · Operations Console
        </p>
      </div>
    </div>
  );
};

export default WorkspaceContextBar;
