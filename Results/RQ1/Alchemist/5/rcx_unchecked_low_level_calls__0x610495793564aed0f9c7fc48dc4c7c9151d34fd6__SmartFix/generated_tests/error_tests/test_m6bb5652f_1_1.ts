import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m6bb5652f test", function () {
  it("should revert when sending ether to receive() with depositsCount = 0 due to underflow", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial depositsCount is 0
    expect(await instance.depositsCount()).to.equal(0);

    // Attempt to send ether via receive() - should revert on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    await expect(tx).to.be.reverted;
  });
});