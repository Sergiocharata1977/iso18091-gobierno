'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConocimientosPage() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Base de Conocimientos
          </h1>
          <p className="text-gray-600 mt-2">
            Gestión y organización de la base de conocimientos del sistema ISO
            9001
          </p>
        </div>

        <Card className="bg-white shadow-md rounded-xl">
          <CardHeader>
            <CardTitle>Conocimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Esta sección está en desarrollo. Próximamente podrás gestionar la
              base de conocimientos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
