'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { requiresNpsScore } from '@/types/surveys';
import type {
  MultipleChoiceQuestion,
  QuestionResponse,
  ScaleQuestion,
  SurveyQuestion,
  SurveyType,
  TextQuestion,
  YesNoQuestion,
} from '@/types/surveys';
import { CheckCircle2, Loader2, MessageSquareHeart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type SurveyPayload = {
  id: string;
  title: string;
  type: SurveyType;
  status: string;
  questions: SurveyQuestion[];
  targetClientName?: string | null;
};

type SurveyResponsePayload = {
  success?: boolean;
  data?: SurveyPayload;
  error?: string;
};

function isResponseFilled(response: QuestionResponse | undefined) {
  if (!response) return false;
  if (response.type === 'yes_no') return typeof response.value === 'boolean';
  if (response.type === 'scale') return typeof response.value === 'number';
  if (response.type === 'text') return response.value.trim().length > 0;
  if (response.type === 'multiple_choice') {
    return Array.isArray(response.value)
      ? response.value.length > 0
      : response.value.trim().length > 0;
  }
  return false;
}

function getExperienceCopy(type: SurveyType) {
  if (type === 'ciudadana') {
    return {
      eyebrow: 'Participacion ciudadana',
      helper: 'Compartí tu opinión sobre servicios, consultas y prioridades públicas.',
      thanks:
        'Tu respuesta quedó registrada y pasa a formar parte de la escucha ciudadana.',
      commentsPlaceholder: 'Contanos tu propuesta, prioridad o comentario',
      npsTitle: '',
      npsHelper: '',
      submitLabel: 'Enviar participacion',
    };
  }

  return {
    eyebrow: 'Encuesta NPS',
    helper: 'Nos lleva menos de 2 minutos y nos ayuda a mejorar.',
    thanks:
      'Tu feedback ya quedó registrado. Nos ayuda a mejorar la experiencia de compra y servicio.',
    commentsPlaceholder: 'Contanos algo más sobre tu experiencia',
    npsTitle: '¿Con qué probabilidad nos recomendarías?',
    npsHelper: '0 = nada probable, 10 = totalmente probable',
    submitLabel: 'Enviar encuesta',
  };
}

export function PublicSurveyExperience({
  token,
  endpointBase,
}: {
  token: string;
  endpointBase: string;
}) {
  const [survey, setSurvey] = useState<SurveyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [comments, setComments] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});

  useEffect(() => {
    let cancelled = false;

    const loadSurvey = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${endpointBase}/${token}`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as SurveyResponsePayload;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || 'No se pudo cargar la encuesta');
        }

        if (!cancelled) {
          setSurvey(payload.data);
          setClientName(payload.data.targetClientName ?? '');
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No se pudo cargar la encuesta'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSurvey();

    return () => {
      cancelled = true;
    };
  }, [endpointBase, token]);

  const orderedQuestions = useMemo(
    () => [...(survey?.questions ?? [])].sort((a, b) => a.order - b.order),
    [survey?.questions]
  );

  const copy = getExperienceCopy(survey?.type ?? 'anual');
  const showNps = survey ? requiresNpsScore(survey.type) : true;

  const updateResponse = (questionId: string, response: QuestionResponse) => {
    setResponses(current => ({
      ...current,
      [questionId]: response,
    }));
  };

  const handleSubmit = async () => {
    if (!survey) return;

    if (!clientName.trim()) {
      setError(
        survey.type === 'ciudadana'
          ? 'Ingresá tu nombre para registrar la participación.'
          : 'Ingresá tu nombre para enviar la encuesta.'
      );
      return;
    }

    if (showNps && npsScore === null) {
      setError('Seleccioná un puntaje NPS del 0 al 10.');
      return;
    }

    const missingQuestion = orderedQuestions.find(
      question => question.required && !isResponseFilled(responses[question.id])
    );

    if (missingQuestion) {
      setError('Respondé todas las preguntas obligatorias antes de enviar.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`${endpointBase}/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim() || undefined,
          comments: comments.trim() || undefined,
          npsScore: showNps ? npsScore : undefined,
          externalToken: token,
          responses: orderedQuestions
            .map(question => responses[question.id])
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as SurveyResponsePayload;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'No se pudo enviar la encuesta');
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar la encuesta'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 via-white to-gray-50 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-gray-50 px-4 py-8">
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <Card className="overflow-hidden border-red-100 shadow-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Gracias por tu respuesta
                </h1>
                <p className="text-sm leading-6 text-gray-600">{copy.thanks}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-50 via-white to-gray-50 px-4">
        <Card className="w-full max-w-md border-red-200 shadow-sm">
          <CardContent className="space-y-3 p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900">Encuesta no disponible</h1>
            <p className="text-sm text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-gray-50 px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-red-100">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200">
              <MessageSquareHeart className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
                {copy.eyebrow}
              </p>
              <h1 className="text-2xl font-semibold text-gray-900">{survey.title}</h1>
              <p className="text-sm text-gray-600">{copy.helper}</p>
            </div>
          </div>
        </section>

        <Card className="border-red-100 shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Email (opcional)
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {showNps ? (
          <QuestionCard>
            <p className="text-base font-semibold text-gray-900">
              {copy.npsTitle} <span className="text-red-500">*</span>
            </p>
            <p className="mt-1 text-sm text-gray-500">{copy.npsHelper}</p>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {Array.from({ length: 11 }, (_, score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setNpsScore(score)}
                  className={`flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
                    npsScore === score
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-red-100 bg-red-50 text-red-700'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </QuestionCard>
        ) : null}

        {orderedQuestions.map((question, index) => (
          <QuestionRenderer
            key={question.id}
            question={question}
            index={index}
            value={responses[question.id]}
            onChange={response => updateResponse(question.id, response)}
          />
        ))}

        <Card className="border-red-100 shadow-sm">
          <CardContent className="space-y-2 p-4">
            <label className="text-sm font-medium text-gray-700">
              Comentarios adicionales
            </label>
            <Textarea
              rows={4}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder={copy.commentsPlaceholder}
            />
          </CardContent>
        </Card>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 rounded-2xl bg-red-600 text-base font-semibold hover:bg-red-700"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {copy.submitLabel}
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-red-100 shadow-sm">
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </Card>
  );
}

function QuestionRenderer({
  question,
  index,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  index: number;
  value?: QuestionResponse;
  onChange: (response: QuestionResponse) => void;
}) {
  return (
    <QuestionCard>
      <p className="text-base font-semibold text-gray-900">
        {index + 1}. {question.question}
        {question.required ? <span className="text-red-500"> *</span> : null}
      </p>

      {question.type === 'scale' ? (
        <ScaleQuestionInput
          question={question}
          value={value?.type === 'scale' ? value.value : undefined}
          onChange={onChange}
        />
      ) : null}

      {question.type === 'yes_no' ? (
        <YesNoQuestionInput
          question={question}
          value={value?.type === 'yes_no' ? value.value : undefined}
          onChange={onChange}
        />
      ) : null}

      {question.type === 'text' ? (
        <TextQuestionInput
          question={question}
          value={value?.type === 'text' ? value.value : ''}
          onChange={onChange}
        />
      ) : null}

      {question.type === 'multiple_choice' ? (
        <MultipleChoiceQuestionInput
          question={question}
          value={value?.type === 'multiple_choice' ? value.value : undefined}
          onChange={onChange}
        />
      ) : null}
    </QuestionCard>
  );
}

function ScaleQuestionInput({
  question,
  value,
  onChange,
}: {
  question: ScaleQuestion;
  value?: number;
  onChange: (response: QuestionResponse) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{question.minLabel ?? question.minValue}</span>
        <span>{question.maxLabel ?? question.maxValue}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from(
          { length: question.maxValue - question.minValue + 1 },
          (_, index) => question.minValue + index
        ).map(score => (
          <button
            key={score}
            type="button"
            onClick={() =>
              onChange({ questionId: question.id, type: 'scale', value: score })
            }
            className={`flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition ${
              value === score
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

function YesNoQuestionInput({
  question,
  value,
  onChange,
}: {
  question: YesNoQuestion;
  value?: boolean;
  onChange: (response: QuestionResponse) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() =>
          onChange({ questionId: question.id, type: 'yes_no', value: true })
        }
        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
          value === true
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-gray-200 bg-white text-gray-700'
        }`}
      >
        Sí
      </button>
      <button
        type="button"
        onClick={() =>
          onChange({ questionId: question.id, type: 'yes_no', value: false })
        }
        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
          value === false
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-gray-200 bg-white text-gray-700'
        }`}
      >
        No
      </button>
    </div>
  );
}

function TextQuestionInput({
  question,
  value,
  onChange,
}: {
  question: TextQuestion;
  value: string;
  onChange: (response: QuestionResponse) => void;
}) {
  if (question.multiline) {
    return (
      <Textarea
        rows={4}
        value={value}
        onChange={event =>
          onChange({
            questionId: question.id,
            type: 'text',
            value: event.target.value,
          })
        }
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={event =>
        onChange({
          questionId: question.id,
          type: 'text',
          value: event.target.value,
        })
      }
    />
  );
}

function MultipleChoiceQuestionInput({
  question,
  value,
  onChange,
}: {
  question: MultipleChoiceQuestion;
  value?: string | string[];
  onChange: (response: QuestionResponse) => void;
}) {
  const values = Array.isArray(value) ? value : [];
  const selected = typeof value === 'string' ? value : '';

  return (
    <div className="space-y-2">
      {question.options.map(option => {
        const active = question.allowMultiple
          ? values.includes(option)
          : selected === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => {
              if (question.allowMultiple) {
                const next = active
                  ? values.filter(item => item !== option)
                  : [...values, option];
                onChange({
                  questionId: question.id,
                  type: 'multiple_choice',
                  value: next,
                });
                return;
              }

              onChange({
                questionId: question.id,
                type: 'multiple_choice',
                value: option,
              });
            }}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
              active
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <span>{option}</span>
            <span className="text-xs">
              {question.allowMultiple ? (active ? 'Seleccionado' : 'Agregar') : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
