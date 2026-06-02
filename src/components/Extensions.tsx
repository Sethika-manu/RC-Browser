import React, { useState, useEffect } from 'react';
import { 
  Puzzle, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Code, 
  Paintbrush, 
  ArrowLeft,
  Save,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Extension, 
  getExtensions, 
  saveExtension, 
  deleteExtension, 
  syncExtensionsToRust 
} from "../lib/extensionsDb";

export const Extensions = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [editingExtension, setEditingExtension] = useState<Extension | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formJs, setFormJs] = useState("");
  const [formCss, setFormCss] = useState("");

  const loadExtensions = async () => {
    try {
      const list = await getExtensions();
      setExtensions(list);
    } catch (e) {
      console.error("Failed to load extensions:", e);
    }
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (ext: Extension) => {
    try {
      const updated: Extension = { ...ext, enabled: !ext.enabled };
      await saveExtension(updated);
      await syncExtensionsToRust();
      await loadExtensions();
      showToast(`${ext.name} ${updated.enabled ? 'Enabled' : 'Disabled'}`);
    } catch (e) {
      console.error("Failed to toggle extension:", e);
    }
  };

  const handleStartEdit = (ext: Extension) => {
    setEditingExtension(ext);
    setFormName(ext.name);
    setFormDesc(ext.description);
    setFormJs(ext.js);
    setFormCss(ext.css);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setEditingExtension(null);
    setFormName("");
    setFormDesc("");
    setFormJs(`// Custom Script\n(function() {\n  console.log("Hello from my extension!");\n})();`);
    setFormCss(`/* Custom styles */\nbody {\n  /* Your custom styles */\n}`);
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Extension Name is required.");
      return;
    }

    try {
      const id = editingExtension ? editingExtension.id : `custom-${Math.random().toString(36).substring(2, 11)}`;
      const enabled = editingExtension ? editingExtension.enabled : true;

      const newExt: Extension = {
        id,
        name: formName,
        description: formDesc,
        js: formJs,
        css: formCss,
        enabled
      };

      await saveExtension(newExt);
      await syncExtensionsToRust();
      await loadExtensions();
      
      setEditingExtension(null);
      setIsCreating(false);
      showToast(`Extension "${formName}" saved successfully!`);
    } catch (e) {
      console.error("Failed to save extension:", e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the extension "${name}"?`)) {
      return;
    }

    try {
      await deleteExtension(id);
      await syncExtensionsToRust();
      await loadExtensions();
      showToast(`Extension "${name}" deleted.`);
    } catch (e) {
      console.error("Failed to delete extension:", e);
    }
  };

  const isVerified = (id: string) => {
    return id === 'dark-mode' || id === 'pip-helper';
  };

  return (
    <div className="h-full bg-white dark:bg-[#050505] overflow-y-auto custom-scrollbar transition-colors duration-300">
      <div className="max-w-3xl mx-auto py-12 px-8">
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 right-6 z-[999999] bg-neutral-900 border border-neutral-800 text-neutral-100 text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2"
            >
              <Check size={14} className="text-emerald-500" />
              <span className="text-neutral-100">{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header/Title Row */}
        {!editingExtension && !isCreating ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
                <Puzzle size={24} className="text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">RC Extensions</h1>
                <p className="text-neutral-500 text-sm">Inject custom scripts & custom styling securely into any webview page.</p>
              </div>
            </div>
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-all shadow-md active:scale-[0.98] self-start"
            >
              <Plus size={16} /> Add Script
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingExtension(null); setIsCreating(false); }}
            className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white mb-8 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to Extension List
          </button>
        )}

        {/* Extensions List View */}
        {!editingExtension && !isCreating && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-900/30 border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-sm dark:shadow-none">
              {extensions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-400 dark:text-neutral-500">
                  <Puzzle size={40} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium">No extensions installed yet</p>
                </div>
              ) : (
                extensions.map((ext, idx) => (
                  <div
                    key={ext.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.01] ${
                      idx !== extensions.length - 1 ? 'border-b border-neutral-100 dark:border-white/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1 mr-4">
                      <div className="text-neutral-500 dark:text-neutral-400 p-2.5 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/5 mt-0.5">
                        <Code size={18} className={ext.enabled ? "text-accent" : ""} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{ext.name}</span>
                          {isVerified(ext.id) ? (
                            <span className="text-[10px] bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                              Verified Plugin
                            </span>
                          ) : (
                            <span className="text-[10px] bg-neutral-500/10 dark:bg-neutral-500/20 text-neutral-600 dark:text-neutral-400 font-bold px-2 py-0.5 rounded-full border border-neutral-500/20">
                              Custom Script
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500 max-w-lg leading-relaxed">{ext.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-4 sm:mt-0 justify-end self-end sm:self-center">
                      {/* Active/Inactive Power Switch */}
                      <button
                        onClick={() => handleToggle(ext)}
                        className={`w-10 h-6 rounded-full relative transition-colors duration-200 border border-transparent ${
                          ext.enabled ? 'bg-emerald-500 dark:bg-emerald-600/90' : 'bg-neutral-200 dark:bg-neutral-800'
                        }`}
                      >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          ext.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleStartEdit(ext)}
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg border border-transparent dark:hover:border-white/5 transition-all"
                        title="Edit Scripts"
                      >
                        <Edit2 size={15} />
                      </button>

                      {/* Delete Button */}
                      {!isVerified(ext.id) ? (
                        <button
                          onClick={() => handleDelete(ext.id, ext.name)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete Script"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <div className="w-9" /> // placeholder spacer matching trash button size
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Warning / Tip alert */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-amber-600 dark:text-amber-500">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold">Important note for Custom Scripts</div>
                <p className="leading-relaxed opacity-90">Custom scripts run locally in early stage WebViews. Always write secure code to avoid breaking webpage functionality.</p>
              </div>
            </div>
          </div>
        )}

        {/* Extensions Add/Edit Form View */}
        {(editingExtension || isCreating) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#090909] border border-neutral-200 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-neutral-100 dark:border-white/5">
              <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <Puzzle size={20} />
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isCreating ? "Create Custom Extension" : `Edit "${formName}"`}
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Script Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Extension Name</label>
                  <input
                    type="text"
                    required
                    disabled={!!(editingExtension && isVerified(editingExtension.id))}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent disabled:opacity-50 transition-all"
                    placeholder="My Custom Dark Mode, Ads Block, etc."
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Description</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    placeholder="Brief summary of what this script performs..."
                  />
                </div>
              </div>

              {/* JS Injection Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code size={14} className="text-accent" /> Javascript Code (Executes on Page Load)
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">self-executing IIFE recommended</span>
                </div>
                <textarea
                  value={formJs}
                  onChange={(e) => setFormJs(e.target.value)}
                  rows={10}
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0c] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 text-xs font-mono text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all leading-relaxed whitespace-pre"
                  placeholder={`(function() {\n  // your javascript code here\n})();`}
                />
              </div>

              {/* CSS Injection Styling */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Paintbrush size={14} className="text-pink-500" /> CSS Styling (Appended to Document)
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">raw css styling rules</span>
                </div>
                <textarea
                  value={formCss}
                  onChange={(e) => setFormCss(e.target.value)}
                  rows={8}
                  className="w-full bg-neutral-50 dark:bg-[#0c0c0c] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 text-xs font-mono text-neutral-800 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all leading-relaxed whitespace-pre"
                  placeholder={`body {\n  background: #000000 !important;\n}`}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 pt-4 border-t border-neutral-100 dark:border-white/5 justify-end">
                <button
                  type="button"
                  onClick={() => { setEditingExtension(null); setIsCreating(false); }}
                  className="px-5 py-3 rounded-xl text-sm font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-all shadow-md active:scale-[0.98]"
                >
                  <Save size={16} /> Save Script
                </button>
              </div>
            </form>
          </motion.div>
        )}

      </div>
    </div>
  );
};
