import React from 'react';
import styles from './ui.module.css';

export interface TitleBannerProps {
    title: string;
    subtitle?: string;
    variant?: 'blue' | 'red' | 'gold';
    className?: string;
}

export const TitleBanner: React.FC<TitleBannerProps> = ({
    title,
    subtitle,
    variant = 'blue',
    className = ''
}) => {
    let variantClass = '';
    if (variant === 'red') variantClass = styles.titleBannerRed;
    else if (variant === 'gold') variantClass = styles.titleBannerGold;

    return (
        <div className={`${styles.titleBanner} ${variantClass} ${className}`.trim()}>
            <h1 className={styles.titleText}>{title}</h1>
            {subtitle && <p className={styles.subtitleText}>{subtitle}</p>}
        </div>
    );
};
