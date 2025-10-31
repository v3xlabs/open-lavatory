import { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import classNames from 'classnames';

import { ChevronDownIcon } from '../../icons';

interface AccordionProps {
    children: ComponentChildren;
    className?: string;
}

interface AccordionItemProps {
    title: string;
    badge?: string;
    action?: ComponentChildren;
    children: ComponentChildren;
    defaultOpen?: boolean;
}

export const Accordion = ({ children, className }: AccordionProps) => (
    <div className={classNames('flex flex-col gap-3', className)}>{children}</div>
);

export const AccordionItem = ({
    title,
    badge,
    action,
    children,
    defaultOpen = true,
}: AccordionItemProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const toggleOpen = () => setIsOpen((prev) => !prev);

    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 px-4 py-3">
                <button
                    type="button"
                    className="flex flex-1 items-center gap-2 text-left"
                    onClick={toggleOpen}
                    aria-expanded={isOpen}
                >
                    <span className="font-semibold text-gray-900 text-base">{title}</span>
                    {badge && (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                            {badge}
                        </span>
                    )}
                </button>
                {action && <div className="shrink-0 text-sm text-gray-600">{action}</div>}
                <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                    aria-label={isOpen ? 'Collapse section' : 'Expand section'}
                    onClick={toggleOpen}
                >
                    <span
                        className={classNames('text-gray-500 transition-transform duration-200', {
                            'rotate-180': isOpen,
                        })}
                    >
                        <ChevronDownIcon size={18} />
                    </span>
                </button>
            </div>
            <div
                className={classNames(
                    'grid transition-all duration-200 ease-in-out',
                    isOpen
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                )}
            >
                <div
                    className={classNames(
                        'overflow-hidden border-t border-gray-100 bg-gray-50 px-4 transition-all duration-200',
                        isOpen ? 'py-4' : 'py-0'
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
