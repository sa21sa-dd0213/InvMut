import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should kill mutant m6bb5652f: send ether when depositsCount is zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially depositsCount should be 0
    expect(await instance.depositsCount()).to.equal(0);

    // Send 1 wei to trigger receive() when depositsCount is 0
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: 1
    });
    await tx.wait();

    // On original contract this succeeds, on mutant it reverts
    // If transaction succeeded, depositsCount should be 1
    expect(await instance.depositsCount()).to.equal(1);
  });
});