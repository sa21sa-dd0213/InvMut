import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant test - m6b54eced (missing frozen recipient check)", function () {
  it("should revert when transferring to a frozen account", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const token = await Factory.deploy(initialSupply, "TestToken", "TTK");
    await token.waitForDeployment();

    // Freeze addr1's account
    await token.freezeAccount(addr1.address, true);

    // Attempt to transfer tokens from owner to frozen addr1 - should revert
    await expect(
      token.transfer(addr1.address, ethers.parseEther("10"))
    ).to.be.reverted;
  });
});