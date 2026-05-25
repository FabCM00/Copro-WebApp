"use client";

import { useState } from "react";
import { type SolicitudUI } from "@/lib/supabase";
import { ModalHeader, ModalTabs, type DetailModalTab } from "./ModalHeader";
import { MotorJsonView, ResumenSolicitud } from "./DetailContent";

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
                    {activeTab === "campos" && <ResumenSolicitud solicitud={solicitud} />}
                    {activeTab === "motor_json" && <MotorJsonView solicitud={solicitud} hideExpand />}
                </div>
            </div>
        </div>
    );
}
