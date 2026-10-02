import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transfer function arithmetic mutation", function () {
  it("should kill mutant m19f33acb by detecting multiplication instead of addition in transfer", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balances
    const initialOwnerBalance = await instance.balanceOf(owner.address);
    const initialAddr1Balance = await instance.balanceOf(addr1.address);
    const initialAddr2Balance = await instance.balanceOf(addr2.address);

    // First, ensure addr1 has some tokens to transfer
    // Use distr function indirectly via getTokens which distributes tokens
    // Send ETH to trigger getTokens for addr1 to receive initial tokens
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now addr1 should have tokens from the distribution
    const addr1BalanceAfterDist = await instance.balanceOf(addr1.address);

    // Transfer some tokens from owner to addr2 to set up addr2 with a known balance
    const transferAmountToAddr2 = ethers.parseEther("100");
    await instance.transfer(addr2.address, transferAmountToAddr2);

    const addr2BalanceBefore = await instance.balanceOf(addr2.address);
    expect(addr2BalanceBefore).to.equal(transferAmountToAddr2);

    // Now addr1 transfers tokens to addr2
    // Get addr1's balance for the transfer
    const addr1Balance = await instance.balanceOf(addr1.address);
    const transferAmount = ethers.parseEther("10");

    // Ensure addr1 has enough balance
    expect(addr1Balance).to.be.gte(transferAmount);

    // Execute transfer from addr1 to addr2
    await instance.connect(addr1).transfer(addr2.address, transferAmount);

    // Check addr2's balance after transfer
    const addr2BalanceAfter = await instance.balanceOf(addr2.address);

    // In the original contract: balances[_to] = balances[_to] + _amount
    // Expected: addr2BalanceAfter = addr2BalanceBefore + transferAmount
    // In the mutant: balances[_to] = balances[_to] * _amount
    // Mutant would give: addr2BalanceAfter = addr2BalanceBefore * transferAmount

    // The test asserts the original behavior (addition)
    // This will fail on the mutant which does multiplication
    expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + transferAmount);

    // Also verify that addr1's balance decreased correctly
    const addr1BalanceAfter = await instance.balanceOf(addr1.address);
    expect(addr1BalanceAfter).to.equal(addr1Balance - transferAmount);
  });
});