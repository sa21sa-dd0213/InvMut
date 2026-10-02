import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - m84b73a6a", function () {
  it("should kill the mutant by sending ether and expecting the deposit to succeed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Record initial deposits count
    const initialCount = await instance.depositsCount();
    
    // Send ether to trigger the receive() function - this should succeed on original
    // but revert on mutant due to the == comparison
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Verify the deposit was processed successfully
    const finalCount = await instance.depositsCount();
    expect(finalCount).to.equal(initialCount + 1n);
  });
});