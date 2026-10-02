import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - transferFrom recipient balance", function () {
  it("should detect the mutant where balances[_to] uses subtraction instead of addition in transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract - no constructor arguments needed based on the contract code
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, need to get some tokens to addr1 to allow transferFrom to work
    // Get tokens via getTokens() - need to send ETH to trigger the function
    // First ensure distribution is not finished
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await tx1.wait();

    // Now approve addr2 to spend tokens from addr1
    // First get some tokens to addr1 by calling getTokens from addr1
    const tx2 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    await tx2.wait();

    // Get initial balance of addr2
    const initialBalanceAddr2 = await instance.balanceOf(addr2.address);

    // Approve owner to spend addr1's tokens
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    await instance.connect(addr1).approve(owner.address, balanceAddr1);

    // Execute transferFrom: owner transfers tokens from addr1 to addr2
    await instance.connect(owner).transferFrom(addr1.address, addr2.address, balanceAddr1);

    // Check addr2's balance - should have increased by the transfer amount
    const finalBalanceAddr2 = await instance.balanceOf(addr2.address);

    // In the original contract: balances[_to] = balances[_to] + _amount (addition)
    // In the mutant: balances[_to] = balances[_to] - _amount (subtraction)
    // If the contract is the mutant, addr2's balance will be initialBalance - amount (underflow likely)
    // or will be a negative value (which reverts in Solidity 0.8.x)
    // We expect the transfer to succeed and increase addr2's balance
    expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + balanceAddr1);
  });
});