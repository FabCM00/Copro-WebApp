import React from "react";

interface AuthIllustrationPageProps {
    imageSrc: string;
    imageAlt: string;
    title: string;
    body: string;
    children?: React.ReactNode;
}

/**
 * Página de estado completa (éxito / error) para los flujos de auth.
 *
 * FIX: El header usa `position: absolute` para no consumir espacio en el flujo.
 * El contenedor principal centra respecto a toda la pantalla, no al espacio
 * restante bajo el header (que era el bug de desplazamiento visual).
 */
export function AuthIllustrationPage({
    imageSrc,
    imageAlt,
    title,
    body,
    children,
}: AuthIllustrationPageProps) {
    return (
        <div className="relative min-h-screen bg-white">

            {/* Header como overlay: no desplaza el contenido central */}
            <header className="absolute inset-x-0 top-0 z-10 flex w-full items-center px-6 py-4">
                <img
                    src="/Imagen1.png"
                    alt="Want N' Get"
                    className="h-8 w-auto object-contain sm:h-9"
                />
            </header>

            {/* Centra respecto a TODO el viewport, no al espacio bajo el header */}
            <div className="flex min-h-screen items-center justify-center p-6">
                <div className="flex w-full max-w-[420px] flex-col items-center gap-6">

                    {/* 
                        aspect-ratio evita saltos de layout mientras carga la imagen.
                        object-contain preserva proporciones sin distorsión.
                    */}
                    <div className="w-full max-w-[400px]">
                        <img
                            src={imageSrc}
                            alt={imageAlt}
                            className="h-auto w-full select-none object-contain"
                            draggable={false}
                            // Evita que el motor de arrastre nativo interfiera en mobile
                            onDragStart={(e) => e.preventDefault()}
                        />
                    </div>

                    <div className="flex flex-col gap-2 text-center">
                        <h1 className="text-3xl font-bold text-[#012340]">
                            {title}
                        </h1>
                        <p className="text-base leading-relaxed text-[#0D0D0D]/55">
                            {body}
                        </p>
                    </div>

                    {children && (
                        <div className="flex w-full flex-col gap-3">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}