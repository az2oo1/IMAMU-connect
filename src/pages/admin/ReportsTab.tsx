import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Failed to fetch reports', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (error) {
      console.error('Failed to update report status', error);
    }
  };

  const filteredReports = reports.filter(report => 
    report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Report Center</h2>
        <p className="text-neutral-400">Review and resolve user reports.</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search reports..."
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
                <th className="p-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Reason</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Status</th>
                <th className="p-4 text-sm font-medium text-neutral-400">Date</th>
                <th className="p-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">Loading reports...</td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">No reports found.</td>
                </tr>
              ) : filteredReports.map((report) => (
                <tr key={report.id} className="border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-neutral-800 text-neutral-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {report.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-white">{report.reason}</p>
                    {report.contentId && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Content ID: {report.contentId}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      report.status === 'PENDING' ? 'text-yellow-400' :
                      report.status === 'RESOLVED' ? 'text-emerald-400' :
                      'text-neutral-400'
                    }`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-neutral-400">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {report.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'RESOLVED')}
                            className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                            title="Mark as Resolved"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'DISMISSED')}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                            title="Dismiss Report"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
