import { BaseService } from '../../base/BaseService';
import { AnalisisFODA, CreateAnalisisFODAInput } from './types';
import { CreateAnalisisFODASchema } from './validations';
import { z } from 'zod';

export class AnalisisFODAService extends BaseService<AnalisisFODA> {
  protected collectionName = 'analisisFODA';
  protected schema = CreateAnalisisFODASchema;
}
