import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m9aef3487 by settling exactly one block after lockInGuess", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Lock in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(owner).lockInGuess(guessHash, { value: ethers.parseEther("1") });

    // Get the block number after lockInGuess
    const lockBlock = await ethers.provider.getBlock("latest");
    const targetBlock = lockBlock!.number + 1;

    // Mine one block so we are exactly at targetBlock
    await ethers.provider.send("evm_mine");

    // Verify we are at the correct block
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock!.number).to.equal(targetBlock);

    // On original contract this should revert because block.number is not > guesses[msg.sender].block
    // On mutant, the condition block.number-1 > guesses[msg.sender].block will be false (0 > 0 is false)
    // So the require will pass and settlement will proceed, which is incorrect behavior
    await expect(instance.connect(owner).settle()).to.be.reverted;
  });
});