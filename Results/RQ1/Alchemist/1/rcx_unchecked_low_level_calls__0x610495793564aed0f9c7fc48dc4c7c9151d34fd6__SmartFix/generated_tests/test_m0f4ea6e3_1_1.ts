import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - m0f4ea6e3", function () {
  it("should succeed in depositing Ether via receive() on original, but fail on mutant where condition is reversed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial deposits count
    const initialCount = await instance.depositsCount();
    expect(initialCount).to.equal(0n);

    // Send Ether to trigger receive() - this should succeed on original
    // and increment depositsCount. On mutant, it should revert because
    // the condition (depositsCount + 1) <= depositsCount is false.
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Verify depositsCount increased - this assertion will fail on mutant
    // because the transaction would have reverted, and we won't reach here.
    const newCount = await instance.depositsCount();
    expect(newCount).to.equal(1n);
  });
});