import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should revert when settling in the same block as the target block (kills mutant with >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for the next block
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.lockInGuess(dummyHash, { value: ethers.parseEther("1") });
    await lockTx.wait();

    // Get the target block number
    const targetBlock = (await ethers.provider.getBlock("latest"))!.number + 1;

    // Mine a block so we are at the target block
    await ethers.provider.send("evm_mine", []);

    // Verify we are now at the target block
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock!.number).to.equal(targetBlock);

    // Attempt to settle - should revert because block.number >= targetBlock is too early
    await expect(instance.settle()).to.be.reverted;
  });
});