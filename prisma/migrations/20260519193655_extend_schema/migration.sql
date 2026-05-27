-- CreateTable
CREATE TABLE "Recinto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClinicalEquipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recintoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "levantamiento" TEXT NOT NULL DEFAULT 'No iniciado',
    "parametrizacion" TEXT NOT NULL DEFAULT 'No iniciado',
    "pruebas" TEXT NOT NULL DEFAULT 'No iniciado',
    "capacitacion" TEXT NOT NULL DEFAULT 'No iniciado',
    "validacion" TEXT NOT NULL DEFAULT 'No iniciado',
    "golive" TEXT NOT NULL DEFAULT 'No iniciado',
    "responsable" TEXT NOT NULL,
    "compromisoDate" TEXT,
    "observaciones" TEXT NOT NULL,
    "pendienteDe" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClinicalEquipment_recintoId_fkey" FOREIGN KEY ("recintoId") REFERENCES "Recinto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MasterUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "maxTasksLimit" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indexId" INTEGER NOT NULL,
    "fecha" TEXT NOT NULL,
    "recintoName" TEXT NOT NULL,
    "equipmentName" TEXT NOT NULL,
    "faseAfectada" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "impacto" TEXT NOT NULL DEFAULT 'Bajo',
    "responsable" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Abierto',
    "planDeAccion" TEXT NOT NULL,
    "fechaCierre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterUser_email_key" ON "MasterUser"("email");
