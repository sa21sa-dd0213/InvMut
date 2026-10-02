import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant m8bd0577c test", function () {
  it("should detect mutant that uses > instead of < in loop condition", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 token that has transferFrom function
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy();
    await token.waitForDeployment();

    // Give owner some tokens and approve the airdrop contract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(owner.address, mintAmount);

    const airdropFactory = await ethers.getContractFactory("airdrop");
    const airdrop = await airdropFactory.deploy();
    await airdrop.waitForDeployment();

    // Owner approves airdrop contract to spend tokens
    const approveAmount = ethers.parseEther("100");
    await token.approve(airdrop.target, approveAmount);

    // Prepare recipients
    const recipients = [addr1.address, addr2.address];
    const transferAmount = ethers.parseEther("10");

    // Get initial balances
    const initialBalance1 = await token.balanceOf(addr1.address);
    const initialBalance2 = await token.balanceOf(addr2.address);

    // Call the transfer function
    const tx = await airdrop.transfer(owner.address, token.target, recipients, transferAmount);
    await tx.wait();

    // Get final balances
    const finalBalance1 = await token.balanceOf(addr1.address);
    const finalBalance2 = await token.balanceOf(addr2.address);

    // In the original, balances should increase
    // In the mutant (i > _tos.length), the loop never executes, so balances stay the same
    expect(finalBalance1).to.equal(initialBalance1 + transferAmount);
    expect(finalBalance2).to.equal(initialBalance2 + transferAmount);
  });
});