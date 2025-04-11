import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";
import Button from "../../ui/button/Button.tsx";
import { useAxiosPrivate } from "../../../hooks/useAxiosPrivate.ts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Patient } from "../../../types/medicalTypes.ts";
import { useState } from "react";
import Loader from "../../ui/Loader.tsx";
import { Modal } from "../../ui/modal";
import { useModal } from "../../../hooks/useModal.ts";
import Alert from "../../ui/alert/Alert.tsx";
import { ApiError } from "../../../types/types.ts";
import {Link} from "react-router";

export default function PatientTableOne({ searchTerm, itemsPerPage }: { searchTerm: string; itemsPerPage: number }) {
    const axiosPrivate = useAxiosPrivate();
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { isOpen, openModal, closeModal } = useModal();

    // Récupérer les patients depuis l’API (non archivés uniquement)
    const fetchPatients = async (): Promise<Patient[]> => {
        const response = await axiosPrivate.get("/patients", {
            params: { archived: false }, // Filtrer les patients non archivés
        });
        console.log(response.data);
        return response.data as Patient[];
    };

    const { isLoading, error, data: patients } = useQuery({
        queryKey: ["patients"],
        queryFn: fetchPatients,
    });

    // Mutation pour archiver un patient
    const archivePatientMutation = useMutation({
        mutationFn: async (patient: Patient) => {
            const response = await axiosPrivate.patch(`/patients/${patient.id}`, {
                is_archived: true,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["patients"] });
            closeModal();
            setSelectedPatient(null);
        },
        onError: (error: ApiError) => {
            setErrorMessage(error.response?.data.message || "Une erreur est survenue lors de l'archivage.");
        },
    });

    // Filtrer les patients en fonction du terme de recherche
    const filteredPatients = patients?.filter((patient) => {
        return (
            patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.address.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Calculer la pagination
    const totalPages = filteredPatients?.length === undefined ? 0 : Math.ceil(filteredPatients.length / itemsPerPage);
    const currentPatients = filteredPatients?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Handler pour ouvrir le modal d'archivage
    const handleArchiveClick = (patient: Patient) => {
        setSelectedPatient(patient);
        openModal();
    };

    // Handler pour confirmer l'archivage
    const handleConfirmArchive = () => {
        if (selectedPatient) {
            archivePatientMutation.mutate(selectedPatient);
        }
    };

    // Handler pour fermer le modal
    const handleCloseModal = () => {
        setSelectedPatient(null);
        setErrorMessage(null);
        closeModal();
    };

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
                <div className={patients?.length !== 0 ? "min-w-[1102px]" : "h-[calc(100vh-28rem)] flex items-center justify-center"}>
                    {isLoading ? (
                        error ? (
                            <p className="text-center text-red-600">Erreur lors du chargement des données</p>
                        ) : (
                            <Loader className="h-64" />
                        )
                    ) : patients?.length === 0 ? (
                        <p className="py-4 font-medium text-gray-800 dark:text-white/90">
                            Aucun patient enregistré
                        </p>
                    ) : (
                        <>
                            <Table>
                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <TableRow>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Nom et Prénom
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Date de naissance
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Téléphone
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Adresse
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Stade MRC
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Détails
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {currentPatients?.map((patient) => (
                                        <TableRow key={patient.id}>
                                            <TableCell className="px-5 py-4 sm:px-6 text-start">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                            {`${patient.first_name} ${patient.last_name}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {new Date(patient.dateOfBirth).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {patient.phone}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {patient.address}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {patient.stage_mrc}
                                            </TableCell>
                                            <TableCell className="flex justify-end px-4 py-3 gap-2 text-gray-500 text-theme-sm dark:text-gray-400">
                                                <Link to={`/user/patient/${patient.id}`}>
                                                    <Button size="sm" variant="primary">
                                                        Voir plus de détails
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleArchiveClick(patient)}
                                                    disabled={patient.is_archived} // Désactiver si déjà archivé
                                                >
                                                    Archiver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {totalPages > 1 && (
                                <div className="flex justify-center mt-2 mb-2 gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Précédent
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <Button
                                            key={i + 1}
                                            variant={currentPage === i + 1 ? "primary" : "outline"}
                                            onClick={() => setCurrentPage(i + 1)}
                                        >
                                            {i + 1}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de confirmation pour archiver */}
            <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[500px] m-4">
                <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Confirmation</h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Êtes-vous sûr de vouloir archiver le patient suivant : "{selectedPatient?.first_name} {selectedPatient?.last_name}" ?
                        </p>
                    </div>
                    {errorMessage && <Alert variant="error" seconds={5} title="Erreur" message={errorMessage} />}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={handleCloseModal}
                            disabled={archivePatientMutation.isPending}
                            className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmArchive}
                            disabled={archivePatientMutation.isPending}
                            className={`flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white sm:w-auto ${
                                archivePatientMutation.isPending ? "bg-gray-300" : "bg-brand-500 hover:bg-brand-600"
                            }`}
                        >
                            {archivePatientMutation.isPending ? "Archivage en cours..." : "Confirmer"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}