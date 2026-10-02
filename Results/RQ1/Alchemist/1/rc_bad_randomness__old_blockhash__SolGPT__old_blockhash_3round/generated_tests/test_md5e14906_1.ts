import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - Kill mutant md5e14906", function () {
  it("should deploy with exactly 1 ether and succeed (mutant changes == to != so it will revert)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("PredictTheBlockHashChallenge");
    
    // Original contract requires msg.value == 1 ether for deployment
    // Mutant requires msg.value != 1 ether, so sending exactly 1 ether will revert
    await expect(
      Factory.deploy({ value: ethers.parseEther("1") })
    ).to.not.be.reverted;
    
    // Actually deploy to verify
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
  });
});