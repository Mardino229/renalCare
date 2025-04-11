import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {useAxiosPrivate} from "../../hooks/useAxiosPrivate.ts";
import PageMeta from "../../components/common/PageMeta.tsx";
import PageBreadcrumb from "../../components/common/PageBreadCrumb.tsx";
import ComponentCard from "../../components/common/ComponentCard.tsx";
import Label from "../../components/form/Label.tsx";
import Form from "../../components/form/Form.tsx";
import Button from "../../components/ui/button/Button.tsx";
import {User} from "../../types/medicalTypes.ts";
import Input from "../../components/form/input/InputField.tsx";
import AdminMetaCard from "../../components/AdminProfile/AdminMetaCard.tsx";
import AdminInfoCard from "../../components/AdminProfile/AdminInfoCard.tsx";
import {ApiError} from "../../types/types.ts";

// Schéma de validation avec Zod
const passwordSchema = z
    .object({
        current_password: z.string().min(1, "L’ancien mot de passe est requis"),
        password: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
        password_confirmation: z.string().min(1, "La confirmation du mot de passe est requise"),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: "Les mots de passe ne correspondent pas",
        path: ["password_confirmation"],
    });

// Type déduit du schéma Zod
type PasswordFormData = z.infer<typeof passwordSchema>;

interface ApiResponse {
    message: string;
}

interface ValidationErrors {
    password?: string;
    password_confirmation?: string;
    email?: string;
    general?: string;
}

export default function AdminProfiles() {
    const axiosPrivate = useAxiosPrivate();
    const [error, setError] = useState<ValidationErrors>({});

    // Récupérer les informations de l'utilisateur
    const fetchUser = async (): Promise<User> => {
        const response = await axiosPrivate.get("/user");
        return response.data;
    };

    const { data: user } = useQuery({
        queryKey: ["user"],
        queryFn: fetchUser,
    });

    // État pour le message de succès
    const [successMessage, setSuccessMessage] = useState<string>("");

    // Configuration de React Hook Form avec Zod
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            current_password: "",
            password: "",
            password_confirmation: "",
        },
    });

    // Mutation pour mettre à jour le mot de passe
    const { mutate, isPending } = useMutation<
        ApiResponse,
        ApiError,
        PasswordFormData
    >({
        mutationFn: async (data: PasswordFormData) => {
            const response = await axiosPrivate.put("/user/password", data);
            return response.data;
        },
        onSuccess: (data) => {
            setSuccessMessage(data.message || "Mot de passe mis à jour avec succès");
            reset();
        },
        onError: (error: ApiError) => {
            if (error.response?.status === 422) {
                console.log(error.response)
                setError(error.response.data.errors || {});
            }
        },
    });

    // Gestion de la soumission
    const onSubmit: SubmitHandler<PasswordFormData> = (data) => {
        setSuccessMessage("");
        mutate(data);
    };

    return (
        <>
            <PageMeta title="Profile" description="Profile de l'admin" />
            <PageBreadcrumb pageTitle="Paramètres" pagePath="/admin/home" />
            <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
                <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
                    Profil
                </h3>
                <div className="space-y-6">
                    <AdminMetaCard user={user} />
                    <AdminInfoCard />
                    <ComponentCard title="Modifier le mot de passe">
                        {successMessage && (
                            <div className="mb-4 p-3 rounded bg-green-100 text-green-700">
                                {successMessage}
                            </div>
                        )}
                        <Form onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-6">
                                <div>
                                    <Label htmlFor="current_password">Ancien mot de passe</Label>
                                    <Input
                                        type="password"
                                        id="current_password"
                                        {...register("current_password")}
                                        error={!!errors.current_password}
                                        hint={errors.current_password?.message}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="password">Nouveau mot de passe</Label>
                                    <Input
                                        type="password"
                                        id="password"
                                        {...register("password")}
                                        error={!!errors.password||!!error.password}
                                        hint={errors.password?.message||error.password}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="password_confirmation">Confirmer le nouveau mot de passe</Label>
                                    <Input
                                        type="password"
                                        id="password_confirmation"
                                        {...register("password_confirmation")}
                                        error={!!errors.password_confirmation||!!error.password_confirmation}
                                        hint={errors.password_confirmation?.message||error.password_confirmation}
                                    />
                                </div>
                                <div className="flex items-center modal-footer justify-end">
                                    <Button
                                        variant={isPending || isPending ? "outline" : "primary"} disabled={isPending || isPending}>
                                        {isPending? "Modification en cours ..." : "Mettre à jour"}
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </ComponentCard>
                </div>
            </div>
        </>
    );
}
