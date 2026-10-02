import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should revert when settle is called before the predicted block is reached", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in a guess with 1 ether
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const lockTx = await instance.connect(player).lockInGuess(guessHash, {
      value: ethers.parseEther("1")
    });
    await lockTx.wait();
    
    // Try to settle immediately in the same block (before predicted block is reached)
    // This should revert in the original contract because block.number is not > guesses[player].block
    await expect(
      instance.connect(player).settle()
    ).to.be.reverted;
  });
});