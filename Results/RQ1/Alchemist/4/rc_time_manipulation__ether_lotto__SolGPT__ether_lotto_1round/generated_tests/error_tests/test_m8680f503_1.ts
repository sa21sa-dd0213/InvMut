import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m8680f503 by verifying correct payout only when random == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times to cover both random outcomes (0 and 1)
    for (let attempt = 0; attempt < 20; attempt++) {
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      const bankBalanceBefore = await ethers.provider.getBalance(owner.address);
      const potBefore = await instance.pot();

      const tx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      const receipt = await tx.wait();

      // Extract the block timestamp and difficulty used for randomness
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const random = BigInt(
        ethers.solidityPackedKeccak256(
          ["uint256", "uint256"],
          [block.timestamp, block.difficulty]
        )
      ) % 2n;

      const potAfter = await instance.pot();

      if (random === 0n) {
        // Original behavior: player gets pot - fee, bank gets fee, pot resets to 0
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        const bankBalanceAfter = await ethers.provider.getBalance(owner.address);

        expect(playerBalanceAfter).to.equal(
          playerBalanceBefore - TICKET_AMOUNT + potBefore + TICKET_AMOUNT - FEE_AMOUNT
        );
        expect(bankBalanceAfter).to.equal(bankBalanceBefore + FEE_AMOUNT);
        expect(potAfter).to.equal(0n);
      } else {
        // random == 1: no payout, pot accumulates
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        expect(playerBalanceAfter).to.equal(playerBalanceBefore - TICKET_AMOUNT);
        expect(potAfter).to.equal(potBefore + TICKET_AMOUNT);
      }
    }
  });
});