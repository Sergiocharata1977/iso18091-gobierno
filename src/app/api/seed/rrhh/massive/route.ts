import {
  isSeedExecutionBlockedInProduction,
  logSeedExecution,
  SEED_ALLOWED_ROLES,
} from '@/lib/api/seedSecurity';
import { withAuth } from '@/lib/api/withAuth';
import { DepartmentService } from '@/services/rrhh/DepartmentService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { PositionService } from '@/services/rrhh/PositionService';
import { NextResponse } from 'next/server';

// Forzar ruta dinámica - no ejecutar durante build
export const dynamic = 'force-dynamic';

async function postInternal() {
  try {
    console.log('🚀 Iniciando creación masiva de datos...');

    // Constant Organization ID for seeding
    const ORGANIZATION_ID = 'seed-organization-id';

    // Datos masivos de departamentos
    const massiveDepartments = [
      {
        nombre: 'Operaciones',
        descripcion: 'Gestión de operaciones diarias',
        is_active: true,
      },
      {
        nombre: 'Ventas',
        descripcion: 'Departamento comercial',
        is_active: true,
      },
      { nombre: 'RRHH', descripcion: 'Recursos Humanos', is_active: true },
      { nombre: 'Tecnología', descripcion: 'Sistemas e IT', is_active: true },
      {
        nombre: 'Finanzas',
        descripcion: 'Gestión financiera',
        is_active: true,
      },
      {
        nombre: 'Marketing',
        descripcion: 'Estrategias de marketing',
        is_active: true,
      },
      {
        nombre: 'Calidad',
        descripcion: 'Control de calidad ISO 9001',
        is_active: true,
      },
      {
        nombre: 'Logística',
        descripcion: 'Inventarios y distribución',
        is_active: true,
      },
      {
        nombre: 'Atención al Cliente',
        descripcion: 'Soporte y servicio',
        is_active: true,
      },
      { nombre: 'Desarrollo', descripcion: 'I+D y proyectos', is_active: true },
    ];

    // Datos masivos de personal
    const massivePersonnel = [
      {
        nombres: 'Juan Carlos',
        apellidos: 'González Pérez',
        email: 'juan.gonzalez@empresa.com',
        telefono: '+5491123456789',
        documento_identidad: '12345678',
        fecha_nacimiento: new Date('1985-03-15'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Corrientes 1234, Buenos Aires',
        telefono_emergencia: '+5491198765432',
        fecha_contratacion: new Date('2020-01-15'),
        numero_legajo: 'EMP001',
        estado: 'Activo',
        meta_mensual: 100000,
        comision_porcentaje: 5,
        tipo_personal: 'ventas',
        zona_venta: 'Centro',
        puesto: 'Ejecutivo de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$450,000',
        certificaciones: ['Ventas Consultivas', 'CRM Avanzado'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'María Elena',
        apellidos: 'Rodríguez Silva',
        email: 'maria.rodriguez@empresa.com',
        telefono: '+5491123456790',
        documento_identidad: '87654321',
        fecha_nacimiento: new Date('1990-07-22'),
        nacionalidad: 'Argentina',
        direccion: 'Calle Florida 567, Buenos Aires',
        telefono_emergencia: '+5491198765433',
        fecha_contratacion: new Date('2019-05-10'),
        numero_legajo: 'EMP002',
        estado: 'Activo',
        meta_mensual: 80000,
        comision_porcentaje: 3,
        tipo_personal: 'administrativo',
        puesto: 'Asistente Administrativo',
        departamento: 'Recursos Humanos',
        supervisor: 'Roberto Sánchez',
        salario: '$380,000',
        certificaciones: ['Gestión de Personal', 'ISO 9001'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Carlos Alberto',
        apellidos: 'Martínez López',
        email: 'carlos.martinez@empresa.com',
        telefono: '+5491123456791',
        documento_identidad: '11223344',
        fecha_nacimiento: new Date('1982-11-08'),
        nacionalidad: 'Argentina',
        direccion: 'Av. 9 de Julio 890, Buenos Aires',
        telefono_emergencia: '+5491198765434',
        fecha_contratacion: new Date('2018-03-20'),
        numero_legajo: 'EMP003',
        estado: 'Activo',
        meta_mensual: 120000,
        comision_porcentaje: 7,
        tipo_personal: 'supervisor',
        zona_venta: 'Norte',
        puesto: 'Supervisor de Ventas',
        departamento: 'Ventas',
        supervisor: 'Roberto Sánchez',
        salario: '$520,000',
        certificaciones: ['Liderazgo', 'Gestión de Equipos'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Ana Patricia',
        apellidos: 'Fernández García',
        email: 'ana.fernandez@empresa.com',
        telefono: '+5491123456792',
        documento_identidad: '55667788',
        fecha_nacimiento: new Date('1988-12-03'),
        nacionalidad: 'Argentina',
        direccion: 'Calle San Martín 456, Buenos Aires',
        telefono_emergencia: '+5491198765435',
        fecha_contratacion: new Date('2021-08-15'),
        numero_legajo: 'EMP004',
        estado: 'Activo',
        meta_mensual: 90000,
        comision_porcentaje: 4,
        tipo_personal: 'ventas',
        zona_venta: 'Sur',
        puesto: 'Ejecutiva de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$420,000',
        certificaciones: ['Ventas B2B', 'Negociación'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Roberto Luis',
        apellidos: 'Sánchez Morales',
        email: 'roberto.sanchez@empresa.com',
        telefono: '+5491123456793',
        documento_identidad: '99887766',
        fecha_nacimiento: new Date('1975-06-18'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Santa Fe 789, Buenos Aires',
        telefono_emergencia: '+5491198765436',
        fecha_contratacion: new Date('2015-02-10'),
        numero_legajo: 'EMP005',
        estado: 'Activo',
        meta_mensual: 150000,
        comision_porcentaje: 8,
        tipo_personal: 'gerencial',
        puesto: 'Gerente de Ventas',
        departamento: 'Ventas',
        supervisor: 'CEO',
        salario: '$650,000',
        certificaciones: ['Gestión Estratégica', 'Liderazgo Avanzado'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Laura Beatriz',
        apellidos: 'Torres Jiménez',
        email: 'laura.torres@empresa.com',
        telefono: '+5491123456794',
        documento_identidad: '33445566',
        fecha_nacimiento: new Date('1992-04-25'),
        nacionalidad: 'Argentina',
        direccion: 'Calle Rivadavia 321, Buenos Aires',
        telefono_emergencia: '+5491198765437',
        fecha_contratacion: new Date('2022-01-20'),
        numero_legajo: 'EMP006',
        estado: 'Activo',
        meta_mensual: 75000,
        comision_porcentaje: 2,
        tipo_personal: 'administrativo',
        puesto: 'Asistente de Operaciones',
        departamento: 'Operaciones',
        supervisor: 'Miguel Ángel',
        salario: '$350,000',
        certificaciones: ['Gestión de Procesos', 'Excel Avanzado'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Miguel Ángel',
        apellidos: 'Herrera Castro',
        email: 'miguel.herrera@empresa.com',
        telefono: '+5491123456795',
        documento_identidad: '77889900',
        fecha_nacimiento: new Date('1980-09-12'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Córdoba 654, Buenos Aires',
        telefono_emergencia: '+5491198765438',
        fecha_contratacion: new Date('2017-11-05'),
        numero_legajo: 'EMP007',
        estado: 'Activo',
        meta_mensual: 110000,
        comision_porcentaje: 6,
        tipo_personal: 'supervisor',
        puesto: 'Supervisor de Operaciones',
        departamento: 'Operaciones',
        supervisor: 'CEO',
        salario: '$480,000',
        certificaciones: ['Gestión de Calidad', 'ISO 9001'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Sofia Alejandra',
        apellidos: 'Vargas Ruiz',
        email: 'sofia.vargas@empresa.com',
        telefono: '+5491123456796',
        documento_identidad: '11223399',
        fecha_nacimiento: new Date('1995-01-30'),
        nacionalidad: 'Argentina',
        direccion: 'Calle Belgrano 987, Buenos Aires',
        telefono_emergencia: '+5491198765439',
        fecha_contratacion: new Date('2023-03-10'),
        numero_legajo: 'EMP008',
        estado: 'Licencia',
        meta_mensual: 85000,
        comision_porcentaje: 3,
        tipo_personal: 'ventas',
        zona_venta: 'Oeste',
        puesto: 'Ejecutiva de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$400,000',
        certificaciones: ['Ventas Digitales', 'CRM'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Diego Fernando',
        apellidos: 'Mendoza López',
        email: 'diego.mendoza@empresa.com',
        telefono: '+5491123456797',
        documento_identidad: '44556677',
        fecha_nacimiento: new Date('1987-08-14'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Libertador 147, Buenos Aires',
        telefono_emergencia: '+5491198765440',
        fecha_contratacion: new Date('2020-06-01'),
        numero_legajo: 'EMP009',
        estado: 'Activo',
        meta_mensual: 95000,
        comision_porcentaje: 4,
        tipo_personal: 'administrativo',
        puesto: 'Analista de Sistemas',
        departamento: 'Tecnología',
        supervisor: 'Patricia Elena',
        salario: '$450,000',
        certificaciones: ['Desarrollo Web', 'Base de Datos'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Patricia Elena',
        apellidos: 'Castro Morales',
        email: 'patricia.castro@empresa.com',
        telefono: '+5491123456798',
        documento_identidad: '88990011',
        fecha_nacimiento: new Date('1983-11-07'),
        nacionalidad: 'Argentina',
        direccion: 'Calle Reconquista 258, Buenos Aires',
        telefono_emergencia: '+5491198765441',
        fecha_contratacion: new Date('2016-04-15'),
        numero_legajo: 'EMP010',
        estado: 'Activo',
        meta_mensual: 130000,
        comision_porcentaje: 7,
        tipo_personal: 'gerencial',
        puesto: 'Gerente de Tecnología',
        departamento: 'Tecnología',
        supervisor: 'CEO',
        salario: '$600,000',
        certificaciones: ['Arquitectura de Sistemas', 'Gestión de Proyectos'],
        tiene_acceso_sistema: true,
      },
    ];

    // Datos masivos de puestos
    const massivePositions = [
      {
        nombre: 'Analista de Operaciones',
        descripcion_responsabilidades:
          'Análisis de procesos operativos y generación de reportes de eficiencia',
        requisitos_experiencia: '2-3 años en análisis de procesos',
        requisitos_formacion: 'Licenciatura en Administración o Ingeniería',
      },
      {
        nombre: 'Supervisor de Operaciones',
        descripcion_responsabilidades:
          'Supervisión de equipos de trabajo y control de calidad operativa',
        requisitos_experiencia: '4-5 años en supervisión de equipos',
        requisitos_formacion:
          'Licenciatura en Administración o Ingeniería Industrial',
      },
      {
        nombre: 'Ejecutivo de Ventas',
        descripcion_responsabilidades:
          'Desarrollo de ventas, atención al cliente y seguimiento de oportunidades',
        requisitos_experiencia: '1-2 años en ventas',
        requisitos_formacion:
          'Licenciatura en Marketing, Administración o afín',
      },
      {
        nombre: 'Supervisor de Ventas',
        descripcion_responsabilidades:
          'Liderazgo de equipo comercial y cumplimiento de metas',
        requisitos_experiencia:
          '3-4 años en ventas con experiencia en liderazgo',
        requisitos_formacion:
          'Licenciatura en Marketing, Administración o afín',
      },
      {
        nombre: 'Gerente de Ventas',
        descripcion_responsabilidades:
          'Estrategia comercial, gestión de equipos y desarrollo de mercado',
        requisitos_experiencia: '5+ años en ventas con experiencia gerencial',
        requisitos_formacion:
          'Licenciatura en Marketing, Administración o afín',
      },
      {
        nombre: 'Asistente Administrativo',
        descripcion_responsabilidades:
          'Soporte administrativo, gestión de documentos y atención al personal',
        requisitos_experiencia: '1-2 años en tareas administrativas',
        requisitos_formacion: 'Secundario completo, preferiblemente terciario',
      },
      {
        nombre: 'Analista de Sistemas',
        descripcion_responsabilidades:
          'Desarrollo de aplicaciones, mantenimiento de sistemas y soporte técnico',
        requisitos_experiencia: '2-3 años en desarrollo de software',
        requisitos_formacion: 'Licenciatura en Sistemas, Informática o afín',
      },
      {
        nombre: 'Gerente de Tecnología',
        descripcion_responsabilidades:
          'Estrategia tecnológica, gestión de proyectos IT y liderazgo de equipos',
        requisitos_experiencia:
          '5+ años en tecnología con experiencia gerencial',
        requisitos_formacion: 'Licenciatura en Sistemas, Informática o afín',
      },
      {
        nombre: 'Especialista en Calidad',
        descripcion_responsabilidades:
          'Implementación de procesos ISO 9001, auditorías internas y mejora continua',
        requisitos_experiencia: '3-4 años en gestión de calidad',
        requisitos_formacion:
          'Licenciatura en Ingeniería, Administración o afín',
      },
      {
        nombre: 'Coordinador de Logística',
        descripcion_responsabilidades:
          'Gestión de inventarios, planificación de distribución y control de stock',
        requisitos_experiencia: '2-3 años en logística o cadena de suministro',
        requisitos_formacion:
          'Licenciatura en Logística, Administración o afín',
      },
      {
        nombre: 'Analista Financiero',
        descripcion_responsabilidades:
          'Análisis financiero, presupuestos y reportes contables',
        requisitos_experiencia: '2-3 años en finanzas o contabilidad',
        requisitos_formacion:
          'Licenciatura en Contabilidad, Administración o afín',
      },
    ];

    // Crear departamentos
    console.log('📁 Creando departamentos masivos...');
    const departmentIds = [];
    for (const dept of massiveDepartments) {
      const department = await DepartmentService.create(dept, ORGANIZATION_ID);
      departmentIds.push(department.id);
      console.log(`✅ Departamento creado: ${dept.nombre}`);
    }

    // Crear personal
    console.log('👥 Creando personal masivo...');
    for (const person of massivePersonnel) {
      const personData = {
        ...person,
        estado: person.estado as 'Activo' | 'Inactivo' | 'Licencia',
        tipo_personal: person.tipo_personal as
          | 'administrativo'
          | 'ventas'
          | 'técnico'
          | 'supervisor'
          | 'gerencial',
      };
      await PersonnelService.create(personData, ORGANIZATION_ID);
      console.log(`✅ Personal creado: ${person.nombres} ${person.apellidos}`);
    }

    // Crear puestos
    console.log('👔 Creando puestos masivos...');
    for (const pos of massivePositions) {
      await PositionService.create(pos, ORGANIZATION_ID);
      console.log(`✅ Puesto creado: ${pos.nombre}`);
    }

    console.log('🎉 Creación masiva completada!');

    return NextResponse.json({
      success: true,
      message: 'Datos masivos creados exitosamente',
      created: {
        departments: massiveDepartments.length,
        personnel: massivePersonnel.length,
        positions: massivePositions.length,
      },
    });
  } catch (error) {
    console.error('❌ Error en creación masiva:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error en creación masiva',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(
  async (request, _context, auth) => {
    if (isSeedExecutionBlockedInProduction()) {
      await logSeedExecution({
        request,
        auth,
        route: '/api/seed/rrhh/massive',
        method: 'POST',
        status: 'blocked',
      });
      return NextResponse.json(
        { success: false, error: 'Endpoint de seed bloqueado en produccion' },
        { status: 403 }
      );
    }

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/rrhh/massive',
      method: 'POST',
      status: 'attempt',
    });

    const response = await postInternal();

    await logSeedExecution({
      request,
      auth,
      route: '/api/seed/rrhh/massive',
      method: 'POST',
      status: response.ok ? 'success' : 'error',
      details: { status: response.status },
    });

    return response;
  },
  { roles: SEED_ALLOWED_ROLES }
);
