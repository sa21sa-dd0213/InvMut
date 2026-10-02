import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - receive function", function () {
  it("should kill mutant by sending ether and verifying depositsCount increments", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial depositsCount
    const initialCount = await instance.depositsCount();
    expect(initialCount).to.equal(0n);

    // Send ether to trigger receive() function
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();

    // Check that depositsCount incremented
    const finalCount = await instance.depositsCount();
    expect(finalCount).to.equal(1n);

    // Verify the original contract would pass, mutant would revert
    // The mutant's require(((depositsCount + 1) == depositsCount)) is always false
    // so the transaction would revert before incrementing
  });
});