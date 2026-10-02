import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant m58885218 by calling withdraw from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some ether to the contract so it has a balance to withdraw
    const depositAmount = ethers.parseEther("1.0");
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: depositAmount
    });

    // Verify contract has balance
    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalanceBefore).to.equal(depositAmount);

    // Owner calls withdraw - should succeed in original, fail in mutant
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await instance.connect(owner).withdraw();
    await tx.wait();

    // Verify funds transferred to owner
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);

    // Verify contract balance is now zero
    const contractBalanceAfter = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalanceAfter).to.equal(0);
  });
});