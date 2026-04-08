// Tipos para el sistema documental

// Modulos disponibles en el sistema
export type DocModule =
  | 'mi-panel'
  | 'rrhh'
  | 'procesos'
  | 'documentos'
  | 'crm'
  | 'auditorias'
  | 'hallazgos'
  | 'acciones'
  | 'contabilidad'
  | 'onboarding'
  | 'iso-design'
  | 'iso-infra'
  | 'don-candido'
  | 'dealer'
  | 'ejecutivo'
  | 'noticias'
  | 'mensajes'
  | 'calendario'
  | 'puntos-norma'
  | 'agentes'
  | 'admin'
  | 'hse'
  | 'sgsi'
  | 'terminales'
  | 'revisiones'
  | 'registros'
  | 'app-cliente'
  | 'app-vendedor';

// Categoria del documento
export type DocCategory = 'usuario' | 'tecnico' | 'proceso';

// Metadatos de un documento
export interface DocMeta {
  title: string;
  slug: string;
  module: DocModule;
  screen: string;
  summary: string;
  roles: string[];
  tags: string[];
  relatedRoutes: string[];
  entity?: string;
  order: number;
  status: 'active' | 'draft' | 'deprecated';
  category: DocCategory;
  lastValidated: string;
}

// Documento completo (meta + contenido)
export interface Doc {
  meta: DocMeta;
  content: string;
}

// Mapeo de ruta a slugs de documentos
export interface DocRouteMapping {
  route: string;
  slugs: string[];
}

// Resultado de busqueda
export interface DocSearchResult {
  meta: DocMeta;
  matchType: 'title' | 'tag' | 'summary' | 'content';
  highlight?: string;
}
