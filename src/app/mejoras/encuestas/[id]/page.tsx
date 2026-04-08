'use client';

import { SurveyResponseForm } from '@/components/surveys/SurveyResponseForm';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { Survey, SurveyResponseData } from '@/types/surveys';
import {
  SURVEY_STATUS_COLORS,
  SURVEY_STATUS_LABELS,
  SURVEY_TYPE_LABELS,
} from '@/types/surveys';
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Star,
  Users,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResponseForm, setShowResponseForm] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSurvey();
      loadResponses();
    }
  }, [params.id]);

  const loadSurvey = async () => {
    try {
      const response = await fetch(`/api/surveys/${params.id}`);
      const result = await response.json();

      if (result.success) {
        setSurvey(result.data);
      }
    } catch (error) {
      console.error('Error loading survey:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async () => {
    try {
      const response = await fetch(`/api/surveys/${params.id}/responses`);
      const result = await response.json();

      if (result.success) {
        setResponses(result.data || []);
      }
    } catch (error) {
      console.error('Error loading responses:', error);
    }
  };

  const handleResponseSuccess = () => {
    setShowResponseForm(false);
    loadSurvey();
    loadResponses();
  };

  const handleComplete = async () => {
    if (!confirm('¿Marcar esta encuesta como completada?')) return;

    try {
      const response = await fetch(`/api/surveys/${params.id}`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (result.success) {
        loadSurvey();
      }
    } catch (error) {
      console.error('Error completing survey:', error);
      alert('Error al completar la encuesta');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Encuesta no encontrada
          </h2>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </div>
    );
  }

  if (showResponseForm) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <button
          onClick={() => setShowResponseForm(false)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
          <p className="text-gray-600 mt-1">
            Por favor responde las siguientes preguntas
          </p>
        </div>

        <SurveyResponseForm
          surveyId={survey.id}
          questions={survey.questions}
          onSuccess={handleResponseSuccess}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-mono text-gray-500">
                  {survey.surveyNumber}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {SURVEY_TYPE_LABELS[survey.type]}
                </span>
                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded">
                  {survey.channel === 'publico' ? 'Canal publico' : 'Canal interno'}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${SURVEY_STATUS_COLORS[survey.status]}`}
                >
                  {SURVEY_STATUS_LABELS[survey.status]}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {survey.title}
              </h1>
            </div>

            <div className="flex gap-2">
              {survey.status === 'active' && (
                <>
                  <Button onClick={() => setShowResponseForm(true)}>
                    Responder Encuesta
                  </Button>
                  <Button variant="outline" onClick={handleComplete}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Users className="w-4 h-4" />
                <span>Respuestas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {survey.responseCount}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Star className="w-4 h-4" />
                <span>Promedio</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {survey.averageRating ? survey.averageRating.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <FileText className="w-4 h-4" />
                <span>Preguntas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {survey.questions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preguntas
            </h2>
            <div className="space-y-4">
              {survey.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="pb-4 border-b last:border-b-0"
                >
                  <p className="font-medium text-gray-900">
                    {index + 1}. {question.question}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {question.type === 'scale' && 'Escala'}
                      {question.type === 'yes_no' && 'Sí/No'}
                      {question.type === 'text' && 'Texto'}
                      {question.type === 'multiple_choice' && 'Opción Múltiple'}
                    </span>
                    {question.required && (
                      <span className="text-red-500 text-xs">Requerida</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responses */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Respuestas Recientes
            </h2>
            {responses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No hay respuestas aún
              </p>
            ) : (
              <div className="space-y-3">
                {responses.slice(0, 10).map(response => (
                  <div
                    key={response.id}
                    className="pb-3 border-b last:border-b-0"
                  >
                    <p className="font-medium text-gray-900 text-sm">
                      {response.clientName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(
                        response.createdAt instanceof Date
                          ? response.createdAt
                          : new Date(response.createdAt)
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
