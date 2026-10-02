import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transfer balance mutation", function () {
  it("should kill mutant mb8a1ff0f by checking sender balance decreases after transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund owner with initial tokens via constructor (balances[owner] = totalDistributed)
    const initialBalance = await instance.balanceOf(owner.address);
    const transferAmount = ethers.parseEther("1000");

    // Record owner's balance before transfer
    const balanceBefore = await instance.balanceOf(owner.address);

    // Execute transfer from owner to addr1
    const tx = await instance.connect(owner).transfer(addr1.address, transferAmount);
    await tx.wait();

    // Get owner's balance after transfer
    const balanceAfter = await instance.balanceOf(owner.address);

    // Assert: sender balance should have decreased by exactly transferAmount
    // Original: balanceAfter = balanceBefore - transferAmount
    // Mutant:   balanceAfter = balanceBefore + transferAmount (wrong)
    expect(balanceAfter).to.equal(balanceBefore - transferAmount);

    // Also verify receiver got the tokens
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount);
  });
});