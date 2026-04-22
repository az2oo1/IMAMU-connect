import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Users } from 'lucide-react';
import EditCourseModal from './EditCourseModal';
import CourseUsersModal from './CourseUsersModal';
import TagInput from '../../components/TagInput';

export default function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseTags, setNewCourseTags] = useState('');
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [viewingUsersCourse, setViewingUsersCourse] = useState<any>(null);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch courses', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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

  const filteredCourses = courses.filter(course => 
    course?.name?.toLowerCase().includes(searchQuery?.toLowerCase() || '') ||
    course?.code?.toLowerCase().includes(searchQuery?.toLowerCase() || '')
  );

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
        <div className="mb-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">Create New Course</h3>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Course Code</label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500"
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary-500"
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

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/50">
                <th className="p-4 text-sm font-medium text-neutral-400">Code</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Name</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Tags</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">Loading courses...</td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">No courses found.</td>
                </tr>
              ) : filteredCourses.map((course) => (
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
