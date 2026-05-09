import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormViewer from '../components/FormViewer';
import { ArrowLeft } from 'lucide-react';

export default function DedicatedFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) return null;

  return (
    <div className="h-full overflow-y-auto scrollbar-hide flex justify-center p-4 pb-20 w-full">
      <div className="w-full max-w-4xl relative mt-4 min-h-screen">
        <button 
          onClick={() => navigate(-1)}
          className="absolute -top-10 left-0 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="mt-12 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <FormViewer 
            formId={id} 
            onCancel={() => navigate(-1)} 
            onComplete={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
}
