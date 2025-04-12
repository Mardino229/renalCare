import PageBreadcrumb from "../../../components/common/PageBreadCrumb.tsx";
import PageMeta from "../../../components/common/PageMeta.tsx";
import ComponentCard from "../../../components/common/ComponentCard.tsx";
import Button from "../../../components/ui/button/Button.tsx";
import { Modal } from "../../../components/ui/modal";
import Label from "../../../components/form/Label.tsx";
import Input from "../../../components/form/input/InputField.tsx";
import { useModal } from "../../../hooks/useModal.ts";
import { useRef, useState } from "react";
import Select from "../../../components/form/Select.tsx";
import { PlusIcon } from "../../../icons";
import { useAxiosPrivate } from "../../../hooks/useAxiosPrivate.ts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "../../../types/types.ts";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Doctor } from "../../../types/medicalTypes.ts";
import DoctorTableOne from "../../../components/tables/BasicTables/DoctorTableOne.tsx";

// Schéma de validation avec Zod pour le formulaire Doctor
const doctorSchema = z.object({
    first_name: z.string().min(1, "Le prénom est requis"),
    last_name: z.string().min(1, "Le nom est requis"),
    email: z.string().email("L’email doit être valide").min(1, "L’email est requis"),
    phone: z
        .string()
        .min(1, "Le numéro de téléphone est requis")
        .regex(/^\d{10}$/, "Le numéro de téléphone doit contenir exactement 10 chiffres"),
});

// Type déduit du schéma Zod
type DoctorFormData = z.infer<typeof doctorSchema>;

// Interface pour les erreurs renvoyées par Laravel
interface ValidationErrors {
    first_name?: string;
    last_name?: string;
    email?: string;
    contact?: string;
    address?: string;
    general?: string;
}

export default function DoctorListPage() {
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
        formState: {errors },
    } = useForm<DoctorFormData>({
        resolver: zodResolver(doctorSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
        },
    });

    // Mutation pour ajouter un docteur
    const mutation = useMutation({
        mutationFn: async (doctor: Omit<Doctor, "id">) => {
            const response = await axiosPrivate.post("/doctors", doctor);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["doctors"] });
            // queryClient.invalidateQueries({ queryKey: ["stat"] });
            reset();
            setError({});
            closeModal();
        },
        onError: (error: ApiError) => {
            if (error.response?.status === 422) {
                console.log(error.response)
                setError(error.response.data.errors || {});
            }
            console.log(error.response)
        },
    });

    const { isOpen, openModal, closeModal } = useModal();
    const inputRef = useRef<HTMLInputElement>(null);

    // Gestion de la soumission
    const onSubmit: SubmitHandler<DoctorFormData> = (data) => {
        mutation.mutate({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            contact: data.phone,
            status: true
        });
    };

    // Fermer le modal et réinitialiser le formulaire
    const handleCloseModal = () => {
        reset();
        setError({});
        closeModal();
    };

    return (
        <div>
            <PageMeta title="Gestion des docteurs" description="Docteurs" />
            <PageBreadcrumb pageTitle="Gestion des docteurs" pagePath="/admin/home" />
            <div className="space-y-6">
                <ComponentCard title="Liste des docteurs">
                    <div className="flex gap-4 flex-wrap justify-between">
                        <div>
                            <Select
                                options={pageOptions}
                                defaultValue={byPage.toString()}
                                placeholder="Entrée par page"
                                onChange={handlePageChange}
                                className={`dark:bg-dark-900`}
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
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Rechercher par nom, email, numéro..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={openModal}
                                startIcon={<PlusIcon className="size-5" />}
                            >
                                Ajouter un docteur
                            </Button>
                        </div>
                    </div>
                    <DoctorTableOne searchTerm={searchTerm} itemsPerPage={byPage} />
                </ComponentCard>
            </div>
            <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Ajouter un nouveau docteur
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Entrez les informations sur le docteur
                        </p>
                    </div>
                    <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
                        {error.general && (
                            <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
                                {error.general}
                            </div>
                        )}
                        <div className="custom-scrollbar overflow-y-auto px-2 pb-3">
                            <div className="mt-7">
                                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                    <div className="col-span-2 lg:col-span-1">
                                        <Label>Nom</Label>
                                        <Input
                                            placeholder="Nom du docteur"
                                            {...register("last_name")}
                                            error={!!errors.last_name || !!error.last_name}
                                            hint={error?.last_name || errors.last_name?.message}
                                        />
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <Label>Prénoms</Label>
                                        <Input
                                            placeholder="Nom du docteur"
                                            {...register("first_name")}
                                            error={!!errors.first_name || !!error.first_name}
                                            hint={error?.first_name || errors.first_name?.message}
                                        />
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <Label>Email</Label>
                                        <Input
                                            placeholder="Email"
                                            {...register("email")}
                                            error={!!errors.email || !!error.email}
                                            hint={error.email || errors.email?.message}
                                        />
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <Label>Numéro de téléphone</Label>
                                        <Input
                                            placeholder="Numéro de téléphone"
                                            {...register("phone")}
                                            error={!!errors.phone || !!error.contact}
                                            hint={error.contact || errors.phone?.message}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
                            <button
                                onClick={handleCloseModal}
                                disabled={mutation.isPending }
                                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                            >
                                Fermer
                            </button>
                            <button
                                className={`${
                                    mutation.isPending
                                        ? "flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                                        : "btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
                                }`}
                                disabled={mutation.isPending }
                            >
                                {mutation.isPending ? (
                                    "Création en cours..."
                                ) : (
                                    "Valider"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}