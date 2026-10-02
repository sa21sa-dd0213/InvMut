import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mded6cd15 - sha256 instead of keccak256", function () {
  it("should revert when calling transfer with a valid token contract that expects keccak256-based selector", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();

    // Deploy a simple ERC20-like token that implements transferFrom
    // We need a contract that will revert if called with wrong selector
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Setup: give some tokens to 'from' address
    const amount = ethers.parseEther("100");
    await token.mint(from.address, amount);
    
    // Approve demo contract to spend tokens
    await token.connect(from).approve(await demo.getAddress(), amount);

    // Attempt to transfer using demo.transfer - should revert because sha256 selector doesn't match
    const recipients = [to.address];
    await expect(
      demo.transfer(from.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;

    // Verify no tokens were transferred (the call didn't actually execute transferFrom)
    expect(await token.balanceOf(to.address)).to.equal(0);
  });
});