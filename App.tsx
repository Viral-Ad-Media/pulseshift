import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Calendar } from './components/Calendar';
import { RequestModal } from './components/RequestModal';
import { AdminPanel } from './components/AdminPanel';
import { MyShifts } from './components/MyShifts';
import { User, Role, ShiftRequest, RequestType, RequestStatus } from './types';

// Extended Mock Data for Timeline View
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Jake Avery', role: Role.NURSE, avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: 'Sergio Good', role: Role.NURSE, avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: 'Luke O\'Conner', role: Role.NURSE, avatar: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', name: 'Erick Perez', role: Role.NURSE, avatar: 'https://i.pravatar.cc/150?u=u4' },
  { id: 'a1', name: 'Bruce Parks', role: Role.ADMIN, avatar: 'https://i.pravatar.cc/150?u=a1' },
];

const CURRENT_USER_ID = 'u1'; // Sarah is now Jake for the demo to match list

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR' | 'DISPATCH' | 'MAP'>('DISPATCH');
  const [timeView, setTimeView] = useState<'DAY' | 'WEEK' | 'MONTH' | 'INDIVIDUAL'>('DAY');
  const [scope, setScope] = useState<'MY' | 'TEAM'>('TEAM');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingRequest, setEditingRequest] = useState<ShiftRequest | undefined>(undefined);

  // Initialize Data
  useEffect(() => {
    const saved = localStorage.getItem('pulseShift_requests');
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      // Create some initial mock requests for the visual
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const mockReqs: ShiftRequest[] = [
        { id: '1', userId: 'u1', userName: 'Jake Avery', date: todayStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now() },
        { id: '2', userId: 'u2', userName: 'Sergio Good', date: todayStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now() },
        { id: '3', userId: 'u3', userName: 'Luke O\'Conner', date: todayStr, type: RequestType.WORK, status: RequestStatus.APPROVED, createdAt: Date.now(), notes: 'Half day' },
        { id: '4', userId: 'u4', userName: 'Erick Perez', date: todayStr, type: RequestType.PTO, status: RequestStatus.APPROVED, createdAt: Date.now() },
      ];
      setRequests(mockReqs);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pulseShift_requests', JSON.stringify(requests));
  }, [requests]);

  const handleOpenRequestModal = (date: Date) => {
      setSelectedDate(date);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      // Allow editing if it's the current user's request
      const existing = requests.find(r => r.userId === currentUser.id && r.date === dateStr);
      setEditingRequest(existing);
      setIsModalOpen(true);
  };

  const handleMonthChange = (increment: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setCurrentDate(newDate);
  };

  const handleSubmitRequest = (type: RequestType, notes: string) => {
    if (!selectedDate) return;

    if (editingRequest) {
      setRequests(prev => prev.map(r => 
        r.id === editingRequest.id ? { ...r, type, notes } : r
      ));
    } else {
      const newRequest: ShiftRequest = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
        type,
        status: RequestStatus.PENDING,
        notes,
        createdAt: Date.now()
      };
      setRequests(prev => [...prev, newRequest]);
    }

    setIsModalOpen(false);
    setEditingRequest(undefined);
  };

  const handleDeleteRequest = () => {
    if (editingRequest) {
      setRequests(prev => prev.filter(r => r.id !== editingRequest.id));
      setIsModalOpen(false);
      setEditingRequest(undefined);
    }
  };

  const switchRole = () => {
    // Toggle between Nurse (Jake) and Admin (Bruce)
    const newUser = currentUser.role === Role.NURSE 
      ? MOCK_USERS.find(u => u.role === Role.ADMIN) || MOCK_USERS[4] 
      : MOCK_USERS[0];
    setCurrentUser(newUser);
  };

  // Filter requests based on Scope (My vs Team)
  const visibleRequests = scope === 'MY' 
    ? requests.filter(r => r.userId === currentUser.id)
    : requests;

  const visibleUsers = scope === 'MY'
    ? MOCK_USERS.filter(u => u.id === currentUser.id)
    : MOCK_USERS;

  return (
    <Layout 
      currentUser={currentUser} 
      onLogout={() => {}} 
      onSwitchRole={switchRole}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      timeView={timeView}
      onTimeViewChange={setTimeView}
      scope={scope}
      onScopeChange={setScope}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      onCreateClick={() => handleOpenRequestModal(currentDate)}
    >
      
      {/* 
          If User is Admin and in 'LIST' mode, show Admin Panel 
          Otherwise follow the standard View Mode logic
      */}
      {currentUser.role === Role.ADMIN && viewMode === 'LIST' ? (
        <div className="p-8">
           <AdminPanel 
             requests={requests} 
             onUpdateRequest={(id, status, response) => {
               setRequests(prev => prev.map(r => r.id === id ? { ...r, status, adminResponse: response } : r));
             }} 
           />
        </div>
      ) : viewMode === 'LIST' ? (
        <div className="p-8">
          <MyShifts 
            requests={requests.filter(r => r.userId === currentUser.id)}
            onEdit={(req) => {
                const [y, m, d] = req.date.split('-').map(Number);
                handleOpenRequestModal(new Date(y, m-1, d));
            }}
            onCancel={(id) => setRequests(prev => prev.filter(r => r.id !== id))}
          />
        </div>
      ) : (
        <Calendar 
          currentDate={currentDate}
          requests={visibleRequests}
          viewMode={viewMode}
          timeView={timeView}
          users={visibleUsers}
          selectedDate={selectedDate}
          onDateClick={(d) => setSelectedDate(d)}
          onMonthChange={handleMonthChange}
          onRequestOpen={handleOpenRequestModal}
        />
      )}

      {isModalOpen && selectedDate && (
        <RequestModal 
          date={selectedDate}
          existingRequest={editingRequest}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRequest(undefined);
          }}
          onSubmit={handleSubmitRequest}
          onDelete={handleDeleteRequest}
        />
      )}
    </Layout>
  );
};

export default App;