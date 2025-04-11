import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxiosPrivate } from "../hooks/useAxiosPrivate.ts";
import Select from "../components/form/Select.tsx";
import Label from "../components/form/Label.tsx";
import { jsPDF } from "jspdf";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import ReactSelect from "react-select";
import {ApiError} from "../types/types.ts";
import Alert from "../components/ui/alert/Alert.tsx";
import {Patient} from "../types/medicalTypes.ts";
import Button from "../components/ui/button/Button.tsx";
import Input from "../components/form/input/InputField.tsx";
import Loader from "../components/ui/Loader.tsx"; // Importer react-select

interface ValidationErrors {
  date?: string;
  patient_id?: string,
  type?: string,
  notes?: string,
  general?: string
  error?: string
  message?: string
}

// Schéma de validation pour un rendez-vous
const appointmentSchema = z.object({
  patient_id: z.string().min(1, "Le patient est requis"),
  date: z.string().min(1, "La date est requise"),
  type: z.enum(["consultation", "analyse", ""], {
    errorMap: () => ({ message: "Le type de rendez-vous est requis" }),
  }),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentEvent extends EventInput {
  id: string;
  extendedProps: {
    patient_id: number;
    status: string;
    notes: string;
    date: string;
    notified?: boolean;
  };
}

const Calendar: React.FC = () => {
  const axiosPrivate = useAxiosPrivate();
  // const [sending , setSending] = useState(false);
  const queryClient = useQueryClient();
  const [error, setError] = useState<ValidationErrors>({});
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedEvent, setSelectedEvent] = useState<AppointmentEvent | null>(null);

  // Récupérer les patients et les médecins
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await axiosPrivate.get("/patients");
      return response.data;
    },
  });

  // Récupérer les rendez-vous
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      try {
        const response = await axiosPrivate.get("/appointments");
        console.log(response.data)
        return response.data;
      } catch (error) {
        console.log(error)
      }
    },
  });

  // Formatter les rendez-vous pour FullCalendar
  const events: AppointmentEvent[] = appointments?.map((appt: AppointmentEvent) => ({
    id: appt.id.toString(),
    title: `${appt.patient.first_name} ${appt.patient.last_name} - ${appt.status}`,
    start: appt.date,
    end: new Date(new Date(appt.date?.toString()||"").getTime() + 30 * 60 * 1000), // Durée de 30 minutes
    extendedProps: {
      patient_id: appt.patient_id,
      type: appt.type,
      status: appt.status,
      notified: appt.notified,
      notes: appt.notes,
      reminderSent: appt.reminder_sent || false,
    },
  })) || [];

  // Configuration de React Hook Form
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patient_id: "",
      date: "",
      type: undefined,
      notes: "",
    },
  });

  // Mutation pour ajouter ou mettre à jour un rendez-vous
  const mutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      setError({});
      if (selectedEvent) {
        // Mise à jour
        const response = await axiosPrivate.put(`/appointments/${selectedEvent.id}`, data);
        return response.data;
      } else {
        // Création
        const response = await axiosPrivate.post("/appointments", data);
        console.log(response.data)
        return response.data;
      }

    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      console.log(data)
      closeModal();
      reset({
        patient_id: "",
        date: "",
        type: undefined,
        notes: "",
      });
      setError({
        message: data.message
      });
      setSelectedEvent(null);
      // setSending(true)
      // setTimeout(() => setSending(false), 2500);
    },
    onError: (error: ApiError) => {
      if (error.response?.status === 422) {
        // Gérer les erreurs de validation côté serveur
        setError(error.response.data.errors || {});
      } else {
        setError({
          general: "Une erreur est survenu",
          message: error.response?.data.message
        })
        console.log(error.response)
      }
      console.error("Erreur lors de l’ajout/mise à jour du rendez-vous", error);
    },
  });

  // Mutation pour supprimer un rendez-vous
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosPrivate.delete(`/appointments/${id}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      closeModal();
      setSelectedEvent(null);
      setError({message: data.message})
    },
  });

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    reset({
      date: selectInfo.end.toISOString().slice(0, 16)
    });
    setSelectedEvent(null);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event as unknown as AppointmentEvent;
    setSelectedEvent(event);
    reset({
      patient_id: event.extendedProps.patient_id.toPrecision(),
      date: (event.start as Date).toISOString().slice(0, 16),
      notes: event.extendedProps.notes || "",
    });
    openModal();
  };

  const onSubmit = (data: AppointmentFormData) => {
    setError({});
    mutation.mutate(data);
  };

  const handleDelete = () => {
    if (selectedEvent) {
      deleteMutation.mutate(selectedEvent.id);
    }
  };

  // Exporter les rendez-vous en PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Rapport des rendez-vous", 10, 10);
    events.forEach((event, index) => {
      doc.text(
          `${index + 1}. ${event.title} - ${event.start?.toString()}`,
          10,
          20 + index * 10
      );
    });
    doc.save("rendez-vous.pdf");
  };

  // Options pour les patients (format compatible avec react-select)
  const patientOptions = patients?.map((p: Patient) => ({
    value: p.id.toString(),
    label: `${p.first_name} ${p.last_name}`, // Assure-toi que les champs sont corrects (firstName et lastName)
  })) || [];

  return (
      <>
        <PageMeta
            title="Gestion des rendez-vous"
            description="Calendrier des rendez-vous pour la gestion des patients"
        />
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="custom-calendar">
            {mutation.isSuccess&& !!error.message &&
                <Alert variant="success" seconds={3} title="Opération effectué" message={error.message}/>
            }
            {deleteMutation.isSuccess&& !!error.message &&
                <Alert variant="success" seconds={3} title="Opération effectué" message={error.message}/>
            }

            {isLoading?
                <Loader className="h-screen" /> :
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next addEventButton",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay exportButton",
                }}
                events={events}
                selectable={true}
                select={handleDateSelect}
                eventClick={handleEventClick}
                eventContent={renderEventContent}
                customButtons={{
                  addEventButton: {
                    text: "Ajouter un rendez-vous +",
                    click: () => {
                      reset({
                        patient_id: "",
                        date: "",
                        type: undefined,
                        notes: "",
                      });
                      setSelectedEvent(null);
                      openModal();
                    },
                  },
                  exportButton: {
                    text: "Exporter en PDF",
                    click: exportToPDF,
                  },
                }}
            />}
          </div>
          <Modal
              isOpen={isOpen}
              onClose={() => {
                setError({});
                reset({
                  patient_id: "",
                  date: "",
                  type: undefined,
                  notes: "",
                });
                setSelectedEvent(null);
                closeModal();

              }}
              className="max-w-[700px] p-6 lg:p-10"
          >
            <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
              {mutation.isError&& !!error.message &&
                  <Alert variant="error" seconds={5} title="Opération échoué" message={error.message}/>
              }
              <div>
                <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                  {selectedEvent ? "Modifier le rendez-vous" : "Ajouter un rendez-vous"}
                </h5>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Planifiez ou modifiez un rendez-vous pour un patient
                </p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
                <div>
                  <Label>Patient</Label>
                  <Controller
                      name="patient_id"
                      control={control}
                      render={({ field }) => (
                          <ReactSelect
                              options={patientOptions}
                              placeholder="Rechercher un patient..."
                              value={patientOptions.find((option: { value: string; }) => option.value === field.value) || null}
                              onChange={(selectedOption) => field.onChange(selectedOption ? selectedOption.value : "")}
                              isClearable
                              isSearchable
                              className="text-sm text-gray-800 dark:text-white/30 dark:placeholder:text-white/30"
                              classNamePrefix="react-select"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  borderColor: errors.patient_id || error.patient_id ? "#EF4444" : "#D1D5DB",
                                  backgroundColor: "transparent",
                                  padding: "0.25rem",
                                  borderRadius: "0.5rem",
                                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                                  "&:hover": {
                                    borderColor: errors.patient_id || error.patient_id ? "#EF4444" : "#93C5FD",
                                  },
                                }),
                                menu: (base) => ({
                                  ...base,
                                  backgroundColor: "#fff",
                                  color: "#374151",
                                  borderRadius: "0.5rem",
                                }),
                                option: (base, state) => ({
                                  ...base,
                                  backgroundColor: state.isSelected ? "#3B82F6" : state.isFocused ? "#EFF6FF" : "#fff",
                                  color: state.isSelected ? "#fff" : "#374151",
                                  "&:active": {
                                    backgroundColor: "#DBEAFE",
                                  },
                                }),
                                singleValue: (base) => ({
                                  ...base,
                                  color: "#9CA3AF",
                                }),
                                placeholder: (base) => ({
                                  ...base,
                                  color: "#9CA3AF",
                                }),
                              }}
                          />
                      )}
                  />
                  {errors.patient_id && (
                      <p className="mt-1.5 text-xs text-error-500">{errors.patient_id.message}</p>
                  )}
                  {error.patient_id && (
                      <p className="mt-1.5 text-xs text-error-500">{error.patient_id}</p>
                  )}
                </div>

                <div className="mt-6">
                  <Label>Date et heure</Label>
                  <Input
                      type="datetime-local"
                      {...register("date")}
                      error={!!errors.date?.message || !!error.date}
                      hint={errors.date?.message || error.date}
                  />
                </div>
                <div className="mt-6">
                  <Label>Type de rendez-vous</Label>
                  <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                          <Select
                              options={[
                                { value: "consultation", label: "Consultation" },
                                { value: "analyse", label: "Analyse" },
                              ]}
                              placeholder="Sélectionner le type"
                              value={field.value}
                              onChange={(value) => field.onChange(value)}
                              error={!!errors.type}
                              hint={errors.type?.message}
                          />
                      )}
                  />
                </div>

                <div className="mt-6">
                  <Label>Notes (facultatif)</Label>
                  <Input
                      type="text"
                      {...register("notes")}
                      error={!!errors.notes?.message || !!error.notes}
                      hint={errors.notes?.message || error.notes}
                  />
                </div>
                {error.general && (
                    <div className="mb-4 mt-2 p-3 rounded bg-red-100 text-red-700">
                      {error.general}
                    </div>
                )}
                {error.error && (
                    <div className="mb-4 p-3 rounded bg-red-100 text-red-700">
                      {error.error}
                    </div>
                )}

                <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
                  <Button disabled={deleteMutation.isPending||mutation.isPending} variant="outline"
                      onClick={() => {
                        closeModal();reset({
                          patient_id: "",
                          date: "",
                          type: undefined,
                          notes: "",
                        });setSelectedEvent(null);
                      }}>
                    Fermer
                  </Button>
                  {selectedEvent? (
                      <Button type="button" disabled={deleteMutation.isPending} onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                        {deleteMutation.isPending ? "Annulation en cours  ..." : "Annuler le rendez-vous"}
                      </Button>
                  ): (
                      <Button disabled={mutation.isPending} variant={mutation.isPending? "outline":"primary"}>
                        {mutation.isPending? "Ajout en cours ...": "Ajouter"}
                      </Button>
                  )}
                </div>
              </form>
            </div>
          </Modal>
        </div>
      </>
  );
};

const renderEventContent = (eventInfo: AppointmentEvent) => {
  const status = eventInfo.event.extendedProps.status;
  const colorClass =
      status === "confirmed"
          ? "fc-bg-success"
          : status === "scheduled"
              ? "fc-bg-primary"
              : "fc-bg-danger";
  const color =
      colorClass === "fc-bg-success"
          ? "text-green-500"
          : colorClass === "fc-bg-primary"
              ? "text-blue-500"
              : "fc-bg-danger";
  return (
      <div
          className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
      >
        <div className="fc-daygrid-event-dot"></div>
        <div className={` fc-event-time ${color} `}>{eventInfo.timeText}</div>
        <div className="fc-event-title">{eventInfo.event.title}</div>
        {eventInfo.event.extendedProps.notified && (
            <span className="ml-2 text-xs text-green-500">Rappel envoyé</span>
        )}
      </div>
  );
};

export default Calendar;