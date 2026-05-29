"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { type SolicitudUI, type SolicitudDetail } from "@/lib/bandeja";
import { ModalHeader, ModalTabs, type DetailModalTab } from "./ModalHeader";
import { MotorJsonView, ResumenSolicitud } from "./DetailContent";

function isDetail(s: SolicitudUI): s is SolicitudDetail {
    return s.raw != null;
}

interface RequestDetailModalProps {
    solicitud: SolicitudUI;
    initialTab: DetailModalTab;
    onClose: () => void;
    onGestionar?: () => void;
}

export function RequestDetailModal({
    solicitud,
    initialTab,
    onClose,
    onGestionar,
}: RequestDetailModalProps) {
    const [activeTab, setActiveTab] = useState<DetailModalTab>(initialTab);
    const detail = isDetail(solicitud) ? solicitud : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative flex flex-col bg-white w-[98vw] max-w-[98vw] h-[94vh] shadow-2xl border border-[#0D0D0D]/10 rounded-md overflow-hidden">
                <ModalHeader
                    solicitud={solicitud}
                    onClose={onClose}
                    onGestionar={onGestionar}
                />
                <ModalTabs active={activeTab} onChange={setActiveTab} />
                <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {detail ? (
                        <>
                            {activeTab === "campos"     && <ResumenSolicitud solicitud={detail} />}
                            {activeTab === "motor_json" && <MotorJsonView    solicitud={detail} hideExpand />}
                        </>
                    ) : (
                        <div className="flex h-full items-center justify-center gap-2 text-[#0D0D0D]/35">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-medium">Cargando detalle…</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
