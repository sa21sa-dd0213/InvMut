import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant detection - owned function", function () {
  it("should detect mutant m3066fa16 by calling owned() from owner and expecting no revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(
      1000,
      "TestToken",
      "TTK"
    );
    await instance.waitForDeployment();

    // In the original contract, owned() should succeed when called by owner
    // In the mutant, require(msg.sender != owner) causes revert when called by owner
    await expect(instance.owned()).to.not.be.reverted;
  });
});