import { CONVERSATIONAL_FORMS } from '@/config/conversational-forms';
import { FormSessionState } from '@/types/forms';
import Groq from 'groq-sdk';

// Lazy init
let groqInstance: Groq | null = null;
const getGroqClient = () => {
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key_for_build',
    });
  }
  return groqInstance;
};

export class ConversationalFormService {
  /**
   * Initialize a new form session
   */
  static initializeForm(formId: string): FormSessionState {
    const formDef = CONVERSATIONAL_FORMS[formId];
    if (!formDef) {
      throw new Error(`Form definition not found for id: ${formId}`);
    }

    return {
      formId,
      formType: formId, // Use formId as formType
      currentFieldId: formDef.fields[0].id,
      collectedData: {},
      isComplete: false,
      step: 0,
      totalSteps: formDef.fields.length,
    };
  }

  /**
   * Get the next question to ask the user
   */
  static getNextQuestion(state: FormSessionState): string {
    const formDef = CONVERSATIONAL_FORMS[state.formId];
    if (!formDef || !state.currentFieldId) return '';

    const field = formDef.fields.find(f => f.id === state.currentFieldId);
    if (!field) return '';

    // Custom logic could go here to vary the phrasing
    return `${field.label}${field.description ? ` (${field.description})` : ''}`;
  }

  /**
   * Process user response to extract data for the current field
   */
  static async processResponse(
    state: FormSessionState,
    userResponse: string
  ): Promise<{
    updatedState: FormSessionState;
    extractedValue: any;
    isValid: boolean;
    feedback?: string;
  }> {
    const formDef = CONVERSATIONAL_FORMS[state.formId];
    const currentField = formDef.fields.find(
      f => f.id === state.currentFieldId
    );

    if (!currentField) {
      return { updatedState: state, extractedValue: null, isValid: false };
    }

    // Use AI to extract and validate the value
    try {
      const extractionResult =
        await ConversationalFormService.extractValueWithAI(
          currentField,
          userResponse
        );

      if (extractionResult.isValid) {
        // Update state
        const nextFieldIndex =
          formDef.fields.findIndex(f => f.id === currentField.id) + 1;
        const nextField = formDef.fields[nextFieldIndex];

        const newState: FormSessionState = {
          ...state,
          collectedData: {
            ...state.collectedData,
            [currentField.id]: extractionResult.value,
          },
          currentFieldId: nextField ? nextField.id : null,
          step: state.step + 1,
          isComplete: !nextField,
        };

        return {
          updatedState: newState,
          extractedValue: extractionResult.value,
          isValid: true,
        };
      } else {
        return {
          updatedState: state,
          extractedValue: null,
          isValid: false,
          feedback: extractionResult.feedback,
        };
      }
    } catch (error) {
      console.error('Error processing form response:', error);
      return {
        updatedState: state,
        extractedValue: null,
        isValid: false,
        feedback:
          'Hubo un error procesando tu respuesta. Por favor intenta de nuevo.',
      };
    }
  }

  static async extractValueWithAI(
    field: any,
    userResponse: string
  ): Promise<{ value: any; isValid: boolean; feedback?: string }> {
    const prompt = `
      Actúa como un extractor de datos para un formulario.
      Campo a extraer: "${field.label}"
      Tipo: ${field.type}
      Descripción: ${field.description || 'N/A'}
      Opciones válidas: ${field.options ? field.options.join(', ') : 'N/A'}
      
      Respuesta del usuario: "${userResponse}"
      
      Tu tarea:
      1. Analiza si la respuesta del usuario contiene información válida para este campo.
      2. Si es válida, extrae el valor en el formato correcto.
      3. Si NO es válida o falta información, explica por qué en "feedback".
      
      Responde SOLO con un JSON con este formato:
      {
        "isValid": boolean,
        "value": any (el valor extraído, null si no es válido),
        "feedback": string (mensaje para el usuario si no es válido, o null si es válido)
      }
    `;

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content);
  }
}
