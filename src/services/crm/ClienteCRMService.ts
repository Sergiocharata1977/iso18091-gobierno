/**
 * ClienteCRMService
 * Servicio principal para gestión de clientes B2B
 */

import { db } from '@/firebase/config';
import type {
  ClienteCRM,
  CreateClienteCRMData,
  FiltrosClienteCRM,
  MoverClienteKanbanData,
  TipoCliente,
  UpdateClienteCRMData,
} from '@/types/crm';
import { TipoCliente as TipoClienteEnum } from '@/types/crm';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { KanbanService } from './KanbanService';

export class ClienteCRMService {
  private static readonly COLLECTION = 'clientes_crm';

  /**
   * Crea un nuevo cliente
   */
  static async create(
    data: CreateClienteCRMData,
    userId: string
  ): Promise<string> {
    try {
      const now = new Date().toISOString();

      // Obtener nombre del estado Kanban
      const estado = await KanbanService.getEstadoById(data.estado_kanban_id);

      if (!estado) {
        throw new Error('Estado Kanban no encontrado');
      }

      const clienteData: Omit<ClienteCRM, 'id'> = {
        razon_social: data.razon_social,
        nombre_comercial: data.nombre_comercial,
        cuit_cuil: data.cuit_cuil,
        tipo_cliente: data.tipo_cliente,
        estado_kanban_id: data.estado_kanban_id,
        estado_kanban_nombre: estado.nombre,
        historial_estados: [],
        email: data.email,
        telefono: data.telefono,
        direccion: data.direccion,
        localidad: data.localidad,
        provincia: data.provincia,
        codigo_postal: data.codigo_postal,
        responsable_id: data.responsable_id,
        monto_estimado_compra: data.monto_estimado_compra,
        probabilidad_conversion: data.probabilidad_conversion,
        fecha_cierre_estimada: data.fecha_cierre_estimada,
        productos_interes: data.productos_interes,
        total_compras_12m: 0,
        cantidad_compras_12m: 0,
        monto_total_compras_historico: 0,
        ultima_interaccion: now,
        notas: data.notas || '',
        created_at: now,
        updated_at: now,
        created_by: userId,
        isActive: true,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), clienteData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating cliente:', error);
      throw new Error('Failed to create cliente');
    }
  }

  /**
   * Obtiene un cliente por ID
   */
  static async getById(id: string): Promise<ClienteCRM | null> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as ClienteCRM;
    } catch (error) {
      console.error('Error getting cliente:', error);
      throw new Error('Failed to get cliente');
    }
  }

  /**
   * Obtiene todos los clientes con filtros
   */
  static async getAll(filtros?: FiltrosClienteCRM): Promise<ClienteCRM[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION),
        where('isActive', '==', true)
      );

      // Aplicar filtros
      if (filtros?.tipo_cliente) {
        q = query(q, where('tipo_cliente', '==', filtros.tipo_cliente));
      }
      if (filtros?.categoria_riesgo) {
        q = query(q, where('categoria_riesgo', '==', filtros.categoria_riesgo));
      }
      if (filtros?.estado_kanban_id) {
        q = query(q, where('estado_kanban_id', '==', filtros.estado_kanban_id));
      }
      if (filtros?.responsable_id) {
        q = query(q, where('responsable_id', '==', filtros.responsable_id));
      }

      // Ordenar por última interacción
      q = query(q, orderBy('ultima_interaccion', 'desc'));

      const snapshot = await getDocs(q);
      let clientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ClienteCRM[];

      // Filtrar por búsqueda (client-side)
      if (filtros?.search) {
        const searchTerm = filtros.search.toLowerCase();
        clientes = clientes.filter(
          c =>
            c.razon_social.toLowerCase().includes(searchTerm) ||
            c.nombre_comercial?.toLowerCase().includes(searchTerm) ||
            c.cuit_cuil.includes(searchTerm)
        );
      }

      return clientes;
    } catch (error) {
      console.error('Error getting clientes:', error);
      throw new Error('Failed to get clientes');
    }
  }

  /**
   * Actualiza un cliente
   */
  static async update(
    id: string,
    data: UpdateClienteCRMData,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);

      const updateData: Record<string, any> = {
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating cliente:', error);
      throw new Error('Failed to update cliente');
    }
  }

  /**
   * Mueve un cliente a un nuevo estado en el Kanban
   */
  static async moverEstado(data: MoverClienteKanbanData): Promise<void> {
    try {
      // 1. Obtener cliente actual
      const cliente = await this.getById(data.cliente_id);

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // 2. Validar movimiento
      const validacion = await KanbanService.validarMovimiento(
        cliente.estado_kanban_id,
        data.estado_nuevo_id
      );

      if (!validacion.valido) {
        throw new Error(validacion.mensaje || 'Movimiento no permitido');
      }

      // 3. Obtener nuevo estado
      const nuevoEstado = await KanbanService.getEstadoById(
        data.estado_nuevo_id
      );

      if (!nuevoEstado) {
        throw new Error('Estado nuevo no encontrado');
      }

      // 4. Crear registro de historial
      const historialItem = KanbanService.crearHistorialEstado(
        cliente.estado_kanban_id,
        cliente.estado_kanban_nombre,
        data.estado_nuevo_id,
        nuevoEstado.nombre,
        data.usuario_id,
        undefined,
        data.motivo
      );

      // 5. Actualizar cliente
      const docRef = doc(db, this.COLLECTION, data.cliente_id);
      await updateDoc(docRef, {
        estado_kanban_id: data.estado_nuevo_id,
        estado_kanban_nombre: nuevoEstado.nombre,
        historial_estados: [...cliente.historial_estados, historialItem],
        ultima_interaccion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error moviendo cliente:', error);
      throw new Error('Failed to mover cliente');
    }
  }

  /**
   * Clasifica automáticamente el tipo de cliente según historial de compras
   */
  static async clasificarAutomaticamente(
    clienteId: string
  ): Promise<TipoCliente> {
    try {
      const cliente = await this.getById(clienteId);

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      let nuevoTipo: TipoCliente;

      // Calcular días desde última compra
      const diasDesdeUltimaCompra = cliente.fecha_ultima_compra
        ? Math.floor(
            (new Date().getTime() -
              new Date(cliente.fecha_ultima_compra).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999999;

      // Aplicar criterios de clasificación
      if (cliente.cantidad_compras_12m === 0) {
        nuevoTipo = TipoClienteEnum.POSIBLE_CLIENTE;
      } else if (
        cliente.cantidad_compras_12m >= 3 &&
        diasDesdeUltimaCompra <= 365
      ) {
        nuevoTipo = TipoClienteEnum.CLIENTE_FRECUENTE;
      } else {
        nuevoTipo = TipoClienteEnum.CLIENTE_ANTIGUO;
      }

      // Actualizar si cambió
      if (nuevoTipo !== cliente.tipo_cliente) {
        await this.update(clienteId, { tipo_cliente: nuevoTipo }, 'system');
      }

      return nuevoTipo;
    } catch (error) {
      console.error('Error clasificando cliente:', error);
      throw new Error('Failed to clasificar cliente');
    }
  }

  /**
   * Registra una compra y actualiza estadísticas del cliente
   */
  static async registrarCompra(
    clienteId: string,
    monto: number,
    fecha: string
  ): Promise<void> {
    try {
      const cliente = await this.getById(clienteId);

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const fechaCompra = new Date(fecha);
      const hace12Meses = new Date();
      hace12Meses.setMonth(hace12Meses.getMonth() - 12);

      // Actualizar estadísticas
      const updateData: Partial<ClienteCRM> = {
        fecha_ultima_compra: fecha,
        monto_total_compras_historico:
          cliente.monto_total_compras_historico + monto,
        ultima_interaccion: new Date().toISOString(),
      };

      // Si es la primera compra
      if (!cliente.fecha_primera_compra) {
        updateData.fecha_primera_compra = fecha;
      }

      // Actualizar contadores de 12 meses (esto es simplificado)
      if (fechaCompra >= hace12Meses) {
        updateData.total_compras_12m = cliente.total_compras_12m + monto;
        updateData.cantidad_compras_12m = cliente.cantidad_compras_12m + 1;
      }

      await this.update(clienteId, updateData, 'system');

      // Reclasificar automáticamente
      await this.clasificarAutomaticamente(clienteId);
    } catch (error) {
      console.error('Error registrando compra:', error);
      throw new Error('Failed to registrar compra');
    }
  }

  /**
   * Elimina un cliente (soft delete)
   */
  static async delete(id: string, userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, id);
      await updateDoc(docRef, {
        isActive: false,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting cliente:', error);
      throw new Error('Failed to delete cliente');
    }
  }

  /**
   * Obtiene clientes por estado Kanban
   */
  static async getByEstado(estadoId: string): Promise<ClienteCRM[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('estado_kanban_id', '==', estadoId),
        where('isActive', '==', true),
        orderBy('ultima_interaccion', 'desc')
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ClienteCRM[];
    } catch (error) {
      console.error('Error getting clientes by estado:', error);
      throw new Error('Failed to get clientes by estado');
    }
  }

  /**
   * Obtiene clientes sin contacto reciente
   */
  static async getClientesSinContacto(dias: number): Promise<ClienteCRM[]> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);

      const q = query(
        collection(db, this.COLLECTION),
        where('tipo_cliente', '==', TipoClienteEnum.POSIBLE_CLIENTE),
        where('isActive', '==', true),
        where('ultima_interaccion', '<', fechaLimite.toISOString())
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ClienteCRM[];
    } catch (error) {
      console.error('Error getting clientes sin contacto:', error);
      throw new Error('Failed to get clientes sin contacto');
    }
  }
}
