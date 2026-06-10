'use client';

import { useState } from 'react';
import { ClaimsTable } from './claims-table';
import { ProjectSidebar } from './project-sidebar';
import { AddUsersForm } from './add-users-form';
import { UsersManagement } from './users-management';
import { ClaimsAutoAssignment } from './claims-auto-assignment';
import { AdminDashboard } from './admin-dashboard';
import { UserAnalytics } from './user-analytics';

interface ProjectDashboardProps {
  projectId: string;
  userEmail: string;
  userRole?: string;
}

export function ProjectDashboard({ projectId, userEmail, userRole }: ProjectDashboardProps) {
  const [activeTab, setActiveTab] = useState('claims');

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar with Header */}
      <ProjectSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={userEmail}
        projectId={projectId}
        userRole={userRole}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="px-8 py-8">
            <div className="max-w-5xl mx-auto">
              {/* Page Header */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-1">
                  {activeTab === 'claims' && 'Claims Analysis'}
                  {activeTab === 'users' && 'Add New Users'}
                  {activeTab === 'users-mgmt' && 'Users Management'}
                  {activeTab === 'claims-auto' && 'Claims Auto Assignment'}
                  {activeTab === 'process-monitor' && 'Admin Dashboard'}
                  {activeTab === 'user-analytics' && 'User Performance Analytics'}
                </h2>
                <p className="text-sm text-slate-600">
                  {activeTab === 'claims' && 'Review and analyze insurance claims data with comparison and editing capabilities'}
                  {activeTab === 'users' && 'Create new user accounts with role assignment (User or Superadmin)'}
                  {activeTab === 'users-mgmt' && 'Manage user roles and account status'}
                  {activeTab === 'claims-auto' && 'Configure auto-assignment limits and load distribution'}
                  {activeTab === 'process-monitor' && 'Monitor processes, manage queue, review history, and upload claims'}
                  {activeTab === 'user-analytics' && 'View completed claims, review speeds, and efficiency stats per reviewer'}
                </p>
              </div>

              {/* Content */}
              <div>
                {activeTab === 'claims' && <ClaimsTable projectId={projectId} />}
                {activeTab === 'users' && <AddUsersForm />}
                {activeTab === 'users-mgmt' && <UsersManagement />}
                {activeTab === 'claims-auto' && <ClaimsAutoAssignment />}
                {activeTab === 'process-monitor' && <AdminDashboard />}
                {activeTab === 'user-analytics' && <UserAnalytics />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
