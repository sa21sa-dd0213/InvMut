import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8bd0577c test", function () {
  it("should kill mutant by verifying transferFrom calls are made for all recipients", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments as per the original demo)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token contract to verify transferFrom calls
    // We'll deploy a simple ERC20-like contract for testing
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();

    const tokenAddress = await mockToken.getAddress();
    const fromAddress = from.address;
    const recipients = [recipient1.address, recipient2.address];
    const value = ethers.parseEther("1");

    // Fund the 'from' address with tokens and approve the demo contract
    await mockToken.mint(fromAddress, ethers.parseEther("100"));
    await mockToken.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call the transfer function on the demo contract
    const tx = await instance.transfer(fromAddress, tokenAddress, recipients, value);
    await tx.wait();

    // Check that recipients received the tokens (original loop executes, mutant does not)
    const balance1 = await mockToken.balanceOf(recipient1.address);
    const balance2 = await mockToken.balanceOf(recipient2.address);

    // In original: both recipients should have value
    // In mutant (i > _tos.length): loop never runs, so balances stay 0
    expect(balance1).to.equal(value);
    expect(balance2).to.equal(value);
  });
});