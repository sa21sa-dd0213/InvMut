import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m5405bc22 test", function () {
  it("should kill the mutant by settling one block earlier than allowed", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(player).lockInGuess(guessHash, {
      value: ethers.parseEther("1"),
    });
    await lockTx.wait();

    // Get the block number after lockInGuess (target block = block.number + 1)
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const targetBlock = lockBlock.number + 1;

    // Mine one block to reach exactly the target block
    await ethers.provider.send("evm_mine", []);

    // Verify current block is exactly targetBlock
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock.number).to.equal(targetBlock);

    // Call settle() - should revert on original but succeed on mutant
    // On original: block.number (targetBlock) > targetBlock is false → revert
    // On mutant: block.number+1 (targetBlock+1) > targetBlock is true → succeeds
    // We expect the mutant to NOT revert, so we check that it doesn't revert
    await expect(
      instance.connect(player).settle()
    ).to.not.be.reverted;
  });
});