import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useAudit } from '../hooks/useAudit';
import { AuditInfoForm } from '../components/audit/AuditInfoForm';
import { AuditCategories } from '../components/audit/AuditCategories';
import { AuditNotes } from '../components/audit/AuditNotes';
import { AuditImageChecklist } from '../components/audit/AuditImageChecklist';
import { AuditHistoryModal } from '../components/audit/AuditHistoryModal';
import { checklistImages } from '../constants/auditCategories';

const Audit = () => {
  const navigate = useNavigate();
  
  // Usar el hook personalizado para manejar toda la lógica de auditoría
  const {
    // Estados
    categories,
    tiendas,
    usuariosTienda,
    error,
    isSaving,
    auditInfoSaved,
    currentStep,
    auditInfo,
    extraNotes,
    uploadedChecklistImages,
    existingAudits,
    showAuditHistoryModal,
    setShowAuditHistoryModal,
    showSuccessMessage,
    setShowSuccessMessage,
    
    // Handlers
    handleAuditInfoChange,
    handleExtraNotesChange,
    handleChecklistImageChange,
    handleCalificacionChange,
    handleNovedadChange,
    handleSelectAudit,
    handleCreateNew,
    handleAuditInfoSave,
    handleFinalSave,
    
    // Setters
    setCurrentStep,
    
    // Utilidades de cálculo
    getSubcategoriaTotal,
    getCategoriaPromedio,
    getCalificacionTotalTienda
  } = useAudit();

  // Efecto para manejar la redirección después del mensaje de éxito
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        navigate('/statistics'); // Redirigir a la página de estadísticas
      }, 3000); // Esperar 3 segundos antes de redirigir

      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage, navigate]);

  return (
    <div className="p-6 mt-10 max-w-4xl mx-auto">
      {/* Modal de historial de auditorías */}
      <AuditHistoryModal
        isOpen={showAuditHistoryModal}
        audits={existingAudits}
        onSelectAudit={handleSelectAudit}
        onCreateNew={handleCreateNew}
        onClose={() => setShowAuditHistoryModal(false)}
      />

      {/* Modal de éxito */}
      {showSuccessMessage && (
        <Modal
          title="¡Auditoría Guardada Exitosamente!"
          isOpen={showSuccessMessage}
          onClose={() => setShowSuccessMessage(false)}
        >
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¡Auditoría completada!
            </h3>
            <p className="text-gray-600 mb-4">
              La auditoría se ha guardado correctamente con todas las categorías, items y fotos.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Serás redirigido a estadísticas automáticamente en unos segundos...
            </p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => {
                  setShowSuccessMessage(false);
                  navigate('/statistics');
                }}
                variant="primary"
              >
                Ver Estadísticas
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessMessage(false);
                  navigate('/audit');
                }}
                variant="secondary"
              >
                Nueva Auditoría
              </Button>
              <Button
                onClick={() => setShowSuccessMessage(false)}
                variant="secondary"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <h1 className="text-2xl font-bold mb-6">Auditoría de Tienda</h1>
      
      {/* Mensajes de error y estado */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isSaving && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">Guardando auditoría...</span>
        </div>
      )}

      {/* Formulario inicial de auditoría */}
      {!auditInfoSaved ? (
        <AuditInfoForm
          auditInfo={auditInfo}
          tiendas={tiendas}
          usuariosTienda={usuariosTienda}
          userEmail="Usuario actual"
          isSaving={isSaving}
          onAuditInfoChange={handleAuditInfoChange}
          onSubmit={handleAuditInfoSave}
        />
      ) : (
        <>
          {/* Navegación de pasos */}
          <div className="flex gap-2 mb-6">
            <Button 
              variant={currentStep === 1 ? 'primary' : 'secondary'}
              onClick={() => setCurrentStep(1)}
            >
              Auditoría
            </Button>
            <Button 
              variant={currentStep === 2 ? 'primary' : 'secondary'}
              onClick={() => setCurrentStep(2)}
            >
              Notas y conclusiones
            </Button>
            <Button 
              variant={currentStep === 3 ? 'primary' : 'secondary'}
              onClick={() => setCurrentStep(3)}
            >
              Checklist de imágenes
            </Button>
          </div>

          {/* Paso 1: Auditoría */}
          {currentStep === 1 && (
            <>
              <div className="mb-4">
                <span className="font-semibold text-lg">Calificación total de la tienda: </span>
                <span className="text-2xl font-bold text-primary-600">
                  {getCalificacionTotalTienda().toFixed(2)} / 100
                </span>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4 mb-6">
                <h2 className="text-md font-bold text-primary-700 mb-2">Datos de la auditoría</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="font-semibold">Auditor:</span> Usuario actual</div>
                  <div>
                    <span className="font-semibold">Tienda:</span> {tiendas.find(t => t.id_tienda.toString() === auditInfo.id_tienda)?.nombre || ''}
                  </div>
                  <div><span className="font-semibold">Fecha:</span> {auditInfo.fecha}</div>
                  <div><span className="font-semibold">Responsable:</span> {auditInfo.quienes_reciben}</div>
                </div>
              </div>

              <AuditCategories
                categories={categories}
                onCalificacionChange={handleCalificacionChange}
                onNovedadChange={handleNovedadChange}
                getSubcategoriaTotal={getSubcategoriaTotal}
                getCategoriaPromedio={getCategoriaPromedio}
              />
            </>
          )}

          {/* Paso 2: Notas y conclusiones */}
          {currentStep === 2 && (
            <AuditNotes
              extraNotes={extraNotes}
              onExtraNotesChange={handleExtraNotesChange}
            />
          )}

          {/* Paso 3: Checklist de imágenes */}
          {currentStep === 3 && (
            <AuditImageChecklist
              checklistImages={checklistImages}
              uploadedImages={uploadedChecklistImages}
              onImageChange={handleChecklistImageChange}
            />
          )}

          {/* Botones de navegación y guardado */}
          <div className="flex justify-between mt-6">
            {currentStep > 1 && (
              <Button
                onClick={() => setCurrentStep(currentStep - 1)}
                variant="secondary"
              >
                Anterior
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                variant="primary"
                className="ml-auto"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleFinalSave}
                variant="primary"
                className="ml-auto"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Finalizar y guardar auditoría'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Audit;
