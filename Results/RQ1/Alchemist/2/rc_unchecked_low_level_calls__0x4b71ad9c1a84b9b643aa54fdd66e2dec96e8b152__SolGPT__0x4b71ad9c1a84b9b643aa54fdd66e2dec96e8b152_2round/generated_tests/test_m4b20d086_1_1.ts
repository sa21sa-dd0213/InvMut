import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should kill mutant m4b20d086 by verifying transfers execute for non-empty recipients array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use for transferFrom testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);
    await token.approve(await instance.getAddress(), mintAmount);

    // Setup: transfer tokens from owner to addr1 so they can be transferredFrom
    const transferAmount = ethers.parseEther("100");
    await token.transfer(addr1.address, transferAmount);

    // Approve airPort to spend addr1's tokens
    await token.connect(addr1).approve(await instance.getAddress(), transferAmount);

    // Record balances before
    const balanceBefore1 = await token.balanceOf(addr1.address);
    const balanceBefore2 = await token.balanceOf(addr2.address);

    // Call transfer with a non-empty recipients array
    const recipients = [addr2.address];
    const transferValue = ethers.parseEther("10");
    await instance.transfer(addr1.address, await token.getAddress(), recipients, transferValue);

    // Verify that transfers actually occurred (should fail on mutant where loop never executes)
    const balanceAfter1 = await token.balanceOf(addr1.address);
    const balanceAfter2 = await token.balanceOf(addr2.address);

    expect(balanceAfter1).to.equal(balanceBefore1 - transferValue);
    expect(balanceAfter2).to.equal(balanceBefore2 + transferValue);
  });
});