import { DepartmentService } from '@/services/rrhh/DepartmentService';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { PositionService } from '@/services/rrhh/PositionService';
import { TrainingService } from '@/services/rrhh/TrainingService';

export async function seedRRHHData() {
  try {
    console.log('🌱 Iniciando seed de datos RRHH...');

    // Constant Organization ID for seeding
    const ORGANIZATION_ID = 'seed-organization-id';

    // Seed Departments
    console.log('📁 Creando departamentos...');
    const departments = [
      {
        nombre: 'Operaciones',
        descripcion:
          'Departamento responsable de las operaciones diarias de la empresa',
        is_active: true,
      },
      {
        nombre: 'Ventas',
        descripcion: 'Departamento de ventas y comercialización de productos',
        is_active: true,
      },
      {
        nombre: 'Recursos Humanos',
        descripcion: 'Gestión del talento humano y administración de personal',
        is_active: true,
      },
      {
        nombre: 'Tecnología',
        descripcion: 'Departamento de sistemas y desarrollo tecnológico',
        is_active: true,
      },
      {
        nombre: 'Finanzas',
        descripcion: 'Gestión financiera y contabilidad de la empresa',
        is_active: true,
      },
      {
        nombre: 'Marketing',
        descripcion: 'Estrategias de marketing y comunicación',
        is_active: true,
      },
      {
        nombre: 'Calidad',
        descripcion: 'Control de calidad y procesos ISO 9001',
        is_active: true,
      },
      {
        nombre: 'Logística',
        descripcion: 'Gestión de inventarios y distribución',
        is_active: true,
      },
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      const created = await DepartmentService.create(dept, ORGANIZATION_ID);
      createdDepartments.push(created);
      console.log(`✅ Departamento creado: ${created.nombre}`);
    }

    // Seed Positions
    console.log('👔 Creando puestos...');
    const positions = [
      {
        nombre: 'Analista de Operaciones',
        descripcion_responsabilidades:
          'Análisis de procesos operativos y generación de reportes de eficiencia',
        departamento_id: createdDepartments[0].id,
        requisitos_experiencia: '2-3 años en análisis de procesos',
        requisitos_formacion: 'Licenciatura en Administración o Ingeniería',
      },
      {
        nombre: 'Supervisor de Operaciones',
        descripcion_responsabilidades:
          'Supervisión de equipos de trabajo y control de calidad operativa',
        departamento_id: createdDepartments[0].id,
        requisitos_experiencia: '4-5 años en supervisión de equipos',
        requisitos_formacion:
          'Licenciatura en Administración o Ingeniería Industrial',
      },
      {
        nombre: 'Gerente de Operaciones',
        descripcion_responsabilidades:
          'Gestión estratégica del departamento y optimización de procesos',
        departamento_id: createdDepartments[0].id,
        requisitos_experiencia: '6+ años en gestión operativa',
        requisitos_formacion: 'MBA o Licenciatura en Administración',
      },
      {
        nombre: 'Ejecutivo de Ventas',
        descripcion_responsabilidades:
          'Desarrollo de ventas, atención al cliente y seguimiento de oportunidades',
        departamento_id: createdDepartments[1].id,
        requisitos_experiencia: '1-2 años en ventas',
        requisitos_formacion:
          'Licenciatura en Marketing, Administración o afín',
      },
      {
        nombre: 'Supervisor de Ventas',
        descripcion_responsabilidades:
          'Liderazgo del equipo de ventas y desarrollo de estrategias comerciales',
        departamento_id: createdDepartments[1].id,
        requisitos_experiencia:
          '3-4 años en ventas con experiencia en liderazgo',
        requisitos_formacion: 'Licenciatura en Marketing o Administración',
      },
      {
        nombre: 'Asistente de RRHH',
        descripcion_responsabilidades:
          'Apoyo administrativo en gestión de personal y procesos de RRHH',
        departamento_id: createdDepartments[2].id,
        requisitos_experiencia: '1-2 años en administración',
        requisitos_formacion: 'Técnico en RRHH o Licenciatura en Psicología',
      },
      {
        nombre: 'Analista de Sistemas',
        descripcion_responsabilidades:
          'Desarrollo y mantenimiento de sistemas informáticos',
        departamento_id: createdDepartments[3].id,
        requisitos_experiencia: '2-3 años en desarrollo de software',
        requisitos_formacion:
          'Licenciatura en Sistemas o Ingeniería en Software',
      },
      {
        nombre: 'Contador',
        descripcion_responsabilidades:
          'Gestión contable y financiera de la empresa',
        departamento_id: createdDepartments[4].id,
        requisitos_experiencia: '2-3 años en contabilidad',
        requisitos_formacion: 'Licenciatura en Contabilidad o Contador Público',
      },
      {
        nombre: 'Especialista en Marketing',
        descripcion_responsabilidades:
          'Desarrollo de estrategias de marketing y comunicación',
        departamento_id: createdDepartments[5].id,
        requisitos_experiencia: '2-3 años en marketing',
        requisitos_formacion: 'Licenciatura en Marketing o Comunicación',
      },
      {
        nombre: 'Auditor de Calidad',
        descripcion_responsabilidades:
          'Auditoría de procesos y control de calidad según ISO 9001',
        departamento_id: createdDepartments[6].id,
        requisitos_experiencia: '3-4 años en calidad',
        requisitos_formacion:
          'Licenciatura en Ingeniería o afín con certificación ISO',
      },
      {
        nombre: 'Coordinador de Logística',
        descripcion_responsabilidades:
          'Gestión de inventarios, distribución y cadena de suministro',
        departamento_id: createdDepartments[7].id,
        requisitos_experiencia: '2-3 años en logística',
        requisitos_formacion:
          'Licenciatura en Logística o Ingeniería Industrial',
      },
    ];

    const createdPositions = [];
    for (const pos of positions) {
      const created = await PositionService.create(pos, ORGANIZATION_ID);
      createdPositions.push(created);
      console.log(`✅ Puesto creado: ${(created as any).nombre}`);
    }

    // Seed Personnel
    console.log('👥 Creando personal...');
    const personnel = [
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
        estado: 'Activo' as const,
        meta_mensual: 100000,
        comision_porcentaje: 5,
        tipo_personal: 'ventas' as const,
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
        estado: 'Activo' as const,
        meta_mensual: 80000,
        comision_porcentaje: 3,
        tipo_personal: 'administrativo' as const,
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
        estado: 'Activo' as const,
        meta_mensual: 120000,
        comision_porcentaje: 7,
        supervisor_id: undefined,
        tipo_personal: 'supervisor' as const,
        zona_venta: 'Norte',
        puesto: 'Supervisor de Ventas',
        departamento: 'Ventas',
        supervisor: 'Roberto Sánchez',
        salario: '$520,000',
        certificaciones: ['Liderazgo', 'Gestión de Equipos'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Ana Gabriela',
        apellidos: 'Fernández Torres',
        email: 'ana.fernandez@empresa.com',
        telefono: '+5491123456792',
        documento_identidad: '44332211',
        fecha_nacimiento: new Date('1992-01-30'),
        nacionalidad: 'Argentina',
        direccion: 'Calle Lavalle 234, Buenos Aires',
        telefono_emergencia: '+5491198765435',
        fecha_contratacion: new Date('2021-08-15'),
        numero_legajo: 'EMP004',
        estado: 'Activo' as const,
        meta_mensual: 90000,
        comision_porcentaje: 4,
        tipo_personal: 'ventas' as const,
        zona_venta: 'Sur',
        puesto: 'Ejecutiva de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$420,000',
        certificaciones: ['Técnicas de Ventas', 'Atención al Cliente'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Roberto Miguel',
        apellidos: 'Sánchez Ruiz',
        email: 'roberto.sanchez@empresa.com',
        telefono: '+5491123456793',
        documento_identidad: '55667788',
        fecha_nacimiento: new Date('1978-09-12'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Santa Fe 3456, Buenos Aires',
        telefono_emergencia: '+5491198765436',
        fecha_contratacion: new Date('2015-12-01'),
        numero_legajo: 'EMP005',
        estado: 'Activo' as const,
        meta_mensual: 150000,
        comision_porcentaje: 8,
        tipo_personal: 'gerencial' as const,
        puesto: 'Gerente General',
        departamento: 'Dirección',
        supervisor: null,
        salario: '$750,000',
        certificaciones: ['MBA', 'Liderazgo Estratégico', 'ISO 9001'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Laura Beatriz',
        apellidos: 'García Morales',
        email: 'laura.garcia@empresa.com',
        telefono: '+5491123456794',
        documento_identidad: '99887766',
        fecha_nacimiento: new Date('1988-04-18'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Córdoba 789, Buenos Aires',
        telefono_emergencia: '+5491198765437',
        fecha_contratacion: new Date('2020-06-01'),
        numero_legajo: 'EMP006',
        estado: 'Activo' as const,
        meta_mensual: 95000,
        comision_porcentaje: 4,
        tipo_personal: 'ventas' as const,
        zona_venta: 'Oeste',
        puesto: 'Ejecutiva de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$410,000',
        certificaciones: ['Marketing Digital', 'CRM'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Diego Fernando',
        apellidos: 'López Herrera',
        email: 'diego.lopez@empresa.com',
        telefono: '+5491123456795',
        documento_identidad: '55443322',
        fecha_nacimiento: new Date('1983-12-05'),
        nacionalidad: 'Argentina',
        direccion: 'Calle San Martín 456, Buenos Aires',
        telefono_emergencia: '+5491198765438',
        fecha_contratacion: new Date('2017-09-15'),
        numero_legajo: 'EMP007',
        estado: 'Licencia' as const,
        meta_mensual: 0,
        comision_porcentaje: 0,
        tipo_personal: 'administrativo' as const,
        puesto: 'Analista de Sistemas',
        departamento: 'Tecnología',
        supervisor: 'Roberto Sánchez',
        salario: '$480,000',
        certificaciones: ['Desarrollo Web', 'Bases de Datos'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Patricia Alejandra',
        apellidos: 'Vargas Castro',
        email: 'patricia.vargas@empresa.com',
        telefono: '+5491123456796',
        documento_identidad: '33445566',
        fecha_nacimiento: new Date('1991-08-25'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Rivadavia 123, Buenos Aires',
        telefono_emergencia: '+5491198765439',
        fecha_contratacion: new Date('2022-02-10'),
        numero_legajo: 'EMP008',
        estado: 'Activo' as const,
        meta_mensual: 85000,
        comision_porcentaje: 3,
        tipo_personal: 'administrativo' as const,
        puesto: 'Contadora',
        departamento: 'Finanzas',
        supervisor: 'Roberto Sánchez',
        salario: '$460,000',
        certificaciones: ['Contabilidad', 'Excel Avanzado'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Miguel Ángel',
        apellidos: 'Torres Jiménez',
        email: 'miguel.torres@empresa.com',
        telefono: '+5491123456797',
        documento_identidad: '77889900',
        fecha_nacimiento: new Date('1987-11-12'),
        nacionalidad: 'Argentina',
        direccion: 'Calle Belgrano 321, Buenos Aires',
        telefono_emergencia: '+5491198765440',
        fecha_contratacion: new Date('2019-11-20'),
        numero_legajo: 'EMP009',
        estado: 'Activo' as const,
        meta_mensual: 110000,
        comision_porcentaje: 6,
        tipo_personal: 'ventas' as const,
        zona_venta: 'Este',
        puesto: 'Ejecutivo Senior de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$500,000',
        certificaciones: ['Ventas B2B', 'Negociación'],
        tiene_acceso_sistema: true,
      },
      {
        nombres: 'Sandra Marcela',
        apellidos: 'Ruiz Mendoza',
        email: 'sandra.ruiz@empresa.com',
        telefono: '+5491123456798',
        documento_identidad: '11223399',
        fecha_nacimiento: new Date('1986-06-30'),
        nacionalidad: 'Argentina',
        direccion: 'Av. Callao 654, Buenos Aires',
        telefono_emergencia: '+5491198765441',
        fecha_contratacion: new Date('2020-03-05'),
        numero_legajo: 'EMP010',
        estado: 'Activo' as const,
        meta_mensual: 105000,
        comision_porcentaje: 5,
        tipo_personal: 'ventas' as const,
        zona_venta: 'Centro',
        puesto: 'Ejecutiva de Ventas',
        departamento: 'Ventas',
        supervisor: 'Carlos Martínez',
        salario: '$480,000',
        certificaciones: ['Ventas Consultivas', 'CRM'],
        tiene_acceso_sistema: true,
      },
    ];

    const createdPersonnel = [];
    for (const person of personnel) {
      const created = await PersonnelService.create(person, ORGANIZATION_ID);
      createdPersonnel.push(created);
      console.log(
        `✅ Personal creado: ${created.nombres} ${created.apellidos}`
      );
    }

    // Update supervisors
    await PersonnelService.update(createdPersonnel[0].id!, {
      supervisor_id: createdPersonnel[2].id,
    });
    await PersonnelService.update(createdPersonnel[3].id!, {
      supervisor_id: createdPersonnel[2].id,
    });

    // Seed Trainings
    console.log('🎓 Creando capacitaciones...');
    const trainings = [
      {
        tema: 'Seguridad Laboral',
        descripcion:
          'Capacitación en normas de seguridad y prevención de riesgos',
        fecha_inicio: new Date('2025-02-01'),
        fecha_fin: new Date('2025-02-01'),
        horas: 8,
        modalidad: 'presencial' as const,
        proveedor: 'Instituto Nacional de Seguridad',
        costo: 50000,
        estado: 'completada' as const,
        participantes: [
          createdPersonnel[0].id!,
          createdPersonnel[1].id!,
          createdPersonnel[2].id!,
        ],
      },
      {
        tema: 'Ventas Consultivas',
        descripcion: 'Técnicas avanzadas de venta consultiva',
        fecha_inicio: new Date('2025-03-15'),
        fecha_fin: new Date('2025-03-16'),
        horas: 16,
        modalidad: 'virtual' as const,
        proveedor: 'Consultores ABC',
        costo: 75000,
        estado: 'en_curso' as const,
        participantes: [createdPersonnel[0].id!, createdPersonnel[3].id!],
      },
      {
        tema: 'Liderazgo Efectivo',
        descripcion: 'Desarrollo de habilidades de liderazgo',
        fecha_inicio: new Date('2025-04-10'),
        fecha_fin: new Date('2025-04-12'),
        horas: 24,
        modalidad: 'mixta' as const,
        proveedor: 'Centro de Desarrollo Profesional',
        costo: 120000,
        estado: 'planificada' as const,
        participantes: [createdPersonnel[2].id!, createdPersonnel[4].id!],
      },
    ];

    const createdTrainings = [];
    for (const training of trainings) {
      const created = await TrainingService.create(training, ORGANIZATION_ID);
      createdTrainings.push(created);
      console.log(`✅ Capacitación creada: ${created.tema}`);
    }

    // Seed Evaluations
    console.log('📊 Creando evaluaciones...');
    const evaluations = [
      {
        personnel_id: createdPersonnel[0].id!,
        periodo: '2025-Q1',
        fecha_evaluacion: new Date('2025-01-15'),
        evaluador_id: createdPersonnel[2].id!,
        competencias: [
          {
            nombre: 'Comunicación',
            puntaje: 4,
            comentario: 'Excelente capacidad de comunicación con clientes',
          },
          {
            nombre: 'Productividad',
            puntaje: 5,
            comentario: 'Supera consistentemente las metas establecidas',
          },
          {
            nombre: 'Trabajo en equipo',
            puntaje: 4,
            comentario: 'Buena colaboración con el equipo',
          },
        ],
        resultado_global: 'alto' as const,
        comentarios_generales:
          'Excelente desempeño general. Continuar con el buen trabajo.',
        plan_mejora: 'Desarrollar habilidades en gestión de tiempo.',
        estado: 'publicado' as const,
      },
      {
        personnel_id: createdPersonnel[1].id!,
        periodo: '2025-Q1',
        fecha_evaluacion: new Date('2025-01-20'),
        evaluador_id: createdPersonnel[4].id!,
        competencias: [
          {
            nombre: 'Organización',
            puntaje: 4,
            comentario: 'Muy organizada y eficiente',
          },
          {
            nombre: 'Atención al detalle',
            puntaje: 5,
            comentario: 'Excelente precisión en el trabajo',
          },
          {
            nombre: 'Adaptabilidad',
            puntaje: 3,
            comentario: 'Puede mejorar en la adaptación a cambios',
          },
        ],
        resultado_global: 'medio' as const,
        comentarios_generales:
          'Buen desempeño administrativo. Áreas de mejora identificadas.',
        plan_mejora: 'Participar en capacitación de gestión del cambio.',
        estado: 'publicado' as const,
      },
      {
        personnel_id: createdPersonnel[3].id!,
        periodo: '2025-Q1',
        fecha_evaluacion: new Date('2025-01-25'),
        evaluador_id: createdPersonnel[2].id!,
        competencias: [
          {
            nombre: 'Orientación al cliente',
            puntaje: 4,
            comentario: 'Buena atención al cliente',
          },
          {
            nombre: 'Técnicas de venta',
            puntaje: 3,
            comentario: 'Necesita mejorar técnicas de cierre',
          },
          {
            nombre: 'Conocimiento del producto',
            puntaje: 4,
            comentario: 'Buen conocimiento de la línea de productos',
          },
        ],
        resultado_global: 'medio' as const,
        comentarios_generales:
          'Buen potencial. Requiere desarrollo en técnicas de venta.',
        plan_mejora: 'Capacitación en técnicas avanzadas de venta.',
        estado: 'borrador' as const,
      },
    ];

    // TODO: Actualizar formato de evaluaciones al nuevo modelo con CompetenceEvaluation
    // for (const evaluation of evaluations) {
    //   const created = await EvaluationService.create(evaluation);
    //   console.log(`✅ Evaluación creada para: ${created.personnel_id} - Período: ${created.periodo}`);
    // }

    console.log('🎉 Seed de datos RRHH completado exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - ${createdDepartments.length} departamentos`);
    console.log(`   - ${createdPositions.length} puestos`);
    console.log(`   - ${createdPersonnel.length} empleados`);
    console.log(`   - ${createdTrainings.length} capacitaciones`);
    console.log(`   - ${evaluations.length} evaluaciones`);
  } catch (error) {
    console.error('❌ Error durante el seed de datos RRHH:', error);
    throw error;
  }
}
