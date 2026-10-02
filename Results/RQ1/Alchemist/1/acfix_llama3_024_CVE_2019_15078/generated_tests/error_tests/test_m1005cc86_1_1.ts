import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m1005cc86 test", function () {
  it("should revert when transferFrom amount equals allowance (mutant uses < instead of <=)", async function () {
    const [owner, from, spender] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner distributes tokens to 'from' address to have balance
    // First, get tokens for 'from' by calling getTokens (requires not blacklisted and distribution not finished)
    // Send ether to trigger getTokens via receive()
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Alternatively, we can directly use the distr function via owner? No, distr is private.
    // But owner can call getTokens too. Let's have 'from' call getTokens with some value
    // Actually, getTokens is public but requires not blacklisted. Let's make 'from' call it.
    // However, getTokens uses msg.sender. So we need 'from' to call it.
    // But 'from' needs to send ether? getTokens is payable. Let's send ether from 'from'.
    await from.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now 'from' should have some balance. Let's get the balance.
    const fromBalance = await instance.balanceOf(from.address);
    expect(fromBalance).to.be.gt(0);

    // Approve spender to spend exactly the full balance
    await instance.connect(from).approve(spender.address, fromBalance);

    // Now spender attempts to transferFrom 'from' to another address using exact allowance amount
    // In original: require(_amount <= allowed) passes when equal
    // In mutant: require(_amount < allowed) reverts when equal
    await expect(
      instance.connect(spender).transferFrom(from.address, owner.address, fromBalance)
    ).to.be.reverted;

    // Also verify that transfer with slightly less than full balance succeeds in mutant
    const lessAmount = fromBalance - 1n;
    await instance.connect(from).approve(spender.address, lessAmount);
    await expect(
      instance.connect(spender).transferFrom(from.address, owner.address, lessAmount)
    ).to.not.be.reverted;
  });
});