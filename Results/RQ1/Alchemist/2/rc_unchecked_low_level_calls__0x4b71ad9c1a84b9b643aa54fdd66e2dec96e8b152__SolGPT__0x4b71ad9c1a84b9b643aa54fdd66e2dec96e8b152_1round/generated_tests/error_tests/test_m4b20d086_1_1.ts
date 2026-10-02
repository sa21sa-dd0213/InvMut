import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m4b20d086 test", function () {
  it("should detect the mutant that changes loop condition from < to >", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the airPort contract
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(instance.target, ethers.parseEther("100"));

    // Prepare test data
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("10");

    // Record balances before
    const balanceBefore1 = await token.balanceOf(addr1.address);
    const balanceBefore2 = await token.balanceOf(addr2.address);

    // Call transfer on the airPort contract
    const tx = await instance.transfer(owner.address, token.target, recipients, value);
    await tx.wait();

    // Check balances after - if the mutant is present, loop never executes and no transfers happen
    const balanceAfter1 = await token.balanceOf(addr1.address);
    const balanceAfter2 = await token.balanceOf(addr2.address);

    // In the original, both recipients would receive tokens
    // In the mutant, balances remain unchanged
    expect(balanceAfter1).to.equal(balanceBefore1 + value);
    expect(balanceAfter2).to.equal(balanceBefore2 + value);
  });
});