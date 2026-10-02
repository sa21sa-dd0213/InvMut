import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant test for m3474fafc", function () {
  it("should kill mutant by sending value >= contract balance and verifying transfer occurs", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance
    const initialBalance = ethers.parseEther("10");
    await owner.sendTransaction({
      to: contractAddress,
      value: initialBalance
    });

    // Verify contract has initial balance
    expect(await ethers.provider.getBalance(contractAddress)).to.equal(initialBalance);

    // Get addr1's balance before
    const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call multiplicate with value equal to contract balance (should trigger transfer in original)
    const tx = await instance.connect(owner).multiplicate(addr1.address, { value: initialBalance });
    await tx.wait();

    // In the original, contract balance becomes 0 and addr1 gets 2x initialBalance
    // In the mutant (if false), contract balance stays same and addr1 gets nothing
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);

    // Assert that the transfer happened (mutant would fail this assertion)
    expect(contractBalanceAfter).to.equal(0);
    expect(addr1BalanceAfter - addr1BalanceBefore).to.equal(initialBalance * 2n);
  });
});