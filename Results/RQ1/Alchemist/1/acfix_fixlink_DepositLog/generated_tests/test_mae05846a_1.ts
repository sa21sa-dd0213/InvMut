import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant mae05846a test", function () {
  it("should revert when non-owner calls setApprovedLogger due to onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setApprovedLogger from an unauthorized address
    await expect(
      instance.connect(addr1).setApprovedLogger(addr1.address, true)
    ).to.be.revertedWith("Not owner");
  });
});