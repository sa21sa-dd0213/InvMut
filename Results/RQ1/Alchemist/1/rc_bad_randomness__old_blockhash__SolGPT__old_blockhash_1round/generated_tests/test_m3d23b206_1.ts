import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant m3d23b206 by exploiting the == 0 condition change", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess of 0x0 for a block far in the future (>256 blocks ahead)
    const lockTx = await instance.connect(player).lockInGuess(
      ethers.ZeroHash,
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();

    // Get the target block number (block.number + 1 at time of lock)
    const targetBlock = await ethers.provider.getBlockNumber();

    // Mine enough blocks so the target block becomes unreachable (more than 256 blocks old)
    const blocksToMine = 300;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now settle - in the mutant, answer == 0 and guess == 0x0, so the condition becomes true
    // and the contract would incorrectly try to transfer 2 ether, which should revert
    // because the contract only has 1 ether (from deployment)
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});