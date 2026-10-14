import React from 'react';
import styles from './ui.module.css';

export interface InventorySlotProps {
    icon: string;
    alt?: string;
    badge?: string | number;
    onClick?: () => void;
    title?: string;
    active?: boolean;
    disabled?: boolean;
    className?: string;
}

export const InventorySlot: React.FC<InventorySlotProps> = ({
    icon,
    alt = '',
    badge,
    onClick,
    title,
    active = false,
    disabled = false,
    className = ''
}) => {
    return (
        <div
            className={`${styles.portraitBox} ${active ? styles.active : ''} ${disabled ? styles.gameBtnDisabled : ''} ${className}`.trim()}
            onClick={disabled ? undefined : onClick}
            title={title}
        >
            <img src={icon} alt={alt} className={styles.portraitImg} />
            {badge !== undefined && <div className={styles.badge}>{badge}</div>}
        </div>
    );
};
