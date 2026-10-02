import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should fail to deploy with 1 ether because mutant requires msg.value+1 == 1 ether (i.e., 0 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The mutant's constructor requires msg.value+1 == 1 ether, which means msg.value must be 0
    // Therefore, sending 1 ether should cause the deployment to revert
    await expect(
      Factory.deploy({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});