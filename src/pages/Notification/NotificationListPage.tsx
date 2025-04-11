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
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import NotificationTableOne from "../../components/tables/BasicTables/NotificationTableOne.tsx";
import Alert from "../../components/ui/alert/Alert.tsx";

// Schéma de validation avec Zod pour le formulaire Notification
const notificationSchema = z.object({
    type: z.enum(["critical", "reminder", "update"], {
        errorMap: () => ({ message: "Le type de notification est requis" }),
    }),
    condition: z.string().min(1, "La condition est requise"),
    channel: z.enum(["push", "email", "sms"], {
        errorMap: () => ({ message: "Le canal de notification est requis" }),
    }),
});

// Type déduit du schéma Zod
type NotificationFormData = z.infer<typeof notificationSchema>;

// Interface pour les erreurs renvoyées par Laravel
interface ValidationErrors {
    type?: string;
    condition?: string;
    channel?: string;
    general?: string;
}

export default function NotificationListPage() {
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

    // Options pour les champs Select
    const typeOptions = [
        { value: "critical", label: "Critique" },
        { value: "reminder", label: "Rappel" },
        { value: "update", label: "Mise à jour" },
    ];

    const channelOptions = [
        { value: "push", label: "Push" },
        { value: "email", label: "Email" },
        { value: "sms", label: "SMS" },
    ];

    // Configuration de React Hook Form avec Zod
    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<NotificationFormData>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            type: "critical",
            condition: "",
            channel: "push",
        },
    });

    // Mutation pour ajouter une notification
    const mutation = useMutation({
        mutationFn: async (notification: NotificationFormData) => {
            setError({});
            const response = await axiosPrivate.post("/notifications/settings", notification);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            reset({ type: "critical", condition: "", channel: "push" });
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
    const onSubmit: SubmitHandler<NotificationFormData> = (data) => {
        mutation.mutate(data);
    };

    // Fermer le modal et réinitialiser le formulaire
    const handleCloseModal = () => {
        reset({ type: "critical", condition: "", channel: "push" });
        setError({});
        closeModal();
    };

    return (
        <div>
            <PageMeta title="Gestion des notifications" description="Notifications" />
            <PageBreadcrumb pageTitle="Gestion des notifications" pagePath="/dash/dashboard" />
            {mutation.isSuccess && !!error.general && (
                <Alert variant="success" seconds={3} title="OpMADération effectuée" message={error.general} />
            )}
            <div className="space-y-6">
                <ComponentCard title="Liste des notifications">
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
                                    placeholder="Rechercher par condition..."
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
                                Ajouter une notification
                            </Button>
                        </div>
                    </div>
                    <NotificationTableOne searchTerm={searchTerm} itemsPerPage={byPage} />
                </ComponentCard>
            </div>

            {/* Modal pour ajouter une notification */}
            <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Ajouter une nouvelle notification
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Configurez les paramètres de la notification
                        </p>
                    </div>
                    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                        <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
                            <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div className="col-span-2 lg:col-span-1">
                                    <Label>Type de notification</Label>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                options={typeOptions}
                                                placeholder="Sélectionner le type"
                                                value={field.value}
                                                onChange={(value) => field.onChange(value)}
                                                error={!!errors.type || !!error.type}
                                                hint={errors.type?.message || error.type}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="col-span-2 lg:col-span-1">
                                    <Label>Canal de notification</Label>
                                    <Controller
                                        name="channel"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                options={channelOptions}
                                                placeholder="Sélectionner le canal"
                                                value={field.value}
                                                onChange={(value) => field.onChange(value)}
                                                error={!!errors.channel || !!error.channel}
                                                hint={errors.channel?.message || error.channel}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Condition</Label>
                                    <Input
                                        placeholder="Ex. : potassium > 6"
                                        {...register("condition")}
                                        error={!!errors.condition || !!error.condition}
                                        hint={errors.condition?.message || error.condition}
                                    />
                                </div>
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
                                type="submit"
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