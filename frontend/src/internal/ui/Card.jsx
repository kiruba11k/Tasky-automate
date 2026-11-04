import { cx } from './cx';

/** Rounded surface section (original: `rt`). */
export function Card({ children, className, ...rest }) {
  return <section className={cx('rounded-card bg-surface p-5 shadow-soft', className)} {...rest}>{children}</section>;
}

export default Card;
