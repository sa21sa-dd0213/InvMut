import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant md66284a7 test", function () {
  it("should kill mutant by calling SetMinSum before Initialized", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call SetMinSum BEFORE Initialized() is called
    // In original: should succeed (initialized is false)
    // In mutant: should revert (if(true) always reverts)
    await expect(
      instance.SetMinSum(ethers.parseEther("1"))
    ).to.not.be.reverted;
  });
});