import styles from './Loader.module.css';

export default function Loader() {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>
        <span className={styles.icon}>💸</span>
        <span className={styles.title}>BillSplit AI</span>
      </div>
      <div className={styles.spinner}></div>
    </div>
  );
}
