import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m6672bd70", function () {
  it("should revert when non-owner calls NETM() in original but succeed in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call NETM() from a non-owner address
    // In the original contract (with onlyOwner modifier), this should revert
    // In the mutant (without modifier), this would succeed
    await expect(
      instance.connect(addr1).NETM()
    ).to.be.reverted;
  });
});