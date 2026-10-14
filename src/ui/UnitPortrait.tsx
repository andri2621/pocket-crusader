import React from 'react';
import styles from './ui.module.css';

export interface UnitPortraitProps {
    avatar: string;
    alt?: string;
    badge?: string | number;
    onClick?: () => void;
    title?: string;
    className?: string;
}

export const UnitPortrait: React.FC<UnitPortraitProps> = ({
    avatar,
    alt = '',
    badge,
    onClick,
    title,
    className = ''
}) => {
    return (
        <div
            className={`${styles.portraitBox} ${className}`.trim()}
            onClick={onClick}
            title={title}
        >
            <img src={avatar} alt={alt} className={styles.portraitImg} />
            {badge !== undefined && <div className={styles.badge}>{badge}</div>}
        </div>
    );
};
