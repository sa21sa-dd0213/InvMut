import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test", function () {
  it("should detect the msg.value+1 mutation by verifying withdrawal matches deposit amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    const tx = await instance.connect(addr1).deposit({ value: depositAmount });
    await tx.wait();

    // Get addr1's balance before withdrawal
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Attempt to withdraw all funds
    const withdrawTx = instance.connect(addr1).withdrawAll();
    
    // The mutant records credit[addr1] = depositAmount + 1 = 2 wei
    // But contract only has 1 wei balance, so the call should revert due to insufficient funds
    await expect(withdrawTx).to.be.reverted;

    // Verify addr1's balance remained unchanged (no withdrawal happened)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    expect(balanceAfter).to.equal(balanceBefore);
  });
});