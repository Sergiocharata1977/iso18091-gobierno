import { BaseService } from '../../base/BaseService';
import { Flujograma, CreateFlujogramaInput } from './types';
import { CreateFlujogramaSchema } from './validations';

export class FlujogramaService extends BaseService<Flujograma> {
  protected collectionName = 'flujogramas';
  protected schema = CreateFlujogramaSchema;
}
