"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useI18n } from "@/context/I18nContext";

interface MonitorGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  displayOrder?: number;
  monitors: Array<{
    id: string;
    name: string;
    lastStatus?: number;
    active: boolean;
  }>;
}

export function MonitorGroupSettings() {
  const { t } = useI18n();
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MonitorGroup | null>(null);

  // 获取分组列表
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitor-groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('获取分组失败:', error);
      toast.error(t('monitorGroups.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // 删除分组
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(t('monitorGroups.deleteConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/monitor-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('monitorGroups.deleteSuccess'));
        fetchGroups();
      } else {
        const error = await response.json();
        toast.error(error.message || t('monitorGroups.deleteFailed'));
      }
    } catch (error) {
      console.error('删除分组失败:', error);
      toast.error(t('monitorGroups.deleteFailed'));
    }
  };

  // 创建分组对话框
  const CreateGroupDialog = ({ 
    isOpen, 
    onClose, 
    onSuccess,
    editingGroup = null
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSuccess: () => void;
    editingGroup?: MonitorGroup | null;
  }) => {
    const [groupName, setGroupName] = useState(editingGroup?.name || '');
    const [description, setDescription] = useState(editingGroup?.description || '');
    const [color, setColor] = useState(editingGroup?.color || '#6366F1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (editingGroup) {
        setGroupName(editingGroup.name);
        setDescription(editingGroup.description || '');
        setColor(editingGroup.color);
      } else {
        setGroupName('');
        setDescription('');
        setColor('#6366F1');
      }
    }, [editingGroup]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!groupName.trim()) {
        toast.error(t('monitorGroups.nameEmpty'));
        return;
      }

      try {
        setIsSubmitting(true);
        const url = editingGroup ? `/api/monitor-groups/${editingGroup.id}` : '/api/monitor-groups';
        const method = editingGroup ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: groupName.trim(),
            description: description.trim() || null,
            color: color,
          }),
        });

        if (response.ok) {
          toast.success(editingGroup ? t('monitorGroups.updateSuccess') : t('monitorGroups.createSuccess'));
          onSuccess();
          onClose();
        } else {
          const error = await response.json();
          toast.error(error.message || (editingGroup ? t('monitorGroups.updateFailed') : t('monitorGroups.createFailed')));
        }
      } catch (error) {
        console.error(editingGroup ? '更新分组失败:' : '创建分组失败:', error);
        toast.error(editingGroup ? t('monitorGroups.updateFailed') : t('monitorGroups.createFailed'));
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-primary/20 rounded-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-medium mb-4 text-primary">
            {editingGroup ? t('monitorGroups.editGroup') : t('monitorGroups.newGroup')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-foreground/80 font-medium mb-2">{t('monitorGroups.groupName')} *</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('monitorGroups.groupNamePlaceholder')}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-foreground/80 font-medium mb-2">{t('monitorGroups.description')}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('monitorGroups.descriptionPlaceholder')}
                rows={3}
                className="w-full px-4 py-2 rounded-lg dark:bg-dark-input bg-light-input border border-primary/20 focus:border-primary focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-foreground/80 font-medium mb-2">{t('monitorGroups.color')}</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded border border-primary/20"
                />
                <span className="text-sm text-foreground/60">{t('monitorGroups.colorHint')}</span>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !groupName.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('monitorGroups.saving') : (editingGroup ? t('monitorGroups.updateGroupBtn') : t('monitorGroups.createGroupBtn'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary">
          <i className="fas fa-spinner fa-spin mr-2"></i>
          {t('monitorGroups.loadingGroups')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-foreground">{t('monitorGroups.title')}</h3>
          <p className="text-sm text-foreground/60 mt-1">
            {t('monitorGroups.hint')}
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
        >
          <i className="fas fa-plus"></i>
          <span>{t('monitorGroups.createGroup')}</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <i className="fas fa-folder text-2xl text-primary"></i>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">{t('monitorGroups.noGroups')}</h3>
          <p className="text-foreground/60 mb-4">{t('monitorGroups.noGroupsHint')}</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('monitorGroups.createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="dark:bg-dark-card bg-light-card border border-primary/10 rounded-lg p-4 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  ></div>
                  <div>
                    <h4 className="font-medium text-foreground">{group.name}</h4>
                    {group.description && (
                      <p className="text-sm text-foreground/60">{group.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-foreground/50 bg-primary/10 px-2 py-1 rounded">
                    {t('monitorGroups.monitorCount', { n: group.monitors.length })}
                  </span>
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title={t('monitorGroups.editGroupTitle')}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title={t('monitorGroups.deleteGroupTitle')}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              
              {group.monitors.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-foreground/70">{t('monitorGroups.containedMonitors')}</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.monitors.map((monitor) => (
                      <div
                        key={monitor.id}
                        className="flex items-center space-x-2 p-2 bg-primary/5 rounded text-sm"
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          monitor.lastStatus === 1 ? 'bg-success' :
                          monitor.lastStatus === 0 ? 'bg-error' :
                          monitor.lastStatus === 2 ? 'bg-primary' :
                          'bg-foreground/50'
                        }`}></div>
                        <span className={`${!monitor.active ? 'opacity-50' : ''}`}>
                          {monitor.name}
                        </span>
                        {!monitor.active && (
                          <span className="text-xs text-foreground/50">{(' (' + t('status.paused') + ')')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateGroupDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={fetchGroups}
        editingGroup={null}
      />

      <CreateGroupDialog
        isOpen={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        onSuccess={() => {
          fetchGroups();
          setEditingGroup(null);
        }}
        editingGroup={editingGroup}
      />
    </div>
  );
} 