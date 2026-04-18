import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Shield, Trash2, Upload, Image as ImageIcon } from 'lucide-react';

interface EditCourseModalProps {
  course: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditCourseModal({ course, onClose, onUpdate }: EditCourseModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [name, setName] = useState(course.name || '');
  const [code, setCode] = useState(course.code || '');
  const [description, setDescription] = useState(course.description || '');
  const [tags, setTags] = useState(course.tags || '');
  const [avatarUrl, setAvatarUrl] = useState(course.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(course.bannerUrl || '');
  
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers();
    }
  }, [activeTab]);

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, code, description, tags, avatarUrl, bannerUrl })
      });
      if (!res.ok) throw new Error('Failed to update course');
      onUpdate();
      alert('Course updated successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ isAdmin })
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/upload?type=course&id=${course.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (type === 'avatar') setAvatarUrl(data.url);
        if (type === 'banner') setBannerUrl(data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-white">Manage Course: {course.code}</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-neutral-800 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'details' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-neutral-400 hover:text-white'}`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'members' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-neutral-400 hover:text-white'}`}
          >
            Members
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'details' && (
            <form onSubmit={handleUpdateDetails} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Course Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500"
                  placeholder="e.g. Computer Science, Programming"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Avatar Image</label>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileUpload(e, 'avatar')}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">Banner Image</label>
                  <div className="flex items-center gap-4">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner" className="w-20 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-20 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                    <input
                      type="file"
                      ref={bannerInputRef}
                      onChange={(e) => handleFileUpload(e, 'banner')}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'members' && (
            <div>
              {isLoadingMembers ? (
                <div className="text-center py-8 text-neutral-500">Loading members...</div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {members.map(member => (
                    <div key={member.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden shrink-0">
                          {member.user.avatarUrl ? (
                            <img src={member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold">
                              {member.user.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {member.user.name}
                            {member.isAdmin && (
                              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-neutral-400">@{member.user.username}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAdmin(member.user.id, !member.isAdmin)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${member.isAdmin ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700' : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20'}`}
                        >
                          {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <div className="py-8 text-center text-neutral-500">
                      No members enrolled in this course yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
