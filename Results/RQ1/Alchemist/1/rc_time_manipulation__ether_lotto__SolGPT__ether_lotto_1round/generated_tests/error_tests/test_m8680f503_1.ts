import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant m8680f503 detection", function () {
  it("should detect the mutated winning condition by verifying player wins only when random != 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const TICKET_AMOUNT = ethers.parseEther("10");
    const FEE_AMOUNT = ethers.parseEther("1");

    // Play multiple times and track outcomes
    let winsWhenRandomZero = 0;
    let winsWhenRandomOne = 0;

    for (let i = 0; i < 20; i++) {
      // Get current block info before playing
      const blockBefore = await ethers.provider.getBlock("latest");
      const timestamp = blockBefore!.timestamp + 1;
      const difficulty = blockBefore!.difficulty;

      // Compute expected random value for this play
      const expectedRandom = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256"],
            [timestamp, difficulty]
          )
        )
      ) % 2n;

      // Player plays
      const playerBalanceBefore = await ethers.provider.getBalance(player.address);
      const playTx = await instance.connect(player).play({ value: TICKET_AMOUNT });
      await playTx.wait();
      const playerBalanceAfter = await ethers.provider.getBalance(player.address);

      const netChange = playerBalanceAfter - playerBalanceBefore;

      // Determine if player won (received pot minus fee)
      if (netChange > 0n) {
        if (expectedRandom === 0n) {
          winsWhenRandomZero++;
        } else {
          winsWhenRandomOne++;
        }
      }
    }

    // In the original contract, player wins only when random == 0
    // In the mutant, player wins only when random != 0
    // So we assert that wins happen when random != 0 (mutant behavior)
    expect(winsWhenRandomZero).to.equal(0);
    expect(winsWhenRandomOne).to.be.greaterThan(0);
  });
});