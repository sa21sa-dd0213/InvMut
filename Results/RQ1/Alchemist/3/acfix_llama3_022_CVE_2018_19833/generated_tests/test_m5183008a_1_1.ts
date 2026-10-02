import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls onlyOwner function (detect mutant removing require from modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TST");
    await instance.waitForDeployment();

    // Attempt to call freezeAccount from a non-owner address - should revert if modifier works correctly
    await expect(
      instance.connect(addr1).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});