import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection (me7abb034)", function () {
  it("should revert when lockInGuess is called with msg.value > 1 ether, detecting the mutant that changed == to >=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hashToLock = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // The original contract requires exactly 1 ether; sending 2 ether should revert
    await expect(
      instance.connect(addr1).lockInGuess(hashToLock, { value: ethers.parseEther("2") })
    ).to.be.reverted;
  });
});