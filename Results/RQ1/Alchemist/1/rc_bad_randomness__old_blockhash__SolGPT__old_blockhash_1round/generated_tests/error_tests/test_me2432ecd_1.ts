import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should kill mutant me2432ecd by calling lockInGuess with exactly 1 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // This should succeed on the original but fail on the mutant (mutant requires msg.value != 1 ether)
    await expect(
      instance.connect(owner).lockInGuess(hash, { value: ethers.parseEther("1") })
    ).to.not.be.reverted;
  });
});