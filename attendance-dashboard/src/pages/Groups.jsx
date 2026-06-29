import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, RefreshCw, 
  Users, BookOpen, Calendar, ChevronDown,
  ChevronRight, GraduationCap, Layers,
  Power, PowerOff, Search, Filter
} from 'lucide-react';
import attendanceAPI from '../api/attendance';

function Groups() {
  const [cohorts, setCohorts] = useState([]);
  const [filteredCohorts, setFilteredCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedCohort, setExpandedCohort] = useState(null);
  
  // ─── FILTERS ───
  const [showFilters, setShowFilters] = useState(false); // ← ADD THIS
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('');
  
  // Cohort Modal
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState(null);
  const [cohortFormData, setCohortFormData] = useState({
    cohort_name: '',
    cohort_code: '',
    start_year: ''
  });
  
  // Group Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedCohortForGroup, setSelectedCohortForGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    group_name: '',
    group_code: '',
    semester: '',
    academic_year: '',
    capacity: ''
  });

  const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── APPLY FILTERS ───
  useEffect(() => {
    let filtered = [...cohorts];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cohort => 
        cohort.cohort_name?.toLowerCase().includes(term) ||
        cohort.cohort_code?.toLowerCase().includes(term)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cohort => 
        cohort.is_active == (statusFilter === 'active' ? 1 : 0)
      );
    }
    
    // Semester filter - filter cohorts that have groups in the selected semester
    if (semesterFilter) {
      filtered = filtered.filter(cohort => 
        cohort.groups?.some(group => group.semester == semesterFilter)
      );
    }
    
    setFilteredCohorts(filtered);
  }, [cohorts, searchTerm, statusFilter, semesterFilter]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await attendanceAPI.getGroups();
      if (response.data.status === 'success') {
        setCohorts(response.data.cohorts);
        setFilteredCohorts(response.data.cohorts);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load groups', err);
      if (showLoading) alert('Error loading groups. Check if API is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => loadData(false);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSemesterFilter('');
  };

  // ─── COHORT CRUD ───
  const handleCohortSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        cohort_name: cohortFormData.cohort_name,
        cohort_code: cohortFormData.cohort_code,
        start_year: cohortFormData.start_year
      };
      
      if (editingCohort) {
        await attendanceAPI.updateCohort(editingCohort.cohort_id, data);
        alert('Cohort updated successfully!');
      } else {
        await attendanceAPI.addCohort(data);
        alert('Cohort added successfully!');
      }
      
      setShowCohortModal(false);
      setEditingCohort(null);
      setCohortFormData({ cohort_name: '', cohort_code: '', start_year: '' });
      loadData();
    } catch (err) {
      console.error('Failed to save cohort', err);
      alert('Error saving cohort');
    }
  };

  const handleDeleteCohort = async (cohortId) => {
    if (!confirm('Are you sure you want to delete this cohort and all its groups?')) return;
    try {
      await attendanceAPI.deleteCohort(cohortId);
      loadData();
      alert('Cohort deleted successfully!');
    } catch (err) {
      console.error('Failed to delete cohort', err);
      alert('Error deleting cohort');
    }
  };

  const handleToggleCohortStatus = async (cohortId, currentStatus) => {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this cohort?`)) return;
    
    try {
      await attendanceAPI.updateCohortStatus(cohortId, newStatus);
      loadData();
      alert(`Cohort ${action}d successfully!`);
    } catch (err) {
      console.error('Failed to update cohort status', err);
      alert('Error updating cohort status');
    }
  };

  const openEditCohort = (cohort) => {
    setEditingCohort(cohort);
    setCohortFormData({
      cohort_name: cohort.cohort_name,
      cohort_code: cohort.cohort_code || '',
      start_year: cohort.start_year || ''
    });
    setShowCohortModal(true);
  };

  // ─── GROUP CRUD ───
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        cohort_id: selectedCohortForGroup.cohort_id,
        ...groupFormData
      };
      
      if (editingGroup) {
        await attendanceAPI.updateGroup(editingGroup.group_id, data);
        alert('Group updated successfully!');
      } else {
        await attendanceAPI.addGroup(data);
        alert('Group added successfully!');
      }
      
      setShowGroupModal(false);
      setSelectedCohortForGroup(null);
      setEditingGroup(null);
      setGroupFormData({
        group_name: '',
        group_code: '',
        semester: '',
        academic_year: '',
        capacity: ''
      });
      loadData();
    } catch (err) {
      console.error('Failed to save group', err);
      alert('Error saving group');
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!confirm(`Are you sure you want to delete group "${groupName}"?`)) return;
    try {
      await attendanceAPI.deleteGroup(groupId);
      loadData();
      alert('Group deleted successfully!');
    } catch (err) {
      console.error('Failed to delete group', err);
      alert('Error deleting group');
    }
  };

  const handleToggleGroupStatus = async (groupId, currentStatus) => {
    const newStatus = currentStatus == 1 ? 0 : 1;
    const action = newStatus == 1 ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this group?`)) return;
    
    try {
      await attendanceAPI.updateGroupStatus(groupId, newStatus);
      loadData();
      alert(`Group ${action}d successfully!`);
    } catch (err) {
      console.error('Failed to update group status', err);
      alert('Error updating group status');
    }
  };

  const openEditGroup = (group, cohort) => {
    setEditingGroup(group);
    setSelectedCohortForGroup(cohort);
    setGroupFormData({
      group_name: group.group_name,
      group_code: group.group_code || '',
      semester: group.semester || '',
      academic_year: group.academic_year || '',
      capacity: group.capacity || ''
    });
    setShowGroupModal(true);
  };

  const toggleExpand = (cohortId) => {
    setExpandedCohort(expandedCohort === cohortId ? null : cohortId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading cohorts...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Group Management</h2>
          <p className="text-sm text-slate-500">Manage cohorts and student groups</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* ─── FILTER TOGGLE BUTTON ─── */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(searchTerm || statusFilter !== 'all' || semesterFilter) && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {[searchTerm, statusFilter !== 'all', semesterFilter].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setEditingCohort(null);
              setCohortFormData({ cohort_name: '', cohort_code: '', start_year: '' });
              setShowCohortModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Cohort
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Auto-refresh every 30s
        </span>
        <span className="text-slate-300">|</span>
        <span>{filteredCohorts.length} cohorts</span>
      </div>

      {/* ─── FILTERS SECTION ─── (Togglable) */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search cohorts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* Semester Filter */}
            <div>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Semesters</option>
                {semesterOptions.map(sem => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters */}
            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Active filters display */}
          {(searchTerm || statusFilter !== 'all' || semesterFilter) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Active filters:</span>
              {searchTerm && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="hover:text-blue-900">×</button>
                </span>
              )}
              {semesterFilter && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  Semester: {semesterFilter}
                  <button onClick={() => setSemesterFilter('')} className="hover:text-blue-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── COHORT MODAL (Add/Edit) ─── */}
      {showCohortModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingCohort ? 'Edit Cohort' : 'Add New Cohort'}
              </h3>
              <button
                onClick={() => {
                  setShowCohortModal(false);
                  setEditingCohort(null);
                  setCohortFormData({ cohort_name: '', cohort_code: '', start_year: '' });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCohortSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cohort Name</label>
                <input
                  type="text"
                  placeholder="e.g., 2020/2021"
                  value={cohortFormData.cohort_name}
                  onChange={(e) => setCohortFormData({...cohortFormData, cohort_name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cohort Code</label>
                <input
                  type="text"
                  placeholder="e.g., C2020"
                  value={cohortFormData.cohort_code}
                  onChange={(e) => setCohortFormData({...cohortFormData, cohort_code: e.target.value.toUpperCase()})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Year</label>
                <input
                  type="number"
                  placeholder="2020"
                  value={cohortFormData.start_year}
                  onChange={(e) => setCohortFormData({...cohortFormData, start_year: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                  {editingCohort ? 'Update Cohort' : 'Add Cohort'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCohortModal(false);
                    setEditingCohort(null);
                    setCohortFormData({ cohort_name: '', cohort_code: '', start_year: '' });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── GROUP MODAL (Add/Edit) ─── */}
      {showGroupModal && selectedCohortForGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingGroup ? 'Edit Group' : 'Add Group to'} {selectedCohortForGroup.cohort_name}
              </h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setSelectedCohortForGroup(null);
                  setEditingGroup(null);
                  setGroupFormData({
                    group_name: '',
                    group_code: '',
                    semester: '',
                    academic_year: '',
                    capacity: ''
                  });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g., A"
                  value={groupFormData.group_name}
                  onChange={(e) => setGroupFormData({...groupFormData, group_name: e.target.value.toUpperCase()})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group Code</label>
                <input
                  type="text"
                  placeholder="e.g., 2020/A"
                  value={groupFormData.group_code}
                  onChange={(e) => setGroupFormData({...groupFormData, group_code: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                  <select
                    value={groupFormData.semester}
                    onChange={(e) => setGroupFormData({...groupFormData, semester: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    {semesterOptions.map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    placeholder="e.g., 2025/2026"
                    value={groupFormData.academic_year}
                    onChange={(e) => setGroupFormData({...groupFormData, academic_year: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                <input
                  type="number"
                  placeholder="Max students"
                  value={groupFormData.capacity}
                  onChange={(e) => setGroupFormData({...groupFormData, capacity: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                  {editingGroup ? 'Update Group' : 'Add Group'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setSelectedCohortForGroup(null);
                    setEditingGroup(null);
                    setGroupFormData({
                      group_name: '',
                      group_code: '',
                      semester: '',
                      academic_year: '',
                      capacity: ''
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── COHORT LIST ─── */}
      <div className="space-y-4">
        {filteredCohorts.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-slate-400">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No cohorts found</p>
            <p className="text-sm">
              {cohorts.length > 0 ? 'Try adjusting your filters' : 'Click "Add Cohort" to create your first cohort'}
            </p>
          </div>
        ) : (
          filteredCohorts.map((cohort) => {
            const isExpanded = expandedCohort === cohort.cohort_id;
            
            return (
              <div key={cohort.cohort_id} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Cohort Header - Click to expand */}
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(cohort.cohort_id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-semibold text-slate-800 text-lg">
                        {cohort.cohort_name}
                      </span>
                      <span className="text-sm text-slate-400 ml-2">{cohort.cohort_code}</span>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {cohort.student_count || 0} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {cohort.group_count || 0} groups
                        </span>
                        {cohort.start_year && (
                          <span>📅 {cohort.start_year}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {cohort.is_active ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Active
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Inactive
                      </span>
                    )}
                    {/* Edit Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCohort(cohort);
                      }}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      title="Edit cohort"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Toggle Active/Inactive Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCohortStatus(cohort.cohort_id, cohort.is_active);
                      }}
                      className={cohort.is_active ? 'text-green-500 hover:text-green-700 p-1' : 'text-red-500 hover:text-red-700 p-1'}
                      title={cohort.is_active ? 'Deactivate cohort' : 'Activate cohort'}
                    >
                      {cohort.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete cohort "${cohort.cohort_name}" and all its groups?`)) return;
                        handleDeleteCohort(cohort.cohort_id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content - Groups List */}
                {isExpanded && (
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-medium text-slate-700">Groups</h4>
                      <button
                        onClick={() => {
                          setEditingGroup(null);
                          setSelectedCohortForGroup(cohort);
                          setGroupFormData({
                            group_name: '',
                            group_code: '',
                            semester: '',
                            academic_year: '',
                            capacity: ''
                          });
                          setShowGroupModal(true);
                        }}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Group
                      </button>
                    </div>

                    {cohort.groups && cohort.groups.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cohort.groups.map((group) => (
                          <div key={group.group_id} className="bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-slate-800">{group.group_name}</span>
                                <span className="text-xs text-slate-400 ml-2">{group.group_code}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Group Status Badge (small) */}
                                {group.is_active ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Active"></span>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Inactive"></span>
                                )}
                                {/* Edit Group Button */}
                                <button
                                  onClick={() => openEditGroup(group, cohort)}
                                  className="text-blue-400 hover:text-blue-600"
                                  title="Edit group"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {/* Toggle Group Status */}
                                <button
                                  onClick={() => handleToggleGroupStatus(group.group_id, group.is_active)}
                                  className={group.is_active ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}
                                  title={group.is_active ? 'Deactivate group' : 'Activate group'}
                                >
                                  {group.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                                </button>
                                {/* Delete Group Button */}
                                <button
                                  onClick={() => handleDeleteGroup(group.group_id, group.group_name)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {group.student_count || 0} students
                              </span>
                              {group.semester && (
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                  Sem {group.semester}
                                </span>
                              )}
                              {group.academic_year && (
                                <span className="text-slate-400">{group.academic_year}</span>
                              )}
                              {group.capacity && (
                                <span>📊 {group.capacity}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 py-4 text-center">No groups in this cohort yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
        <div className="flex items-start gap-2">
          <GraduationCap className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">How Cohorts & Groups Work</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-blue-600">
              <li><strong>Cohort:</strong> Academic year group (e.g., 2020/2021)</li>
              <li><strong>Group:</strong> A specific class section within a cohort (e.g., A, B, C)</li>
              <li><strong>Active/Inactive:</strong> Deactivate cohorts and groups when students graduate</li>
              <li>Groups are carried through all semesters until graduation</li>
              <li>Students can switch groups, but normally stay in their assigned group</li>
              <li>Students can attend classes from other groups (flexible attendance)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Groups;