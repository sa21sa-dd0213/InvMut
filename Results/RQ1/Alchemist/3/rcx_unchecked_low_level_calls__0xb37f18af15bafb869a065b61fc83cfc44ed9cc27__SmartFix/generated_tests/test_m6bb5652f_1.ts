import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m6bb5652f: make two deposits and expect the second to succeed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit - should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx1.wait();

    // Second deposit - succeeds on original, but mutant will revert because depositsCount > 0
    // and require((depositsCount - 1) >= depositsCount) will be false
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await expect(tx2.wait()).to.not.be.rejected;

    // Verify that depositsCount increased to 2
    expect(await instance.depositsCount()).to.equal(2);
  });
});