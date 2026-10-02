import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m2adfd821 test", function () {
  it("should kill mutant by verifying token transfers occur when _tos array is non-empty", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();

    // Deploy a simple ERC20 token to use for transfer testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Deploy EBU contract (no constructor args)
    const Factory = await ethers.getContractFactory("EBU");
    const ebu = await Factory.deploy();
    await ebu.waitForDeployment();

    // Mint tokens to 'from' address and approve EBU contract to spend them
    const mintAmount = ethers.parseEther("1000");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(await ebu.getAddress(), mintAmount);

    // Prepare transfer parameters
    const recipients = [recipient1.address, recipient2.address];
    const amounts = [ethers.parseEther("100"), ethers.parseEther("200")];
    const totalTransfer = amounts[0] + amounts[1];

    // Record balances before
    const fromBalanceBefore = await token.balanceOf(from.address);
    const recipient1BalanceBefore = await token.balanceOf(recipient1.address);
    const recipient2BalanceBefore = await token.balanceOf(recipient2.address);

    // Call the transfer function (which uses transferFrom internally)
    const tx = await ebu.connect(from).transfer(
      from.address,
      await token.getAddress(),
      recipients,
      amounts
    );
    await tx.wait();

    // Check balances after - in original, tokens are transferred; in mutant, nothing happens
    const fromBalanceAfter = await token.balanceOf(from.address);
    const recipient1BalanceAfter = await token.balanceOf(recipient1.address);
    const recipient2BalanceAfter = await token.balanceOf(recipient2.address);

    // If mutant is active (loop condition i > _tos.length), no transfers occur
    // so balances remain unchanged - this assertion will fail on mutant
    expect(fromBalanceAfter).to.equal(fromBalanceBefore - totalTransfer);
    expect(recipient1BalanceAfter).to.equal(recipient1BalanceBefore + amounts[0]);
    expect(recipient2BalanceAfter).to.equal(recipient2BalanceBefore + amounts[1]);
  });
});