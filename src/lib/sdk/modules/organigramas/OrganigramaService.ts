import { BaseService } from '../../base/BaseService';
import { Organigrama, CreateOrganigramaInput } from './types';
import { CreateOrganigramaSchema } from './validations';

export class OrganigramaService extends BaseService<Organigrama> {
  protected collectionName = 'organigramas';
  protected schema = CreateOrganigramaSchema;
}
