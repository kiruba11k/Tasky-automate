import { cx } from './cx';

/** Rounded surface section (original: `rt`). */
export function Card({ children, className }) {
  return <section className={cx('rounded-card bg-surface p-5 shadow-soft', className)}>{children}</section>;
}

export default Card;
