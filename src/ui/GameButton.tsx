import React from 'react';
import styles from './ui.module.css';

export interface GameButtonProps {
    variant?: 'blue' | 'red' | 'wood';
    icon?: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    active?: boolean;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
}

export const GameButton: React.FC<GameButtonProps> = ({
    variant = 'blue',
    icon,
    children,
    onClick,
    disabled = false,
    active = false,
    className = '',
    style,
    title,
    type = 'button'
}) => {
    let variantClass = styles.gameBtnBlue;
    if (variant === 'red') variantClass = styles.gameBtnRed;
    else if (variant === 'wood') variantClass = styles.gameBtnWood;

    const activeClass = active ? styles.active : '';
    const disabledClass = disabled ? styles.gameBtnDisabled : '';

    return (
        <button
            type={type}
            className={`${styles.gameBtn} ${variantClass} ${activeClass} ${disabledClass} ${className}`.trim()}
            style={style}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            title={title}
        >
            {icon && <img src={icon} alt="" className={styles.gameBtnIcon} />}
            <span>{children}</span>
        </button>
    );
};
