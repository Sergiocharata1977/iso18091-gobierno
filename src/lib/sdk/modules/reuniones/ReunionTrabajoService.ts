import { BaseService } from '../../base/BaseService';
import { ReunionTrabajo, CreateReunionTrabajoInput } from './types';
import { CreateReunionTrabajoSchema } from './validations';

export class ReunionTrabajoService extends BaseService<ReunionTrabajo> {
  protected collectionName = 'reunionesTrabajo';
  protected schema = CreateReunionTrabajoSchema;
}
