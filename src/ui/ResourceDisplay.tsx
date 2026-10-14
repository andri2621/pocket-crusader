import React from 'react';
import styles from './ui.module.css';

export interface ResourceDisplayProps {
    type: 'wood' | 'gold' | 'pop';
    value: number | string;
    icon?: string;
    title?: string;
    className?: string;
}

export const ResourceDisplay: React.FC<ResourceDisplayProps> = ({
    type,
    value,
    icon,
    title,
    className = ''
}) => {
    let defaultIcon = '/assets/tiny-swords/UI Elements/UI Elements/Icons/log.png';
    if (type === 'gold') {
        defaultIcon = '/assets/tiny-swords/UI Elements/UI Elements/Icons/coin.png';
    } else if (type === 'pop') {
        defaultIcon = '/assets/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatar_Pawn_Blue.png';
    }

    const iconSrc = icon || defaultIcon;

    return (
        <div className={`${styles.resourceDisplay} ${className}`.trim()} title={title || type}>
            <img src={iconSrc} alt={type} className={styles.resourceIcon} />
            <span className={styles.resourceValue}>{value}</span>
        </div>
    );
};
