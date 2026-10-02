import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant by using a _tos array with exactly one element, causing out-of-bounds access in the mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner so transferFrom will succeed
    await token.mint(owner.address, ethers.parseEther("100"));
    
    // Approve the airPort contract to spend tokens from owner
    await token.connect(owner).approve(await instance.getAddress(), ethers.parseEther("10"));

    // Create array with exactly one recipient
    const recipients = [addr1.address];
    const value = ethers.parseEther("1");

    // This should succeed on original (loop i < 1, runs once)
    // On mutant (i <= 1, runs twice, accessing index 1 which is out of bounds) it should revert
    await expect(
      instance.connect(owner).transfer(
        owner.address,
        await token.getAddress(),
        recipients,
        value
      )
    ).to.be.reverted;
  });
});