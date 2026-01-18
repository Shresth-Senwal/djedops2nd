'use client';

import { useState } from 'react';
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '@/lib/workflow-templates';

interface TemplateLibraryProps {
  onSelectTemplate: (template: WorkflowTemplate) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredTemplates = WORKFLOW_TEMPLATES.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'all' && t.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monitoring': return '#39FF14';
      case 'trading': return '#FFD700';
      case 'security': return '#FF4444';
      case 'analytics': return '#00D4FF';
      default: return '#39FF14';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return { color: '#39FF14', text: 'BEGINNER' };
      case 'intermediate': return { color: '#FFD700', text: 'INTERMEDIATE' };
      case 'advanced': return { color: '#FF4444', text: 'ADVANCED' };
      default: return { color: '#39FF14', text: 'BEGINNER' };
    }
  };

  return (
    <div className="border-2 border-[#39FF14] bg-black p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-[#39FF14] font-mono mb-2">
            [WORKFLOW_TEMPLATES]
          </h3>
          <p className="text-neutral-400 text-sm font-mono">
            Pre-built workflows for common use cases - deploy in seconds
          </p>
        </div>
        <div className="text-sm text-neutral-500 font-mono">
          {filteredTemplates.length} templates
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-xs text-neutral-500 font-mono block mb-2">CATEGORY</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-black border border-neutral-700 px-3 py-2 text-sm font-mono text-white"
          >
            <option value="all">All Categories</option>
            <option value="monitoring">Monitoring</option>
            <option value="trading">Trading</option>
            <option value="security">Security</option>
            <option value="analytics">Analytics</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500 font-mono block mb-2">DIFFICULTY</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-black border border-neutral-700 px-3 py-2 text-sm font-mono text-white"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const categoryColor = getCategoryColor(template.category);
          const difficultyBadge = getDifficultyBadge(template.difficulty);

          return (
            <div
              key={template.id}
              className="border border-neutral-800 hover:border-[#39FF14] transition-colors p-4 group cursor-pointer"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4
                    className="font-bold font-mono mb-1 group-hover:text-[#39FF14] transition-colors"
                    style={{ color: categoryColor }}
                  >
                    {template.name}
                  </h4>
                  <p className="text-xs text-neutral-400 font-mono mb-3">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-xs px-2 py-1 border font-mono"
                  style={{
                    borderColor: categoryColor,
                    color: categoryColor,
                  }}
                >
                  {template.category.toUpperCase()}
                </span>
                <span
                  className="text-xs px-2 py-1 border font-mono"
                  style={{
                    borderColor: difficultyBadge.color,
                    color: difficultyBadge.color,
                  }}
                >
                  {difficultyBadge.text}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="text-neutral-500">
                  {template.workflow.nodes.length} nodes • {template.workflow.connections.length} connections
                </div>
                <div className="text-[#39FF14]">
                  ~{template.estimatedCost} WEIL
                </div>
              </div>

              {/* Hover Action */}
              <div className="mt-3 pt-3 border-t border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-full border border-[#39FF14] text-[#39FF14] py-2 text-xs font-mono hover:bg-[#39FF14] hover:text-black transition-colors">
                  [USE_TEMPLATE]
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <div className="text-neutral-500 font-mono text-sm">
            No templates match your filters
          </div>
        </div>
      )}
    </div>
  );
}
