import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m16e102ae", function () {
  it("should fail when deploying without sending exactly 1 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Attempt to deploy with 0 ether (mutant allows this, original should revert)
    await expect(
      Factory.deploy({ value: 0 })
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'require(msg.value == 1 ether)'");
  });
  
  it("should successfully deploy with exactly 1 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    expect(await ethers.provider.getBalance(instance.target)).to.equal(ethers.parseEther("1"));
  });
  
  it("should kill the mutant by deploying with 0 ether and then attempting to interact", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy with 0 ether - mutant allows this, original would revert
    const instance = await Factory.deploy({ value: 0 });
    await instance.waitForDeployment();
    
    // Verify contract was deployed despite missing required ether
    expect(await ethers.provider.getBalance(instance.target)).to.equal(0);
    
    // Try to lock in a guess - should succeed on mutant (but contract has no funds)
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await instance.connect(owner).lockInGuess(guessHash, { value: ethers.parseEther("1") });
    
    // Mine blocks to advance past the lock
    for (let i = 0; i < 2; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Settle the guess - this will fail because contract has no ether to transfer
    await expect(
      instance.connect(owner).settle()
    ).to.be.reverted;
  });
});