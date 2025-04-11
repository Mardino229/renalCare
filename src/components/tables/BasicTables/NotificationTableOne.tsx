import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";
import Button from "../../ui/button/Button.tsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Loader from "../../ui/Loader.tsx";
import { useAxiosPrivate } from "../../../hooks/useAxiosPrivate.ts";
import { Modal } from "../../ui/modal";
import { useModal } from "../../../hooks/useModal.ts";
import Alert from "../../ui/alert/Alert.tsx";
import { ApiError } from "../../../types/types.ts";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Select from "../../form/Select.tsx";
import Input from "../../form/input/InputField.tsx";
import Label from "../../form/Label";

// Type pour une Notification
interface Notification {
    id: number;
    type: "critical" | "reminder" | "update";
    condition: string;
    channel: "push" | "email" | "sms";
    active: boolean;
}

// Schéma de validation pour la modification
const notificationSchema = z.object({
    type: z.enum(["critical", "reminder", "update"], {
        errorMap: () => ({ message: "Le type de notification est requis" }),
    }),
    condition: z.string().min(1, "La condition est requise"),
    channel: z.enum(["push", "email", "sms"], {
        errorMap: () => ({ message: "Le canal de notification est requis" }),
    }),
});

type NotificationFormData = z.infer<typeof notificationSchema>;
//
// type ValidationErrors = {
//     type?: string;
//     condition?: string;
//     channel?: string;
//     general?: string;
// };

export default function NotificationTableOne({ searchTerm, itemsPerPage }: { searchTerm: string; itemsPerPage: number }) {
    const axiosPrivate = useAxiosPrivate();
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Modals séparés pour chaque action
    const { isOpen: isToggleOpen, openModal: openToggleModal, closeModal: closeToggleModal } = useModal();
    const { isOpen: isEditOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal();
    const { isOpen: isDeleteOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal();

    // Récupérer les notifications depuis l’API
    const fetchNotifications = async (): Promise<Notification[]> => {
        const response = await axiosPrivate.get("/notifications/settings");
        return response.data as Notification[];
    };

    const { isLoading, error, data: notifications } = useQuery({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,
    });

    // Mutation pour activer/désactiver
    const toggleNotificationMutation = useMutation({
        mutationFn: async (notification: Notification) => {
            const response = await axiosPrivate.patch(`/notifications/settings/${notification.id}`, {
                active: !notification.active,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            closeToggleModal();
            setSelectedNotification(null);
        },
        onError: (error: ApiError) => {

            setErrorMessage(error.response?.data.message || "Une erreur est survenue lors de la mise à jour.");
        },
    });

    // Mutation pour modifier
    const editNotificationMutation = useMutation({
        mutationFn: async (data: NotificationFormData) => {
            if (!selectedNotification) return;
            const response = await axiosPrivate.put(`/notifications/settings/${selectedNotification.id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            closeEditModal();
            reset();
            setSelectedNotification(null);
        },
        onError: (error: ApiError) => {
            setErrorMessage(error.response?.data.message || "Une erreur est survenue lors de la modification.");
        },
    });

    // Mutation pour supprimer
    const deleteNotificationMutation = useMutation({
        mutationFn: async (notification: Notification) => {
            const response = await axiosPrivate.delete(`/notifications/settings/${notification.id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            closeDeleteModal();
            setSelectedNotification(null);
        },
        onError: (error: ApiError) => {
            setErrorMessage(error.response?.data.message || "Une erreur est survenue lors de la suppression.");
        },
    });

    // Configuration de React Hook Form pour le formulaire de modification
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<NotificationFormData>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            type: "critical",
            condition: "",
            channel: "push",
        },
    });

    // Filtrer les notifications
    const filteredNotifications = notifications?.filter((notification) =>
        notification.condition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculer la pagination
    const totalPages = filteredNotifications?.length === undefined ? 0 : Math.ceil(filteredNotifications.length / itemsPerPage);
    const currentNotifications = filteredNotifications?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Handlers pour les boutons
    const handleToggleClick = (notification: Notification) => {
        setSelectedNotification(notification);
        openToggleModal();
    };

    const handleEditClick = (notification: Notification) => {
        setSelectedNotification(notification);
        reset({
            type: notification.type,
            condition: notification.condition,
            channel: notification.channel,
        });
        openEditModal();
    };

    const handleDeleteClick = (notification: Notification) => {
        setSelectedNotification(notification);
        openDeleteModal();
    };

    const handleConfirmToggle = () => {
        if (selectedNotification) {
            toggleNotificationMutation.mutate(selectedNotification);
        }
    };

    const handleConfirmDelete = () => {
        if (selectedNotification) {
            deleteNotificationMutation.mutate(selectedNotification);
        }
    };

    const onSubmitEdit = (data: NotificationFormData) => {
        editNotificationMutation.mutate(data);
    };

    const handleCloseModal = (type: "toggle" | "edit" | "delete") => {
        setSelectedNotification(null);
        setErrorMessage(null);
        if (type === "toggle") closeToggleModal();
        if (type === "edit") {
            reset();
            closeEditModal();
        }
        if (type === "delete") closeDeleteModal();
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

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
                <div className={notifications?.length !== 0 ? "min-w-[1102px]" : "h-[calc(100vh-28rem)] flex items-center justify-center"}>
                    {isLoading ? (
                        error ? (
                            <p className="text-center text-red-600">Erreur lors du chargement des données</p>
                        ) : (
                            <Loader className="h-64" />
                        )
                    ) : notifications?.length === 0 ? (
                        <p className="py-4 font-medium text-gray-800 dark:text-white/90">
                            Aucune notification configurée
                        </p>
                    ) : (
                        <>
                            <Table>
                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <TableRow>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Type
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Condition
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Canal
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Statut
                                        </TableCell>
                                        <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                            Options
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {currentNotifications?.map((notification) => (
                                        <TableRow key={notification.id}>
                                            <TableCell className="px-5 py-4 sm:px-6 text-start">
                                                <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                    {notification.type === "critical" ? "Critique" : notification.type === "reminder" ? "Rappel" : "Mise à jour"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {notification.condition}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {notification.channel}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {notification.active ? "Actif" : "Inactif"}
                                            </TableCell>
                                            <TableCell className="flex justify-end px-4 py-3 gap-2 text-gray-500 text-theme-sm dark:text-gray-400">
                                                <Button
                                                    size="sm"
                                                    variant={notification.active ? "outline" : "primary"}
                                                    onClick={() => handleToggleClick(notification)}
                                                >
                                                    {notification.active ? "Désactiver" : "Activer"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    onClick={() => handleEditClick(notification)}
                                                >
                                                    Modifier
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteClick(notification)}
                                                >
                                                    Supprimer
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

            {/* Modal de confirmation pour Activer/Désactiver */}
            <Modal isOpen={isToggleOpen} onClose={() => handleCloseModal("toggle")} className="max-w-[500px] m-4">
                <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Confirmation</h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Êtes-vous sûr de vouloir {selectedNotification?.active ? "désactiver" : "activer"} la notification suivante : "{selectedNotification?.condition}" ?
                        </p>
                    </div>
                    {errorMessage && <Alert variant="error" seconds={5} title="Erreur" message={errorMessage} />}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => handleCloseModal("toggle")}
                            disabled={toggleNotificationMutation.isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleConfirmToggle}
                            disabled={toggleNotificationMutation.isPending}
                        >
                            {toggleNotificationMutation.isPending ? "En cours..." : "Confirmer"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal pour Modifier */}
            <Modal isOpen={isEditOpen} onClose={() => handleCloseModal("edit")} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Modifier la notification</h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Modifiez les détails de la notification
                        </p>
                    </div>
                    <form className="flex flex-col" onSubmit={handleSubmit(onSubmitEdit)}>
                        <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
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
                                                error={!!errors.type}
                                                hint={errors.type?.message}
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
                                                error={!!errors.channel}
                                                hint={errors.channel?.message}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Condition</Label>
                                    <Input
                                        placeholder="Ex. : potassium > 6"
                                        {...control.register("condition")}
                                        error={!!errors.condition}
                                        hint={errors.condition?.message}
                                    />
                                </div>
                            </div>
                        </div>
                        {errorMessage && <Alert variant="error" seconds={5} title="Erreur" message={errorMessage} />}
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => handleCloseModal("edit")}
                                disabled={editNotificationMutation.isPending}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={editNotificationMutation.isPending}
                            >
                                {editNotificationMutation.isPending ? "Modification en cours..." : "Enregistrer"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Modal de confirmation pour Supprimer */}
            <Modal isOpen={isDeleteOpen} onClose={() => handleCloseModal("delete")} className="max-w-[500px] m-4">
                <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Confirmation</h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Êtes-vous sûr de vouloir supprimer la notification suivante : "{selectedNotification?.condition}" ? Cette action est irréversible.
                        </p>
                    </div>
                    {errorMessage && <Alert variant="error" seconds={5} title="Erreur" message={errorMessage} />}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => handleCloseModal("delete")}
                            disabled={deleteNotificationMutation.isPending}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={deleteNotificationMutation.isPending}
                        >
                            {deleteNotificationMutation.isPending ? "Suppression en cours..." : "Supprimer"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}