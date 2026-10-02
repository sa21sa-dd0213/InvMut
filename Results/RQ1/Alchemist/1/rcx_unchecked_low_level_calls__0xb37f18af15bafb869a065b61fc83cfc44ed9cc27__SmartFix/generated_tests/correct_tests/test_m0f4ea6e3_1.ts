import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m0f4ea6e3 (receive: >= replaced with <=)", function () {
  it("should allow ETH deposits via receive() and increment depositsCount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial depositsCount
    const initialCount = await instance.depositsCount();
    expect(initialCount).to.equal(0n);

    // Send 1 ETH to the contract via receive() - should succeed in original
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Check depositsCount incremented
    const finalCount = await instance.depositsCount();
    expect(finalCount).to.equal(1n);
  });
});