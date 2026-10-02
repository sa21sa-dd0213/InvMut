import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should kill mutant m4b20d086 by verifying all recipients receive the transfer", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();

    // Deploy a mock ERC20 token that implements transferFrom
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy airPort
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Give the 'from' address some tokens
    await token.mint(from.address, ethers.parseEther("100"));

    // Approve the airPort contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare recipients array
    const recipients = [recipient1.address, recipient2.address];
    const transferAmount = ethers.parseEther("10");

    // Record balances before
    const balanceBefore1 = await token.balanceOf(recipient1.address);
    const balanceBefore2 = await token.balanceOf(recipient2.address);

    // Call transfer function
    await instance.transfer(from.address, await token.getAddress(), recipients, transferAmount);

    // Check balances after - in original, both should have received tokens
    // In mutant (i>_tos.length), loop never executes so no transfers happen
    const balanceAfter1 = await token.balanceOf(recipient1.address);
    const balanceAfter2 = await token.balanceOf(recipient2.address);

    // Assert that both recipients received the tokens
    expect(balanceAfter1 - balanceBefore1).to.equal(transferAmount);
    expect(balanceAfter2 - balanceBefore2).to.equal(transferAmount);
  });
});