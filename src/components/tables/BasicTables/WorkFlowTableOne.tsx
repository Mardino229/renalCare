import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";
import Button from "../../ui/button/Button.tsx";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
// import { Link } from "react-router-dom"; // Assumes React Router is used
import Loader from "../../ui/Loader.tsx";
import {useAxiosPrivate} from "../../../hooks/useAxiosPrivate.ts";

// Type pour un Workflow (à adapter selon ton backend)
interface Workflow {
    id: number;
    name: string;
    steps: { action: string; frequency: string; condition?: string }[];
    active: boolean;
}

export default function WorkflowTableOne({ searchTerm, itemsPerPage }: { searchTerm: string; itemsPerPage: number }) {
    const axiosPrivate = useAxiosPrivate();
    const [currentPage, setCurrentPage] = useState(1);

    // Récupérer les workflows depuis l’API
    const fetchWorkflows = async (): Promise<Workflow[]> => {
        const response = await axiosPrivate.get("/workflows");
        return response.data as Workflow[];
    };

    const { isLoading, error, data: workflows } = useQuery({
        queryKey: ["workflows"],
        queryFn: fetchWorkflows,
    });

    // Filtrer les workflows en fonction du terme de recherche
    const filteredWorkflows = workflows?.filter((workflow) =>
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculer la pagination
    const totalPages = filteredWorkflows?.length === undefined ? 0 : Math.ceil(filteredWorkflows.length / itemsPerPage);
    const currentWorkflows = filteredWorkflows?.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
                <div className={workflows?.length !== 0 ? "min-w-[1102px]" : "h-[calc(100vh-28rem)] flex items-center justify-center"}>
                    {isLoading ? (
                        error ? (
                            <p className="text-center">Erreur lors du chargement des données</p>
                        ) : (
                            <Loader className="h-64" />
                        )
                    ) : workflows?.length === 0 ? (
                        <p className="py-4 font-medium text-gray-800 dark:text-white/90">
                            Aucun workflow enregistré
                        </p>
                    ) : (
                        <>
                            <Table>
                                {/* Table Header */}
                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <TableRow>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Nom
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Nombre d’étapes
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Statut
                                        </TableCell>
                                        <TableCell
                                            isHeader
                                            className="flex justify-end px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                                        >
                                            Détails
                                        </TableCell>
                                    </TableRow>
                                </TableHeader>

                                {/* Table Body */}
                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {currentWorkflows?.map((workflow) => (
                                        <TableRow key={workflow.id}>
                                            <TableCell className="px-5 py-4 sm:px-6 text-start">
                                                <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                    {workflow.name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {workflow.steps.length}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                                {workflow.active ? "Actif" : "Inactif"}
                                            </TableCell>
                                            <TableCell className="flex justify-end px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                                {/*<Link to={`/user/workflow/${workflow.id}`}>*/}
                                                    <Button size="sm" variant="primary">
                                                        Voir plus de détails
                                                    </Button>
                                                {/*</Link>*/}
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
        </div>
    );
}