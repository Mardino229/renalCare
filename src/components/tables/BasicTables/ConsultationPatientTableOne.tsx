import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";
import Button from "../../ui/button/Button.tsx";
import Badge from "../../ui/badge/Badge.tsx";
import { useState } from "react";
import { Consultation } from "../../../types/medicalTypes.ts";
import { Modal } from "../../ui/modal";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Label from "../../form/Label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useModal } from "../../../hooks/useModal.ts";
import { useAxiosPrivate } from "../../../hooks/useAxiosPrivate.ts";
import { ApiError } from "../../../types/types.ts";
import TextArea from "../../form/input/TextArea.tsx";
import Alert from "../../ui/alert/Alert.tsx";
import Loader from "../../ui/Loader.tsx";
import Input from "../../form/input/InputField.tsx";

// Schéma de validation pour une consultation avec résultats de tests conditionnels
const consultationSchema = z.object({
    doctor_remarks: z.string().min(1, "Les remarques sont requises"),
    prescriptions: z.string().optional(),
    testResults: z.string().optional(),
    type: z.string(),
    results: z
        .object({
            creatinine: z.number().nullable().optional(),
            urea: z.number().nullable().optional(),
            hemoglobin: z.number().nullable().optional(),
            systolic_bp: z.number().int().nullable().optional(),
            diastolic_bp: z.number().int().nullable().optional(),
            gfr: z.number().nullable().optional(),
            albumin: z.number().nullable().optional(),
            proteinuria: z.number().nullable().optional(),
        })
        .optional(),
}).refine(
    (data) => {
        if (data.type === "analyse") {
            return data.results && Object.values(data.results).some((value) => value !== null && value !== undefined);
        }
        return true;
    },
    {
        message: "Au moins un résultat de test doit être fourni pour une consultation de type Analyse",
        path: ["results"],
    }
);

type ConsultationFormData = z.infer<typeof consultationSchema>;

type ValidationErrors = {
    doctor_remarks?: string;
    prescriptions?: string;
    testResults?: string;
    results?: {
        creatinine?: string;
        urea?: string;
        hemoglobin?: string;
        systolic_bp?: string;
        diastolic_bp?: string;
        gfr?: string;
        albumin?: string;
        proteinuria?: string;
    };
    general?: string;
};

export interface ConsultationPatientTableOneProps {
    consultations?: Consultation[];
    isLoading: boolean;
    error: Error | null;
    itemsPerPage: number;
}

export default function ConsultationPatientTableOne({
                                                        consultations,
                                                        isLoading,
                                                        error,
                                                        itemsPerPage,
                                                    }: ConsultationPatientTableOneProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const { isOpen: isUpdateOpen, openModal: openUpdateModal, closeModal: closeUpdateModal } = useModal();
    const { isOpen: isResultOpen, openModal: openResultModal, closeModal: closeResultModal } = useModal();
    const [err, setErr] = useState<ValidationErrors>({});
    const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
    const queryClient = useQueryClient();
    const axiosPrivate = useAxiosPrivate();

    const totalPages = consultations?.length ? Math.ceil(consultations.length / itemsPerPage) : 0;
    const currentConsultations = consultations?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Configuration de React Hook Form pour le formulaire de mise à jour
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ConsultationFormData>({
        resolver: zodResolver(consultationSchema),
        defaultValues: {
            doctor_remarks: "",
            prescriptions: "",
            testResults: "",
            type: selectedConsultation?.type,
            results: {
                creatinine: null,
                urea: null,
                hemoglobin: null,
                systolic_bp: null,
                diastolic_bp: null,
                gfr: null,
                albumin: null,
                proteinuria: null,
            },
        },
    });

    // Mutation pour mettre à jour une consultation
    const updateMutation = useMutation({
        mutationFn: async (data: ConsultationFormData) => {
            if (!selectedConsultation) return;
            const response = await axiosPrivate.put(`/consultations/${selectedConsultation.id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["consultations"] });
            closeUpdateModal();
            reset();
            setErr({ general: data.message });
            setSelectedConsultation(null);
        },
        onError: (error: ApiError) => {
            if (error.response?.status === 422) {
                setErr(error.response.data.errors || {});
            } else {
                setErr({ general: error.response?.data.message });
            }
        },
    });

    const openUpdateModalWithConsultation = (consultation: Consultation) => {
        setSelectedConsultation(consultation);
        reset({
            doctor_remarks: consultation.doctor_remarks || "",
            prescriptions: consultation.prescriptions || "",
            testResults: consultation.testResults || "",
            type: consultation.type || "",
            results: consultation.test_result
        });
        openUpdateModal();
    };

    const openResultModalWithConsultation = (consultation: Consultation) => {
        setSelectedConsultation(consultation);
        openResultModal();
    };

    const onSubmit = (data: ConsultationFormData) => {
        updateMutation.mutate(data);
    };

    const handleCloseUpdateModal = () => {
        reset();
        setErr({});
        setSelectedConsultation(null);
        closeUpdateModal();
    };

    const handleCloseResultModal = () => {
        setSelectedConsultation(null);
        closeResultModal();
    };

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
                {updateMutation.isSuccess && !!err.general && (
                    <Alert variant="success" seconds={3} title="Opération effectuée" message={err.general} />
                )}
                <div className={consultations?.length !== 0 ? "min-w-[1102]" : ""}>
                    {isLoading ? (
                        error ? (
                            <p className="text-center text-red-600">Erreur lors du chargement des données</p>
                        ) : (
                            <Loader className="h-64" />
                        )
                    ) : consultations?.length === 0 ? (
                        <p className="text-center py-4 font-medium text-gray-800 dark:text-white/90">
                            Aucune consultation à afficher pour ce patient
                        </p>
                    ) : (
                        <>
                            <Table>
                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <TableRow>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Médecin
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Date
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Statut
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Type
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400"
                                        >
                                            Actions
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {currentConsultations?.map((consultation) => (
                                        <TableRow key={consultation.id}>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                <div className="flex items-center gap-3">
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                        {consultation.doctor.first_name} {consultation.doctor.last_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {new Date(consultation.date).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                <Badge
                                                    size="sm"
                                                    color={
                                                        consultation.status === "confirmed"
                                                            ? "success"
                                                            : consultation.status === "scheduled"
                                                                ? "warning"
                                                                : "error"
                                                    }
                                                >
                                                    {consultation.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {consultation.type}
                                            </TableCell>
                                            <TableCell className="flex justify-end px-4 py-3 gap-2 text-gray-500 text-theme-sm dark:text-gray-400">
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => openUpdateModalWithConsultation(consultation)}
                                                >
                                                    Mettre à jour
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openResultModalWithConsultation(consultation)}
                                                >
                                                    Voir les résultats
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

            {/* Modal pour la mise à jour des consultations */}
            <Modal isOpen={isUpdateOpen} onClose={handleCloseUpdateModal} isFullscreen={selectedConsultation?.type === "analyse"} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Mettre à jour la consultation
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Modifiez les détails de la consultation
                        </p>
                    </div>
                    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                        <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
                            <div className="mt-2">
                                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                    <div className="col-span-2">
                                        <Label>Remarques du médecin</Label>
                                        <Controller
                                            name="doctor_remarks"
                                            control={control}
                                            render={({ field }) => (
                                                <TextArea
                                                    placeholder="Saisissez vos remarques ..."
                                                    value={field.value || ""}
                                                    onChange={(value) => field.onChange(value)}
                                                    error={!!errors.doctor_remarks || !!err.doctor_remarks}
                                                    hint={errors.doctor_remarks?.message || err.doctor_remarks}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Ordonnances (facultatif)</Label>
                                        <Controller
                                            name="prescriptions"
                                            control={control}
                                            render={({ field }) => (
                                                <TextArea
                                                    placeholder="Saisissez vos prescriptions..."
                                                    value={field.value || ""}
                                                    onChange={(value) => field.onChange(value)}
                                                    error={!!errors.prescriptions || !!err.prescriptions}
                                                    hint={errors.prescriptions?.message || err.prescriptions}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Résultats des tests (facultatif)</Label>
                                        <Controller
                                            name="testResults"
                                            control={control}
                                            render={({ field }) => (
                                                <TextArea
                                                    placeholder="Saisissez les résultats..."
                                                    value={field.value || ""}
                                                    onChange={(value) => field.onChange(value)}
                                                    error={!!errors.testResults || !!err.testResults}
                                                    hint={errors.testResults?.message || err.testResults}
                                                />
                                            )}
                                        />
                                    </div>

                                    {selectedConsultation?.type === "analyse" && (
                                        <>
                                            <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90 mt-6 mb-4 col-span-2">
                                                Résultats des tests
                                            </h5>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Créatinine (mg/dL)</Label>
                                                <Controller
                                                    name="results.creatinine"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="Créatinine"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                            error={!!errors.results?.creatinine || !!err.results?.creatinine}
                                                            hint={errors.results?.creatinine?.message || err.results?.creatinine}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Urée (mg/dL)</Label>
                                                <Controller
                                                    name="results.urea"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="Urée"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                            error={!!errors.results?.urea || !!err.results?.urea}
                                                            hint={errors.results?.urea?.message || err.results?.urea}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Hémoglobine (g/dL)</Label>
                                                <Controller
                                                    name="results.hemoglobin"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="Hémoglobine"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                            error={!!errors.results?.hemoglobin || !!err.results?.hemoglobin}
                                                            hint={errors.results?.hemoglobin?.message || err.results?.hemoglobin}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Pression systolique (mmHg)</Label>
                                                <Controller
                                                    name="results.systolic_bp"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            placeholder="Pression systolique"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                                            error={!!errors.results?.systolic_bp || !!err.results?.systolic_bp}
                                                            hint={errors.results?.systolic_bp?.message || err.results?.systolic_bp}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Pression diastolique (mmHg)</Label>
                                                <Controller
                                                    name="results.diastolic_bp"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            placeholder="Pression diastolique"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                                                            error={!!errors.results?.diastolic_bp || !!err.results?.diastolic_bp}
                                                            hint={errors.results?.diastolic_bp?.message || err.results?.diastolic_bp}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>GFR (mL/min)</Label>
                                                <Controller
                                                    name="results.gfr"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="GFR"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                            error={!!errors.results?.gfr || !!err.results?.gfr}
                                                            hint={errors.results?.gfr?.message || err.results?.gfr}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Albumine (g/L)</Label>
                                                <Controller
                                                    name="results.albumin"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="Albumine"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                            error={!!errors.results?.albumin || !!err.results?.albumin}
                                                            hint={errors.results?.albumin?.message || err.results?.albumin}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div className="col-span-2 lg:col-span-1">
                                                <Label>Protéinurie (mg/24h)</Label>
                                                <Controller
                                                    name="results.proteinuria"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Input
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="Protéinurie"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                            error={!!errors.results?.proteinuria || !!err.results?.proteinuria}
                                                            hint={errors.results?.proteinuria?.message || err.results?.proteinuria}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            {errors.results && (
                                                <p className="col-span-2 text-red-500 text-sm mt-2">
                                                    {errors.results.message}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
                            <Button
                                variant="outline"
                                onClick={handleCloseUpdateModal}
                                disabled={updateMutation.isPending}
                                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                            >
                                Fermer
                            </Button>
                            <Button
                                disabled={updateMutation.isPending}
                                className={`flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white sm:w-auto ${
                                    updateMutation.isPending ? "bg-gray-300" : "bg-brand-500 hover:bg-brand-600"
                                }`}
                            >
                                {updateMutation.isPending ? "Mise à jour en cours ..." : "Mettre à jour"}
                            </Button>
                        </div>
                    </form>
                    {updateMutation.isError && !!err.general && (
                        <Alert variant="error" seconds={5} title="Opération échouée" message={err.general} />
                    )}
                </div>
            </Modal>

            {/* Modal pour afficher les résultats */}
            <Modal isOpen={isResultOpen} onClose={handleCloseResultModal} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Résultats de la consultation
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Détails des résultats pour la consultation sélectionnée
                        </p>
                    </div>
                    {selectedConsultation?.status === "scheduled" ? (
                        <p className="text-center text-gray-800 dark:text-white/90">
                            La consultation n'a pas encore été effectuée.
                        </p>
                    ) : (
                        <div className="px-2 pb-3">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div className="col-span-2">
                                    <Label>Remarques du médecin</Label>
                                    <p className="text-gray-700 dark:text-gray-300">{selectedConsultation?.doctor_remarks || "Aucune remarque"}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label>Ordonnances</Label>
                                    <p className="text-gray-700 dark:text-gray-300">{selectedConsultation?.prescriptions || "Aucune ordonnance"}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label>Résultats des tests</Label>
                                    <p className="text-gray-700 dark:text-gray-300">{selectedConsultation?.testResults || "Aucun résultat"}</p>
                                </div>

                                {selectedConsultation?.type === "analyse" && selectedConsultation?.test_result && (
                                    <>
                                        <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90 mt-6 mb-4 col-span-2">
                                            Résultats des analyses
                                        </h5>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Créatinine (mg/dL)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.creatinine ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Urée (mg/dL)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.urea ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Hémoglobine (g/dL)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.hemoglobin ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Pression systolique (mmHg)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.systolic_bp ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Pression diastolique (mmHg)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.diastolic_bp ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>GFR (mL/min)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.gfr ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Albumine (g/L)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.albumin ?? "Non renseigné"}</p>
                                        </div>
                                        <div className="col-span-2 lg:col-span-1">
                                            <Label>Protéinurie (mg/24h)</Label>
                                            <p className="text-gray-700 dark:text-gray-300">{selectedConsultation.test_result.proteinuria ?? "Non renseigné"}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end mt-6">
                        <Button
                            variant="outline"
                            onClick={handleCloseResultModal}
                            className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                        >
                            Fermer
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}