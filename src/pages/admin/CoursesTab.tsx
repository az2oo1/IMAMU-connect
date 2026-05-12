import { TableSkeleton } from '../../components/TableSkeleton';
import React, { useState, useEffect } from 'react';
import AdminPagination from '../../components/AdminPagination';
import { Search, Plus, Trash2, Edit2, Users, Loader2 } from 'lucide-react';
import EditCourseModal from './EditCourseModal';
import CourseUsersModal from './CourseUsersModal';
import TagInput from '../../components/TagInput';
import ConfirmModal from '../../components/ConfirmModal';

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
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, config: null | {title: string, message: string, onConfirm: () => void, isDestructive?: boolean}}>({ isOpen: false, config: null });

  const [tags, setTags] = useState<any[]>([]);
  const [newTag, setNewTag] = useState('');

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/course-tags');
      const data = await res.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    try {
      const res = await fetch('/api/admin/course-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newTag.trim() })
      });
      if (res.ok) {
        setNewTag('');
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to create tag', error);
    }
  };

  const handleDeleteTag = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Delete Tag',
        message: 'Are you sure you want to delete this tag? This action cannot be undone.',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
          try {
            const res = await fetch(`/api/admin/course-tags/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
              fetchTags();
            }
          } catch (error) {
            console.error('Failed to delete tag', error);
          }
        }
      }
    });
  };

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
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      config: {
        title: 'Delete Course',
        message: 'Are you sure you want to delete this course?',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal({ isOpen: false, config: null });
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
        }
      }
    });
  };

  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        title={confirmModal.config?.title || ''}
        message={confirmModal.config?.message || ''}
        isDestructive={confirmModal.config?.isDestructive}
        onConfirm={() => confirmModal.config?.onConfirm()}
        onCancel={() => setConfirmModal({ isOpen: false, config: null })}
      />
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
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tags.map(tag => {
                  const isSelected = newCourseTags.split(',').map(t => t.trim()).includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        let currentTags = newCourseTags.split(',').map(t => t.trim()).filter(Boolean);
                        if (isSelected) {
                          currentTags = currentTags.filter(t => t !== tag.name);
                        } else {
                          currentTags.push(tag.name);
                        }
                        setNewCourseTags(currentTags.join(', '));
                      }}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                        isSelected 
                          ? 'bg-primary-500/20 text-primary-400 border-primary-500/50' 
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {tags.length === 0 && (
                  <span className="text-sm text-neutral-500 italic py-1.5">No tags available. Set them up below.</span>
                )}
              </div>
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
                disabled={isSaving}
                className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 outline-none text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isSaving ? 'Creating...' : 'Create'}
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

      <div className="mb-8 mt-16">
        <h2 className="text-2xl font-bold text-white mb-2">Tag Management</h2>
        <p className="text-neutral-400">Add or remove predefined tags for courses.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl p-6">
        <form onSubmit={handleAddTag} className="flex items-center gap-4 mb-6">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name (e.g. Science, Humanities)"
            className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-lg shadow-sm px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
          />
          <button type="submit" className="px-6 py-2.5 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition-colors">
            Add Tag
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          {tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2 bg-neutral-800 px-4 py-2 rounded-xl text-neutral-300">
              <span className="font-medium">{tag.name}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteTag(tag.id); }} className="text-neutral-500 hover:text-red-400 p-0.5 rounded transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tags.length === 0 && <span className="text-neutral-500 text-sm">No tags available.</span>}
        </div>
      </div>
    </div>
  );
}
