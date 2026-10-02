import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should revert when settle() is called without prior lockInGuess()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to call settle() directly without first calling lockInGuess()
    // In the original contract, this should revert because guesses[msg.sender].block == 0
    // In the mutant (which removes the require check), it will NOT revert, thus killing the mutant
    await expect(
      instance.connect(addr1).settle()
    ).to.be.reverted;
  });
});