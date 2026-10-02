import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant me0c67ac8 - missing return true", function () {
  it("should return true when transfer succeeds, but mutant returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like contract to test transferFrom call
    const tokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await tokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1
    await token.mint(addr1.address, ethers.parseEther("100"));

    // Approve the demo contract to spend tokens from addr1
    await token.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Setup: addr1 approves demo contract, then transfer should succeed
    const recipients = [addr2.address];
    const value = ethers.parseEther("10");

    // Call transfer function
    const tx = await instance.transfer(addr1.address, token.target, recipients, value);
    const receipt = await tx.wait();

    // Get the return value from the transaction
    const returnData = await instance.callStatic.transfer(addr1.address, token.target, recipients, value);

    // Original returns true, mutant returns false
    expect(returnData).to.equal(true);
  });
});