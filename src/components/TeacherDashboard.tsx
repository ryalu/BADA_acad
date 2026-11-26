import React from "react";
import { BookPlus, FileText, LogOut, Music, Users, Video } from "lucide-react";
import type { Book, SeasonalSong, StudentUser, TeacherAccount } from "../types";
import { TeacherStudentsTab } from "./teacher/TeacherStudentsTab";
import { TeacherCoachingTab } from "./teacher/TeacherCoachingTab";
import { TeacherWorksheetsTab } from "./teacher/TeacherWorksheetsTab";
import { TeacherBooksTab } from "./teacher/TeacherBooksTab";
import { TeacherSongsTab } from "./teacher/TeacherSongsTab";

export type TeacherTab = "home" | "coaching" | "worksheets" | "songs" | "database";

interface TeacherDashboardProps {
  activeTab: TeacherTab;
  onChangeTab: (tab: TeacherTab) => void;
  users: StudentUser[];
  teachers: TeacherAccount[];
  books: Book[];
  seasonalSongs?: SeasonalSong[];
  loggedTeacher: TeacherAccount;
  selectedUserId: string;
  onSelectStudent: (userId: string) => void;
  onDataUpdated: (payload: {
    users?: StudentUser[];
    teachers?: TeacherAccount[];
    books?: Book[];
    seasonalSongs?: SeasonalSong[];
    loggedTeacher?: TeacherAccount;
  }) => void;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  activeTab,
  onChangeTab,
  users,
  teachers,
  books,
  seasonalSongs = [],
  loggedTeacher,
  selectedUserId,
  onSelectStudent,
  onDataUpdated,
  onLogout
}) => {
  const currentUser = users.find((u) => u.id === selectedUserId) || users[0];
  const currentBook = books.find((b) => b.id === currentUser?.current_book_id) || books[0];

  const navItems: { id: TeacherTab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "학생 관리 & 원서 배정", icon: <Users className="w-4 h-4" /> },
    { id: "coaching", label: "학생 학습 관리", icon: <Video className="w-4 h-4" /> },
    { id: "worksheets", label: "오프라인 학습지", icon: <FileText className="w-4 h-4" /> },
    { id: "songs", label: "시즌송 · 캐롤 관리", icon: <Music className="w-4 h-4" /> },
    { id: "database", label: "원서 교재 등록 · 관리", icon: <BookPlus className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row">
      <aside className="w-full md:w-64 md:sticky md:top-0 md:h-screen md:overflow-y-auto bg-slate-900/95 backdrop-blur-md text-slate-100 flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="text-sm font-bold text-white">BADA English 관리센터</div>
              <div className="text-xs text-slate-400">강사 · 원장님 전용</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition text-left ${
                  activeTab === item.id
                    ? "btn-slate-glass"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-800 space-y-2.5">
          <div className="bg-slate-800/80 rounded-xl px-3.5 py-2.5">
            <div className="text-xs font-bold text-white">{loggedTeacher.name}</div>
            <div className="text-[11px] text-slate-400">{loggedTeacher.title_label}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-semibold text-slate-400 inline-flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 space-y-6 overflow-y-auto bg-[#fbf8f2]/72 backdrop-blur-xs">
        {activeTab === "home" && (
          <TeacherStudentsTab
            users={users}
            teachers={teachers}
            books={books}
            loggedTeacher={loggedTeacher}
            selectedUserId={selectedUserId}
            onSelectStudent={onSelectStudent}
            onChangeTab={onChangeTab}
            onDataUpdated={onDataUpdated}
          />
        )}

        {activeTab === "coaching" && currentUser && currentBook && (
          <TeacherCoachingTab
            users={users}
            books={books}
            seasonalSongs={seasonalSongs}
            currentUser={currentUser}
            currentBook={currentBook}
            onSelectStudent={onSelectStudent}
            onChangeTab={onChangeTab}
            onDataUpdated={onDataUpdated}
          />
        )}

        {activeTab === "worksheets" && (
          <TeacherWorksheetsTab
            users={users}
            books={books}
            currentUser={currentUser}
            currentBook={currentBook}
            onSelectStudent={onSelectStudent}
            onDataUpdated={onDataUpdated}
          />
        )}

        {activeTab === "songs" && (
          <TeacherSongsTab
            users={users}
            seasonalSongs={seasonalSongs}
            onSelectStudent={onSelectStudent}
            onChangeTab={onChangeTab}
            onDataUpdated={onDataUpdated}
          />
        )}

        {activeTab === "database" && (
          <TeacherBooksTab books={books} onDataUpdated={onDataUpdated} />
        )}
      </main>
    </div>
  );
};
