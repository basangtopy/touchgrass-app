export default function Disclaimer() {
  return (
    <div className="w-full max-w-md mt-8 pt-6 border-t border-white/10 text-center opacity-60 hover:opacity-100 transition-opacity pb-6 px-4">
      <p className="text-[10px] text-gray-300 leading-relaxed">
        <strong className="text-rose-400">HEADS UP:</strong> TouchGrass is a
        decentralized protocol – your funds are held in a smart contract, not a
        wallet. If you don't verify in time, you{" "}
        <strong className="text-white">will lose your stake</strong> as per your
        chosen penalty. By connecting, you accept this risk. The devs can't help
        you get it back.
      </p>
    </div>
  );
}
