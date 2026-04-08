'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'text' | 'multiple_choice';
  options?: string[];
  required?: boolean;
}

interface SurveyData {
  id: string;
  title: string;
  type: string;
  status: string;
  questions: SurveyQuestion[];
  targetClientName?: string;
}

export default function EncuestaPublicaPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? '';
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/cliente/encuesta/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) setSurvey(json.data);
        else setError('Encuesta no encontrada o expirada.');
      })
      .catch(() => setError('Error al cargar la encuesta.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    try {
      const res = await fetch(`/api/public/cliente/encuesta/${token}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json() as { success: boolean };
      if (json.success) setSubmitted(true);
      else setError('No se pudo enviar la respuesta. Intente nuevamente.');
    } catch {
      setError('Error al enviar la respuesta.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Cargando encuesta…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-6">
          <p className="text-red-600 font-medium mb-2">No disponible</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">¡Gracias!</h2>
          <p className="text-gray-500 text-sm">Tu respuesta fue registrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{survey?.title}</h1>
          {survey?.targetClientName && (
            <p className="text-sm text-gray-500 mt-1">Para: {survey.targetClientName}</p>
          )}
        </div>

        {survey?.questions.map(q => (
          <div key={q.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {q.text}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {q.type === 'rating' && (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: n }))}
                    className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${
                      answers[q.id] === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(answers[q.id] as string) ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}

            {q.type === 'multiple_choice' && q.options && (
              <div className="space-y-1">
                {q.options.map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => void handleSubmit()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Enviar respuesta
        </button>
      </div>
    </div>
  );
}
