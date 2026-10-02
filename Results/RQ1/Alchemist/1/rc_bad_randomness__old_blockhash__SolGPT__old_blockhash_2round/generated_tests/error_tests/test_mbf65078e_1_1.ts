import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should revert when address without a locked guess calls settle() (original behavior)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract with 1 ETH
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Attacker never calls lockInGuess - guesses[attacker].block remains 0
    // In original contract, settle() requires guesses[msg.sender].block != 0
    // So calling settle() without locking a guess should revert
    // In mutant, require(guesses[msg.sender].block == 0) would pass, allowing execution to continue
    await expect(
      instance.connect(attacker).settle()
    ).to.be.reverted;
  });
});