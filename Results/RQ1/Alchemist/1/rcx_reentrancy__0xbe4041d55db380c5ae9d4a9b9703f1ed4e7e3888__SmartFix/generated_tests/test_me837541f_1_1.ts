import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant me837541f test", function () {
  it("should revert when calling SetLogFile after initialization", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await instance.Initialized();

    // Now calling SetLogFile should revert because intitalized is true
    await expect(
      instance.SetLogFile(owner.address)
    ).to.be.reverted;
  });
});