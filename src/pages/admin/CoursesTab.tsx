import { TableSkeleton } from '../../components/TableSkeleton';
import React, { useState, useEffect } from 'react';
import AdminPagination from '../../components/AdminPagination';
import { Search, Plus, Trash2, Edit2, Users } from 'lucide-react';
import EditCourseModal from './EditCourseModal';
import CourseUsersModal from './CourseUsersModal';
import TagInput from '../../components/TagInput';

export default function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const LIMIT = 20;
  const [isCreating, setIsCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTags, setNewCourseTags] = useState('');
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [viewingUsersCourse, setViewingUsersCourse] = useState<any>(null);

  const fetchCourses = async (currentSearch = searchQuery, currentPage = page) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/courses?page=${currentPage}&limit=${LIMIT}&search=${encodeURIComponent(currentSearch)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
        if (data.totalPages) {
          setTotalPages(data.totalPages);
          setTotalItems(data.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(searchQuery, page);
  }, [page]);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchCourses();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: newCourseName, code: newCourseCode, tags: newCourseTags })
      });
      if (res.ok) {
        setNewCourseName('');
        setNewCourseCode('');
        setNewCourseTags('');
        setIsCreating(false);
        fetchCourses();
      }
    } catch (error) {
      console.error('Failed to create course', error);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        fetchCourses();
      }
    } catch (error) {
      console.error('Failed to delete course', error);
    }
  };

  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Course Management</h2>
          <p className="text-neutral-400">Create and manage academic courses.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 border border-neutral-800 bg-neutral-950/40 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Create New Course</h3>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Course Code</label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="e.g. CS101"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Course Name</label>
                <input
                  type="text"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  placeholder="e.g. Introduction to Computer Science"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Tags</label>
              <TagInput
                tags={newCourseTags}
                onChange={setNewCourseTags}
                placeholder="e.g. Programming, Freshman"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-neutral-800 bg-neutral-950/40 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-neutral-800 flex items-center gap-3 bg-neutral-900/20">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/40 text-xs uppercase tracking-wider text-neutral-500">
                <th className="p-4 text-sm font-medium text-neutral-400">Code</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Name</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Tags</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton />
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No courses found.</td>
                </tr>
              ) : courses.map((course) => (
                <tr key={course.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4 font-medium text-white">{course.code}</td>
                  <td className="p-4 text-neutral-300">{course.name}</td>
                  <td className="p-4 text-neutral-400 text-sm">{course.tags || '-'}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setViewingUsersCourse(course)}
                      className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      title="View Enrolled Users"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setEditingCourse(course)}
                      className="p-2 text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                      title="Edit Course"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AdminPagination 
          currentPage={page} 
          totalPages={totalPages} 
          totalItems={totalItems} 
          itemsPerPage={LIMIT} 
          onPageChange={setPage} 
        />
  
      </div>

      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onUpdate={() => {
            fetchCourses();
            setEditingCourse(null);
          }}
        />
      )}

      {viewingUsersCourse && (
        <CourseUsersModal
          courseId={viewingUsersCourse.id}
          courseName={viewingUsersCourse.name}
          onClose={() => setViewingUsersCourse(null)}
        />
      )}
    </div>
  );
}
