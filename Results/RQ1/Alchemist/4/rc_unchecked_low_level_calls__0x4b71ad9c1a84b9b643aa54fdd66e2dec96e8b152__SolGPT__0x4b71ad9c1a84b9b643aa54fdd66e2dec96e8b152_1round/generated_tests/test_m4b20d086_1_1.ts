import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - loop condition change", function () {
  it("should detect mutant where i<_tos.length is changed to i>_tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like token to test transfers
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve contract to transfer
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.approve(instance.target, mintAmount);

    // Get initial balance of addr1
    const initialBalance = await token.balanceOf(addr1.address);

    // Prepare test parameters
    const from = owner.address;
    const tokenAddress = token.target;
    const recipients = [addr1.address];
    const value = ethers.parseEther("10");

    // Execute transfer function
    const tx = await instance.transfer(from, tokenAddress, recipients, value);
    await tx.wait();

    // Check that balance changed - if mutant is live (loop never executes), balance won't change
    const finalBalance = await token.balanceOf(addr1.address);

    // Original contract would have transferred tokens, mutant would not
    expect(finalBalance).to.equal(initialBalance + value);
  });
});