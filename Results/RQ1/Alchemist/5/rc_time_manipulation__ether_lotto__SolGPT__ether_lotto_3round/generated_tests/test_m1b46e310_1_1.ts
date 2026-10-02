import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant kill test - m1b46e310", function () {
  it("should detect the division mutant by verifying correct payout amount on win", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const ticketAmount = 10n;
    const feeAmount = 1n;

    // Play multiple rounds until we get a win (random == 0)
    let won = false;
    let playerBalanceBefore = await ethers.provider.getBalance(player.address);

    while (!won) {
      // Record block timestamp and difficulty before tx to calculate what random would be
      const blockBefore = await ethers.provider.getBlock("latest");
      
      // Send transaction
      const tx = await instance.connect(player).play({ value: ticketAmount });
      const receipt = await tx.wait();

      // Calculate what random was for this block
      const blockAfter = await ethers.provider.getBlock(receipt.blockNumber);
      const random = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256"],
            [blockAfter.timestamp, blockAfter.difficulty]
          )
        )
      ) % 2n;

      if (random === 0n) {
        won = true;
        const playerBalanceAfter = await ethers.provider.getBalance(player.address);
        const expectedPayout = ticketAmount - feeAmount; // pot was ticketAmount before payout
        const actualPayout = playerBalanceAfter - playerBalanceBefore - ticketAmount; // net gain minus ticket sent
        
        // Original sends pot - fee = 9, mutant sends pot / fee = 10
        expect(actualPayout).to.equal(expectedPayout);
      } else {
        // Reset balance tracking for next round
        playerBalanceBefore = await ethers.provider.getBalance(player.address);
      }
    }
  });
});