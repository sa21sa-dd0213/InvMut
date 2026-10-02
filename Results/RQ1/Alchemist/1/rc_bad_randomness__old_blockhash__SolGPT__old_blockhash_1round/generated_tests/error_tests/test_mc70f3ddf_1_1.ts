import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test - mc70f3ddf", function () {
  it("should revert when sending 0 ether to lockInGuess (original behavior) but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract with 1 ether as required by constructor
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Attempt to call lockInGuess with 0 ether
    // In the original contract, this should revert because msg.value == 1 ether is required
    // In the mutant, msg.value+1 == 1 ether evaluates to true when msg.value is 0 (0+1==1)
    await expect(
      instance.connect(attacker).lockInGuess(ethers.ZeroHash, { value: 0 })
    ).to.be.reverted;
  });
});