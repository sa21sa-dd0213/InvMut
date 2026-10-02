import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call onlyOwner functions and revert when non-owner calls them", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Owner should be able to call freezeAccount without revert
    await expect(instance.connect(owner).freezeAccount(addr1.address, true)).to.not.be.reverted;

    // Non-owner should NOT be able to call freezeAccount (should revert)
    await expect(instance.connect(addr1).freezeAccount(owner.address, true)).to.be.reverted;
  });
});