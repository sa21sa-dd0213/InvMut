import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mc8eaf088 - detect reversed require condition", function () {
  it("should revert when settling after target block has passed (mutant expects block.number < target)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.lockInGuess(guessHash, { value: ethers.parseEther("1") });
    await lockTx.wait();

    // Wait for the target block (block.number + 1) to be in the past
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1;
    while ((await ethers.provider.getBlockNumber()) <= targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Original would succeed here, mutant should revert because block.number > targetBlock
    await expect(instance.settle()).to.be.reverted;
  });
});