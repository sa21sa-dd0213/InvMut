import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mc8eaf088", function () {
  it("should kill the mutant by settling exactly one block after lockInGuess", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess for the next block
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.lockInGuess(dummyHash, { value: ethers.parseEther("1") });
    await lockTx.wait();

    // Get the block number after lockInGuess to know the guessed block
    const afterLockBlock = await ethers.provider.getBlockNumber();
    // The guessed block is afterLockBlock (since lockInGuess sets block.number + 1)

    // Mine one more block so that block.number > guessed block (original condition passes)
    await ethers.provider.send("evm_mine", []);

    // Now block.number should equal the guessed block + 1
    const currentBlock = await ethers.provider.getBlockNumber();
    expect(currentBlock).to.be.greaterThan(afterLockBlock);

    // Attempt to settle - should revert for the mutant because it requires block.number < guessed block
    // but block.number is now greater than guessed block
    await expect(instance.settle()).to.be.reverted;
  });
});