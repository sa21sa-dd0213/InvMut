import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection test", function () {
  it("should detect the mutant where == is replaced with != in the play function", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = 10n;
    const FEE_AMOUNT = 1n;

    // Record balances before playing
    const bankBalanceBefore = await ethers.provider.getBalance(owner.address);
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // We need to find a block timestamp and difficulty combination where random == 0
    // We can mine blocks until we get the desired condition
    let randomResult = 1n;
    let attempts = 0;
    const maxAttempts = 100;

    while (randomResult !== 0n && attempts < maxAttempts) {
      // Mine a new block to change timestamp
      await ethers.provider.send("evm_mine", []);
      attempts++;

      // Get current block info
      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timestamp = block!.timestamp;
      const difficulty = block!.difficulty || block!.prevrandao || 0n;

      // Compute what random would be
      const encoded = ethers.solidityPacked(
        ["uint256", "uint256"],
        [timestamp, difficulty]
      );
      const hash = ethers.keccak256(encoded);
      randomResult = BigInt(hash) % 2n;
    }

    // Now call play with the right block context
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: TICKET_AMOUNT,
    });
    await tx.wait();

    // Get balances after
    const bankBalanceAfter = await ethers.provider.getBalance(owner.address);
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // In the original contract, if random == 0, bank gets FEE_AMOUNT and player gets pot - FEE_AMOUNT
    // In the mutant, the transfer happens when random != 0 instead
    // Since we forced random == 0, the original would transfer, the mutant would not

    // Check that the pot was reset to 0 (mutant would leave pot unchanged if random != 0 condition not met)
    const potAfter = await instance.pot();
    expect(potAfter).to.equal(0n);

    // Check bank received fee (mutant would not transfer)
    expect(bankBalanceAfter - bankBalanceBefore).to.equal(FEE_AMOUNT);

    // Check player received pot minus fee (mutant would not transfer)
    expect(playerBalanceAfter - playerBalanceBefore).to.equal(TICKET_AMOUNT - FEE_AMOUNT);
  });
});