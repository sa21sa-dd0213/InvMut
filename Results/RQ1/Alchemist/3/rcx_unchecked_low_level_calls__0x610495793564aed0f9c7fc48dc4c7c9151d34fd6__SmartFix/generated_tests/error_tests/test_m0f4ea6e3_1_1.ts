import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m0f4ea6e3 by sending ETH via receive() and checking depositsCount increments", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial depositsCount
    const initialCount = await instance.depositsCount();
    expect(initialCount).to.equal(0n);

    // Send ETH to trigger receive() - should succeed on original, revert on mutant
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Wait for transaction to be mined
    await tx.wait();

    // Verify depositsCount was incremented (original behavior)
    const finalCount = await instance.depositsCount();
    expect(finalCount).to.equal(1n);
  });
});