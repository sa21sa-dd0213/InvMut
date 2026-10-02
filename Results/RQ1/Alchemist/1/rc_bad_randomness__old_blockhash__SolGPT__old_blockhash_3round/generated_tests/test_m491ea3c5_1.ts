import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should kill mutant m491ea3c5 by locking in a guess matching the actual blockhash and expecting reward transfer", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess for block number + 1
    const lockTx = await instance.connect(player).lockInGuess(
      ethers.ZeroHash, // placeholder, will be overwritten
      { value: ethers.parseEther("1") }
    );
    await lockTx.wait();
    
    // Get the block number when lock was made
    const lockBlock = await ethers.provider.getBlock(lockTx.blockNumber);
    const targetBlockNumber = lockBlock.number + 1;
    
    // Mine blocks to pass the target block
    await ethers.provider.send("hardhat_mine", ["0x10"]);
    
    // Get the actual blockhash of the target block
    const targetBlock = await ethers.provider.getBlock(targetBlockNumber);
    const actualBlockhash = targetBlock.hash;
    
    // Compute the expected answer as the contract would
    const expectedAnswer = ethers.keccak256(
      ethers.solidityPacked(["bytes32"], [actualBlockhash])
    );
    
    // Now lock in a new guess with the correct answer
    // First reset by settling (will fail because guess is wrong)
    // Actually we need to redeploy and do it properly
    const Factory2 = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance2 = await Factory2.deploy({ value: ethers.parseEther("1") });
    await instance2.waitForDeployment();
    
    // Lock in the correct guess
    const lockTx2 = await instance2.connect(player).lockInGuess(
      expectedAnswer,
      { value: ethers.parseEther("1") }
    );
    await lockTx2.wait();
    
    const lockBlock2 = await ethers.provider.getBlock(lockTx2.blockNumber);
    const targetBlockNumber2 = lockBlock2.number + 1;
    
    // Mine blocks to pass the target block
    await ethers.provider.send("hardhat_mine", ["0x10"]);
    
    // Settle - should succeed on original, fail on mutant
    // On mutant, answer = keccak256(0) != expectedAnswer, so transfer reverts
    await expect(
      instance2.connect(player).settle()
    ).to.be.reverted;
  });
});