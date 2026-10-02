import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant mf5cce91c (transferFrom zero address check removed)", function () {
  it("should revert when transferring tokens to address(0) via transferFrom", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First approve addr1 to spend owner's tokens
    const approveAmount = ethers.parseEther("100");
    await instance.connect(owner).approve(addr1.address, approveAmount);

    // Now attempt to transferFrom owner to address(0) using addr1
    // Original contract reverts with require(_to != address(0))
    // Mutant allows the transfer to proceed (which should be caught by this test)
    await expect(
      instance.connect(addr1).transferFrom(
        owner.address,
        ethers.ZeroAddress,
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});