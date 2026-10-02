import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mfbc2f195 - transfer amount check", function () {
  it("should kill the mutant by transferring less than full balance, which reverts on mutant but succeeds on original", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribute tokens to addr1 so they have a balance
    // The contract starts with distribution not finished and owner has totalDistributed
    // We need to call getTokens() from addr1 to give them some tokens
    // But first, we need to ensure addr1 is not blacklisted and distribution is not finished

    // Send ether to trigger getTokens via receive() - value is initially 2500e18
    // Actually let's use the distr function indirectly through getTokens
    // Get some ether to send for tokens
    const initialBalance = await ethers.provider.getBalance(addr1.address);

    // Send exactly 1 wei to trigger getTokens (value is 2500e18, but we just need to trigger the function)
    // The getTokens function will give value tokens (2500e18) to the sender
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now call getTokens from addr1 to give them tokens
    // First, ensure addr1 is not blacklisted by calling getTokens directly
    const tx = await instance.connect(addr1).getTokens({
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // Now addr1 should have 2500e18 tokens (value)
    const addr1Balance = await instance.balanceOf(addr1.address);

    // Transfer only a portion of addr1's balance (not the full amount)
    const transferAmount = addr1Balance / 2n; // Half of the balance

    // This should succeed on original (amount <= balance) but fail on mutant (amount == balance required)
    await expect(
      instance.connect(addr1).transfer(owner.address, transferAmount)
    ).to.be.reverted; // The mutant will revert because amount != full balance

    // Additional check: verify the transfer did NOT happen
    const finalBalance = await instance.balanceOf(addr1.address);
    expect(finalBalance).to.equal(addr1Balance); // Balance unchanged because tx reverted
  });
});