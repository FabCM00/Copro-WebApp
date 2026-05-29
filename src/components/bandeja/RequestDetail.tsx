"use client";

import { Loader2 } from "lucide-react";
import { type SolicitudUI, type SolicitudDetail } from "@/lib/bandeja";
import { type DetailModalTab } from "./ModalHeader";
import { ModalHeader } from "./ModalHeader";
import { MotorJsonView, ResumenSolicitud } from "./DetailContent";

interface RequestDetailProps {
    solicitud: SolicitudUI | null;
    activeTab: DetailModalTab;
    onGestionar?: () => void;
}

function isDetail(s: SolicitudUI): s is SolicitudDetail {
    return s.raw != null;
}

export function RequestDetail({ solicitud, activeTab }: RequestDetailProps) {
    if (!solicitud) return null;
    const detail = isDetail(solicitud) ? solicitud : null;

    return (
        <div className="flex flex-col bg-white border-l-0 border border-[#0D0D0D]/10 h-full overflow-hidden">
            <div className="flex-shrink-0">
                <ModalHeader solicitud={solicitud} />
            </div>

            <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {detail ? (
                    <>
                        {activeTab === "campos"     && <ResumenSolicitud solicitud={detail} />}
                        {activeTab === "motor_json" && <MotorJsonView    solicitud={detail} />}
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center gap-2 text-[#0D0D0D]/35">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-medium">Cargando detalle…</span>
                    </div>
                )}
            </div>

            {solicitud.gestionado && (
                <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-4 py-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] text-[#0D0D0D]/45 font-medium">Solicitud gestionada</span>
                    {solicitud.gestionadoAt && (
                        <span className="text-[11px] text-[#0D0D0D]/35 ml-auto">
                            {new Date(solicitud.gestionadoAt).toLocaleDateString("es-CO")}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
