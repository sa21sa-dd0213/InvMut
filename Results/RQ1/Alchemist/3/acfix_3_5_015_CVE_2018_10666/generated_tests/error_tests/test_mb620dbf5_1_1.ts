import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - mb620dbf5", function () {
  it("should revert when non-admin calls setOwner due to onlyAdmin modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the admin (admin is msg.sender during deployment, which is owner)
    // Calling setOwner from addr1 should revert in original, but succeed in mutant
    await expect(
      instance.connect(addr1).setOwner(addr2.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});