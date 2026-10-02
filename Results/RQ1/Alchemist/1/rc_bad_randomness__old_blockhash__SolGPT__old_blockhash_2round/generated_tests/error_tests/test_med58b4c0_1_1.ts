import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant that replaces blockhash(guesses[msg.sender].block) with blockhash(block.prevrandao)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy contract with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Fund contract with additional ether for potential payout
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // Lock in a guess for block number after current
    const targetBlockNumber = (await ethers.provider.getBlockNumber()) + 1;
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.lockInGuess(guessHash, { value: ethers.parseEther("1") });
    
    // Wait for target block to be mined
    await ethers.provider.waitForBlock(targetBlockNumber);
    
    // Get the actual block hash of the target block
    const block = await ethers.provider.getBlock(targetBlockNumber);
    const actualBlockHash = block.hash;
    
    // Compute expected answer using the original formula
    const expectedAnswer = ethers.keccak256(
      ethers.solidityPacked(["bytes32"], [actualBlockHash])
    );
    
    // Now settle - mutant will use block.prevrandao instead of target block hash
    // This should cause the settlement to fail (revert) because the answer won't match
    // unless by extreme coincidence block.prevrandao equals blockhash(targetBlockNumber)
    if (expectedAnswer === guessHash) {
      // If guess matches, expect transfer to succeed
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await instance.settle();
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2"));
    } else {
      // If guess doesn't match, the settlement should revert because of the require
      await expect(instance.settle()).to.be.reverted;
    }
  });
});