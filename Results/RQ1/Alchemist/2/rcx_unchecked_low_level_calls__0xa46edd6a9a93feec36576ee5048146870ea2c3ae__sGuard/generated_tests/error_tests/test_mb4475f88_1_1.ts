import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - loop boundary", function () {
  it("should detect out-of-bounds loop by checking for extra transfer call", async function () {
    const [owner, from, recipient] = await ethers.getSigners();

    // Deploy a simple ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));

    // Deploy EBU (no constructor arguments)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const instance = await EBUFactory.deploy();
    await instance.waitForDeployment();

    // Approve the EBU contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Get initial balance of recipient
    const initialBalance = await token.balanceOf(recipient.address);

    // Call transfer with single recipient and value
    const tos = [recipient.address];
    const values = [ethers.parseEther("10")];

    // Execute the transfer
    const tx = await instance.connect(owner).transfer(from.address, await token.getAddress(), tos, values);
    await tx.wait();

    // Original: only 1 transfer should happen
    // Mutant: attempts a second transfer to address(0) with value 0
    // If token reverts on zero-address transfer, this test will catch it
    // If token doesn't revert, check balance shows only 1 transfer occurred
    const finalBalance = await token.balanceOf(recipient.address);
    const expectedBalance = initialBalance + ethers.parseEther("10");

    // This assertion will pass on original but fail on mutant
    expect(finalBalance).to.equal(expectedBalance);

    // Additional check: verify no tokens were burned/lost to zero address
    const totalSupply = await token.totalSupply();
    const ownerBalance = await token.balanceOf(owner.address);
    const fromBalance = await token.balanceOf(from.address);
    const contractBalance = await token.balanceOf(await instance.getAddress());
    const recipientBalance = await token.balanceOf(recipient.address);

    // All tokens should be accounted for
    const accountedBalance = ownerBalance + fromBalance + contractBalance + recipientBalance;
    expect(accountedBalance).to.equal(totalSupply);
  });
});