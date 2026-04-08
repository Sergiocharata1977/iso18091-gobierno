'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type {
  MultipleChoiceQuestion,
  QuestionResponse,
  ScaleQuestion,
  SurveyQuestion,
  SurveyResponseFormData,
  TextQuestion,
  YesNoQuestion,
} from '@/types/surveys';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface SurveyResponseFormProps {
  surveyId: string;
  questions: SurveyQuestion[];
  onSuccess: () => void;
}

export function SurveyResponseForm({
  surveyId,
  questions,
  onSuccess,
}: SurveyResponseFormProps) {
  const [formData, setFormData] = useState<SurveyResponseFormData>({
    clientName: '',
    clientEmail: '',
    responses: [],
    comments: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleResponseChange = (
    questionId: string,
    response: QuestionResponse
  ) => {
    setFormData(prev => {
      const existingIndex = prev.responses.findIndex(
        r => r.questionId === questionId
      );

      if (existingIndex >= 0) {
        const newResponses = [...prev.responses];
        newResponses[existingIndex] = response;
        return { ...prev, responses: newResponses };
      } else {
        return { ...prev, responses: [...prev.responses, response] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required questions
    const requiredQuestions = questions.filter(q => q.required);
    const answeredQuestionIds = formData.responses.map(r => r.questionId);
    const missingRequired = requiredQuestions.filter(
      q => !answeredQuestionIds.includes(q.id)
    );

    if (missingRequired.length > 0) {
      alert('Por favor responde todas las preguntas requeridas');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/surveys/${surveyId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al guardar respuesta');
      }

      onSuccess();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert(
        error instanceof Error ? error.message : 'Error al enviar la respuesta'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: SurveyQuestion, index: number) => {
    switch (question.type) {
      case 'scale':
        return (
          <ScaleQuestionInput
            key={question.id}
            question={question as ScaleQuestion}
            index={index}
            onChange={response => handleResponseChange(question.id, response)}
          />
        );
      case 'yes_no':
        return (
          <YesNoQuestionInput
            key={question.id}
            question={question as YesNoQuestion}
            index={index}
            onChange={response => handleResponseChange(question.id, response)}
          />
        );
      case 'text':
        return (
          <TextQuestionInput
            key={question.id}
            question={question as TextQuestion}
            index={index}
            onChange={response => handleResponseChange(question.id, response)}
          />
        );
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestionInput
            key={question.id}
            question={question as MultipleChoiceQuestion}
            index={index}
            onChange={response => handleResponseChange(question.id, response)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Información del Cliente</h3>

        <div className="space-y-2">
          <Label htmlFor="clientName">
            Nombre <span className="text-red-500">*</span>
          </Label>
          <Input
            id="clientName"
            value={formData.clientName}
            onChange={e =>
              setFormData({ ...formData, clientName: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="clientEmail">Email (Opcional)</Label>
          <Input
            id="clientEmail"
            type="email"
            value={formData.clientEmail}
            onChange={e =>
              setFormData({ ...formData, clientEmail: e.target.value })
            }
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, index) => renderQuestion(question, index))}
      </div>

      {/* Comments */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-2">
        <Label htmlFor="comments">Comentarios Adicionales (Opcional)</Label>
        <Textarea
          id="comments"
          rows={4}
          value={formData.comments}
          onChange={e => setFormData({ ...formData, comments: e.target.value })}
          placeholder="¿Algo más que quieras compartir?"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Respuesta'
          )}
        </Button>
      </div>
    </form>
  );
}

// Scale Question Component
function ScaleQuestionInput({
  question,
  index,
  onChange,
}: {
  question: ScaleQuestion;
  index: number;
  onChange: (response: QuestionResponse) => void;
}) {
  const [value, setValue] = useState<number | null>(null);

  const handleChange = (newValue: number) => {
    setValue(newValue);
    onChange({
      questionId: question.id,
      type: 'scale',
      value: newValue,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Label className="text-base font-medium text-gray-900 mb-4 block">
        {index + 1}. {question.question}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="flex items-center justify-between gap-2">
        {question.minLabel && (
          <span className="text-sm text-gray-600 w-24">
            {question.minLabel}
          </span>
        )}
        <div className="flex gap-2 flex-1 justify-center">
          {Array.from(
            { length: question.maxValue - question.minValue + 1 },
            (_, i) => question.minValue + i
          ).map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleChange(num)}
              className={`w-12 h-12 rounded-full border-2 transition-all ${
                value === num
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        {question.maxLabel && (
          <span className="text-sm text-gray-600 w-24 text-right">
            {question.maxLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Yes/No Question Component
function YesNoQuestionInput({
  question,
  index,
  onChange,
}: {
  question: YesNoQuestion;
  index: number;
  onChange: (response: QuestionResponse) => void;
}) {
  const [value, setValue] = useState<boolean | null>(null);

  const handleChange = (newValue: boolean) => {
    setValue(newValue);
    onChange({
      questionId: question.id,
      type: 'yes_no',
      value: newValue,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Label className="text-base font-medium text-gray-900 mb-4 block">
        {index + 1}. {question.question}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => handleChange(true)}
          className={`flex-1 py-3 px-6 rounded-lg border-2 font-medium transition-all ${
            value === true
              ? 'bg-green-600 border-green-600 text-white'
              : 'border-gray-300 hover:border-green-400'
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => handleChange(false)}
          className={`flex-1 py-3 px-6 rounded-lg border-2 font-medium transition-all ${
            value === false
              ? 'bg-red-600 border-red-600 text-white'
              : 'border-gray-300 hover:border-red-400'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

// Text Question Component
function TextQuestionInput({
  question,
  index,
  onChange,
}: {
  question: TextQuestion;
  index: number;
  onChange: (response: QuestionResponse) => void;
}) {
  const [value, setValue] = useState('');

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onChange({
      questionId: question.id,
      type: 'text',
      value: newValue,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Label className="text-base font-medium text-gray-900 mb-4 block">
        {index + 1}. {question.question}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {question.multiline ? (
        <Textarea
          rows={4}
          value={value}
          onChange={e => handleChange(e.target.value)}
          required={question.required}
        />
      ) : (
        <Input
          value={value}
          onChange={e => handleChange(e.target.value)}
          required={question.required}
        />
      )}
    </div>
  );
}

// Multiple Choice Question Component
function MultipleChoiceQuestionInput({
  question,
  index,
  onChange,
}: {
  question: MultipleChoiceQuestion;
  index: number;
  onChange: (response: QuestionResponse) => void;
}) {
  const [value, setValue] = useState<string | string[]>(
    question.allowMultiple ? [] : ''
  );

  const handleSingleChange = (newValue: string) => {
    setValue(newValue);
    onChange({
      questionId: question.id,
      type: 'multiple_choice',
      value: newValue,
    });
  };

  const handleMultipleChange = (option: string, checked: boolean) => {
    const currentValues = value as string[];
    const newValues = checked
      ? [...currentValues, option]
      : currentValues.filter(v => v !== option);

    setValue(newValues);
    onChange({
      questionId: question.id,
      type: 'multiple_choice',
      value: newValues,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <Label className="text-base font-medium text-gray-900 mb-4 block">
        {index + 1}. {question.question}
        {question.required && <span className="text-red-500 ml-1">*</span>}
        {question.allowMultiple && (
          <span className="text-sm text-gray-500 ml-2">
            (Múltiple selección)
          </span>
        )}
      </Label>

      {question.allowMultiple ? (
        <div className="space-y-3">
          {question.options.map(option => (
            <div key={option} className="flex items-center gap-2">
              <Checkbox
                id={`${question.id}-${option}`}
                checked={(value as string[]).includes(option)}
                onCheckedChange={checked =>
                  handleMultipleChange(option, checked as boolean)
                }
              />
              <Label
                htmlFor={`${question.id}-${option}`}
                className="font-normal cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      ) : (
        <RadioGroup value={value as string} onValueChange={handleSingleChange}>
          {question.options.map(option => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
              <Label
                htmlFor={`${question.id}-${option}`}
                className="font-normal cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </div>
  );
}
