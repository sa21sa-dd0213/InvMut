import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m0c4573f7 test", function () {
  it("should revert when _tos array is empty in original, but mutant passes silently", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Transfer some tokens to owner for the test (so transferFrom can succeed)
    await token.mint(owner.address, ethers.parseEther("100"));

    // Approve the airPort contract to spend tokens (if needed by the actual contract logic)
    // Note: The original contract uses transferFrom, so we need approval from owner
    await token.connect(owner).approve(instance.target, ethers.parseEther("100"));

    // Test with empty _tos array - should revert in original but pass in mutant
    await expect(
      instance.transfer(owner.address, token.target, [], ethers.parseEther("10"))
    ).to.be.reverted;
  });
});