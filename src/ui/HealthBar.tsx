import React from 'react';
import styles from './ui.module.css';

export interface HealthBarProps {
    current: number;
    max: number;
    showLabel?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export const HealthBar: React.FC<HealthBarProps> = ({
    current,
    max,
    showLabel = true,
    className = '',
    style
}) => {
    const safeMax = Math.max(1, max);
    const ratio = Math.max(0, Math.min(1, current / safeMax));
    const percent = Math.round(ratio * 100);
    const isDanger = ratio < 0.3;

    return (
        <div className={`${styles.healthBarContainer} ${className}`.trim()} style={style}>
            <div
                className={`${styles.healthBarFill} ${isDanger ? styles.healthBarFillDanger : ''}`}
                style={{ width: `${percent}%` }}
            />
            {showLabel && (
                <div className={styles.healthBarText}>
                    {Math.max(0, Math.round(current))} / {max}
                </div>
            )}
        </div>
    );
};
