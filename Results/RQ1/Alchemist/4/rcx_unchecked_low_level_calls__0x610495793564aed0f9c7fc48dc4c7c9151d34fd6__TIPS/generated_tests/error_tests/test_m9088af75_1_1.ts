import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m9088af75 test", function () {
  it("should revert when non-owner calls withdrawAll (kills mutant that removes require(msg.sender == owner))", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call withdrawAll from a non-owner address - should revert in original, pass in mutant
    await expect(
      instance.connect(nonOwner).withdrawAll()
    ).to.be.reverted;
  });
});