import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard.tsx";
import Button from "../../components/ui/button/Button.tsx";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label.tsx";
import Input from "../../components/form/input/InputField.tsx";
import { useModal } from "../../hooks/useModal.ts";
import { useState } from "react";
import Select from "../../components/form/Select.tsx";
import { PlusIcon } from "../../icons";
import { useAxiosPrivate } from "../../hooks/useAxiosPrivate.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../types/types.ts";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "../../components/ui/alert/Alert.tsx";
import WorkflowTableOne from "../../components/tables/BasicTables/WorkFlowTableOne.tsx";

// Schéma de validation avec Zod pour le formulaire Workflow
const workflowSchema = z.object({
    name: z.string().min(1, "Le nom du workflow est requis"),
    steps: z
        .array(
            z.object({
                action: z.string().min(1, "L’action est requise"),
                frequency: z.string().min(1, "La fréquence est requise"),
                condition: z.string().optional(),
            })
        )
        .min(1, "Au moins une étape est requise"),
});

// Type déduit du schéma Zod
type WorkflowFormData = z.infer<typeof workflowSchema>;

// Interface pour les erreurs renvoyées par Laravel
interface ValidationErrors {
    name?: string;
    steps?: string;
    general?: string;
}

export default function WorkflowListPage() {
    const axiosPrivate = useAxiosPrivate();
    const queryClient = useQueryClient();
    const [error, setError] = useState<ValidationErrors>({});
    const [searchTerm, setSearchTerm] = useState("");
    const [byPage, setByPage] = useState(10);
    const listPage = [2, 5, 10, 20, 50];
    const pageOptions = listPage.map((page) => ({
        value: page,
        label: page.toString(),
    }));

    const handlePageChange = (value: string) => {
        setByPage(parseInt(value));
    };

    // Configuration de React Hook Form avec Zod
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<WorkflowFormData>({
        resolver: zodResolver(workflowSchema),
        defaultValues: {
            name: "",
            steps: [{ action: "", frequency: "", condition: "" }],
        },
    });

    const steps = watch("steps"); // Observer les étapes pour les manipuler dynamiquement

    // Mutation pour ajouter un workflow
    const mutation = useMutation({
        mutationFn: async (workflow: WorkflowFormData) => {
            setError({});
            const response = await axiosPrivate.post("/workflows", workflow);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["workflows"] });
            reset({ name: "", steps: [{ action: "", frequency: "", condition: "" }] });
            setError({ general: data.message });
            closeModal();
        },
        onError: (error: ApiError) => {
            if (error.response?.status === 422) {
                setError(error.response.data.errors || {});
            } else {
                setError({ general: "Une erreur est survenue" });
            }
        },
    });

    const { isOpen, openModal, closeModal } = useModal();

    // Gestion de la soumission
    const onSubmit: SubmitHandler<WorkflowFormData> = (data) => {
        mutation.mutate(data);
    };

    // Ajouter une nouvelle étape
    const addStep = () => {
        setValue("steps", [...steps, { action: "", frequency: "", condition: "" }]);
    };

    // Fermer le modal et réinitialiser le formulaire
    const handleCloseModal = () => {
        reset({ name: "", steps: [{ action: "", frequency: "", condition: "" }] });
        setError({});
        closeModal();
    };

    return (
        <div>
            <PageMeta title="Gestion des workflows" description="Workflows" />
            <PageBreadcrumb pageTitle="Gestion des workflows" pagePath="/dash/dashboard" />
            {mutation.isSuccess && !!error.general && (
                <Alert variant="success" seconds={3} title="Opération effectuée" message={error.general} />
            )}
            <div className="space-y-6">
                <ComponentCard title="Liste des workflows">
                    <div className="flex gap-4 flex-wrap justify-between">
                        <div>
                            <Select
                                options={pageOptions}
                                defaultValue={byPage.toString()}
                                placeholder="Entrée par page"
                                onChange={handlePageChange}
                                className="dark:bg-dark-900"
                            />
                        </div>
                        <div className="gap-4 flex-wrap-reverse flex w-full justify-end">
                            <div className="relative">
                                <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                                    <svg
                                        className="fill-gray-500 dark:fill-gray-400"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            clipRule="evenodd"
                                            d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                                            fill=""
                                        />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={openModal}
                                startIcon={<PlusIcon className="size-5" />}
                            >
                                Ajouter un workflow
                            </Button>
                        </div>
                    </div>
                    <WorkflowTableOne searchTerm={searchTerm} itemsPerPage={byPage} />
                </ComponentCard>
            </div>

            {/* Modal pour ajouter un workflow */}
            <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Ajouter un nouveau workflow
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Configurez les étapes du suivi patient
                        </p>
                    </div>
                    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                        <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
                            <div className="mt-7">
                                <Label>Nom du workflow</Label>
                                <Input
                                    placeholder="Ex. : Suivi MRC Stade 3"
                                    {...register("name")}
                                    error={!!errors.name || !!error.name}
                                    hint={errors.name?.message || error.name}
                                />

                                <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90 mt-6 mb-4">
                                    Étapes du workflow
                                </h5>
                                {steps.map((_step, index) => (
                                    <div key={index} className="grid grid-cols-1 gap-4 lg:grid-cols-3 mb-4">
                                        <div>
                                            <Label>Action</Label>
                                            <Input
                                                placeholder="Ex. : Examen"
                                                {...register(`steps.${index}.action`)}
                                                error={!!errors.steps?.[index]?.action}
                                                hint={errors.steps?.[index]?.action?.message}
                                            />
                                        </div>
                                        <div>
                                            <Label>Fréquence</Label>
                                            <Input
                                                placeholder="Ex. : 3 months"
                                                {...register(`steps.${index}.frequency`)}
                                                error={!!errors.steps?.[index]?.frequency}
                                                hint={errors.steps?.[index]?.frequency?.message}
                                            />
                                        </div>
                                        <div>
                                            <Label>Condition (facultatif)</Label>
                                            <Input
                                                placeholder="Ex. : creatinine > 1.5"
                                                {...register(`steps.${index}.condition`)}
                                                error={!!errors.steps?.[index]?.condition}
                                                hint={errors.steps?.[index]?.condition?.message}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={addStep} className="mt-2">
                                    Ajouter une étape
                                </Button>
                                {errors.steps && (
                                    <p className="text-red-500 text-sm mt-2">{errors.steps.message}</p>
                                )}
                            </div>
                        </div>
                        {error.general && (
                            <div className="mb-4 p-3 rounded bg-red-100 text-red-700">{error.general}</div>
                        )}
                        <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
                            <Button
                                onClick={handleCloseModal}
                                variant="outline"
                                disabled={mutation.isPending}
                            >
                                Fermer
                            </Button>
                            <Button
                                variant={mutation.isPending ? "outline" : "primary"}
                                disabled={mutation.isPending}
                            >
                                {mutation.isPending ? "Ajout en cours..." : "Valider"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}