import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test (mc9696791)", function () {
  it("should fail to deploy when sending exactly 1 ether because the mutated constructor uses msg.value+1 == 1 ether which always reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Attempt to deploy with exactly 1 ether as required by original constructor
    // The mutant changes require(msg.value == 1 ether) to require(msg.value+1 == 1 ether)
    // This means for msg.value = 1 ether, msg.value+1 = 1 ether + 1 wei, which != 1 ether
    // So the deployment should revert
    await expect(
      Factory.deploy({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});