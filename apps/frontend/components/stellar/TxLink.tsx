type TxLinkProps = {
  hash: string;
  label?: string;
};

const STELLAR_EXPERT_TESTNET_BASE = "https://stellar.expert/explorer/testnet/tx";

export function TxLink({ hash, label }: TxLinkProps) {
  return (
    <a
      href={`${STELLAR_EXPERT_TESTNET_BASE}/${hash}`}
      target="_blank"
      rel="noreferrer"
      style={{
        color: "var(--mesh-blue)",
        fontFamily: "var(--mono)",
        fontSize: 12,
        textDecoration: "none",
      }}
    >
      {label ?? `${hash.slice(0, 8)}…${hash.slice(-6)}`}
    </a>
  );
}
