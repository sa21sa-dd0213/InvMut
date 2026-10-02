import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls onlyOwner function (detect mutant that removes require(msg.sender == owner))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Attempt to call freezeAccount (onlyOwner function) from a non-owner address
    await expect(
      instance.connect(addr1).freezeAccount(addr1.address, true)
    ).to.be.reverted;
  });
});