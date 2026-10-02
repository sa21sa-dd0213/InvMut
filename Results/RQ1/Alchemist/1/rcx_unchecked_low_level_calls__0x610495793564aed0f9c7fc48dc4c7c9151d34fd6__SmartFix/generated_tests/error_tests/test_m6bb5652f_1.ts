import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m6bb5652f - receive function", function () {
  it("should kill the mutant by sending ether after a first deposit succeeds, expecting the second deposit to revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit should succeed in both original and mutant
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx1.wait();

    // Verify depositsCount is 1
    expect(await instance.depositsCount()).to.equal(1);

    // Second deposit: original allows it, mutant reverts due to require((depositsCount - 1) >= depositsCount)
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.5")
      })
    ).to.be.reverted;
  });
});