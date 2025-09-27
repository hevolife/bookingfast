import React, { useState, useEffect } from 'react';
import { Mail, Plus, CreditCard as Edit, Trash2, Play, Pause, Settings, Eye, Send, Zap, Clock, User, Calendar, Euro } from 'lucide-react';
import { useEmailWorkflows } from '../../hooks/useEmailWorkflows';
import { useTeam } from '../../hooks/useTeam';
import { EmailWorkflow, EmailTemplate, WorkflowTrigger } from '../../types/email';
import { WorkflowList } from './WorkflowList';
import { WorkflowEditor } from './WorkflowEditor';
import { TemplateEditor } from './TemplateEditor';
import { WorkflowStats } from './WorkflowStats';
import { ManualEmailSender } from './ManualEmailSender';
import { PermissionGate } from '../UI/PermissionGate';

export function EmailWorkflowPage() {
  const { workflows, templates, loading, addWorkflow, updateWorkflow, deleteWorkflow, addTemplate, updateTemplate, deleteTemplate } = useEmailWorkflows();
  const { hasPermission } = useTeam();
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'stats' | 'send'>('workflows');
  const [editingWorkflow, setEditingWorkflow] = useState<EmailWorkflow | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);

  const handleNewWorkflow = () => {
    setEditingWorkflow(null);
    setShowWorkflowEditor(true);
  };

  const handleEditWorkflow = (workflow: EmailWorkflow) => {
    setEditingWorkflow(workflow);
    setShowWorkflowEditor(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setShowTemplateEditor(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowTemplateEditor(true);
  };

  const handleSaveWorkflow = async (workflowData: Partial<EmailWorkflow>) => {
    try {
      if (editingWorkflow) {
        await updateWorkflow(editingWorkflow.id, workflowData);
      } else {
        await addWorkflow(workflowData);
      }
      setShowWorkflowEditor(false);
      setEditingWorkflow(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du workflow:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleSaveTemplate = async (templateData: Partial<EmailTemplate>) => {
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, templateData);
      } else {
        await addTemplate(templateData);
      }
      setShowTemplateEditor(false);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du template:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteWorkflow = async (workflow: EmailWorkflow) => {
    if (window.confirm(`Supprimer le workflow "${workflow.name}" ?`)) {
      try {
        await deleteWorkflow(workflow.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (window.confirm(`Supprimer le template "${template.name}" ?`)) {
      try {
        await deleteTemplate(template.id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleToggleWorkflow = async (workflow: EmailWorkflow) => {
    try {
      await updateWorkflow(workflow.id, { active: !workflow.active });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 mobile-optimized">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Workflows Email
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Automatisez vos communications avec vos clients</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-lg w-full sm:w-fit overflow-x-auto">
          {[
            { key: 'workflows', label: 'Workflows', icon: Zap, count: workflows.length },
            { key: 'templates', label: 'Templates', icon: Mail, count: templates.length },
            { key: 'stats', label: 'Statistiques', icon: Settings, count: 0 },
            { key: 'send', label: 'Envoi', icon: Send, count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="text-left hidden sm:block">
                <div className="font-bold">{tab.label}</div>
                <div className="text-xs opacity-75 hidden lg:block">
                  {tab.key === 'workflows' ? 'Automatisation email' : 
                   tab.key === 'templates' ? 'Modèles d\'email' : 
                   tab.key === 'stats' ? 'Métriques et logs' : 
                   'Envoi manuel'}
                </div>
              </div>
              <div className="sm:hidden font-bold text-xs">{tab.label}</div>
              {tab.count > 0 && (
                <span className={`px-1 sm:px-2 py-1 rounded-full text-xs font-bold ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'workflows' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Workflows Actifs</h2>
            <PermissionGate permission="manage_emails">
              <button
                onClick={handleNewWorkflow}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Nouveau Workflow
              </button>
            </PermissionGate>
          </div>

          <WorkflowList
            workflows={workflows}
            templates={templates}
            onEdit={handleEditWorkflow}
            onDelete={handleDeleteWorkflow}
            onToggle={handleToggleWorkflow}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Templates Email</h2>
            <PermissionGate permission="manage_emails">
              <button
                onClick={handleNewTemplate}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                Nouveau Template
              </button>
            </PermissionGate>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fadeIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center text-white">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">{template.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">{template.description}</p>
                  </div>
                </div>

                <div className="mb-3 sm:mb-4">
                  <div className="text-xs sm:text-sm text-gray-600 mb-2">Sujet:</div>
                  <div className="bg-gray-50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm font-medium text-gray-800 line-clamp-2">
                    {template.subject}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <PermissionGate permission="manage_emails">
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="manage_emails">
                    <button
                      onClick={() => handleDeleteTemplate(template)}
                      className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </PermissionGate>
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Aucun template</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-6">Créez votre premier template d'email</p>
                <PermissionGate permission="manage_emails">
                  <button
                    onClick={handleNewTemplate}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                  >
                    Créer un template
                  </button>
                </PermissionGate>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <WorkflowStats workflows={workflows} />
      )}

      {activeTab === 'send' && (
        <ManualEmailSender />
      )}

      {/* Workflow Editor Modal */}
      {showWorkflowEditor && (
        <WorkflowEditor
          workflow={editingWorkflow}
          templates={templates}
          onSave={handleSaveWorkflow}
          onClose={() => {
            setShowWorkflowEditor(false);
            setEditingWorkflow(null);
          }}
        />
      )}

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowTemplateEditor(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}