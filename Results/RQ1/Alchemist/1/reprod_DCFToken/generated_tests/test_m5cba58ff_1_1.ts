import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - setCfg zero validation", function () {
  it("should revert when calling setCfg(0) on original contract but succeed on mutant (division by zero)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const liquidityReceiveAddress = addr1.address;

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the caller (cfo) to owner for testing
    await instance.setCaller(owner.address);

    // Attempt to set deadCfg to 0 - should revert on original due to require(_deadCfg > 0)
    await expect(
      instance.setCfg(0)
    ).to.be.revertedWith(""); // Empty revert reason as mutant removes require
  });
});