import React from 'react';
import styles from './ui.module.css';

export interface GamePanelProps {
    variant?: 'wood' | 'paper';
    type?: 'modal' | 'card' | 'panel';
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const GamePanel: React.FC<GamePanelProps> = ({
    variant = 'wood',
    type = 'panel',
    className = '',
    style,
    children,
    onClick
}) => {
    const variantClass = variant === 'paper' ? styles.gamePanelPaper : '';
    const typeClass = type === 'modal' ? styles.gamePanelModal : (type === 'card' ? styles.gamePanelCard : '');

    return (
        <div
            className={`${styles.gamePanel} ${variantClass} ${typeClass} ${className}`.trim()}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};
