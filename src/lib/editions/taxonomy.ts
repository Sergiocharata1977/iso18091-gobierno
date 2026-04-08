import {
  EDITION_TAXONOMY,
  type Edition,
  type EditionTaxonomy,
} from '@/types/edition';

export function getEditionTaxonomy(
  edition: Edition | undefined | null
): EditionTaxonomy {
  if (edition === 'government') {
    return EDITION_TAXONOMY.government;
  }

  return EDITION_TAXONOMY.enterprise;
}
