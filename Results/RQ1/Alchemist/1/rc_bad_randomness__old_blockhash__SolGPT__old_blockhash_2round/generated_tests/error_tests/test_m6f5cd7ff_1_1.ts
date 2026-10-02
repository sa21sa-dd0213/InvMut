import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant m6f5cd7ff by locking in a zero guess and settling", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Fund the player with 1 ether for the lockInGuess call
    await owner.sendTransaction({
      to: player.address,
      value: ethers.parseEther("1")
    });
    
    // Player locks in a guess of zero
    const zeroGuess = ethers.ZeroHash;
    await instance.connect(player).lockInGuess(zeroGuess, { value: ethers.parseEther("1") });
    
    // Advance to next block to satisfy the block.number > guesses[player].block condition
    await ethers.provider.send("evm_mine", []);
    
    // Settle the guess - in the original, this should revert because 0 != blockhash
    // In the mutant, 0 <= blockhash is true, so it would succeed (kill the mutant)
    const tx = instance.connect(player).settle();
    
    // The test expects a revert because the original contract requires exact match
    await expect(tx).to.be.reverted;
  });
});