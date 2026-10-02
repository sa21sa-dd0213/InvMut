import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should kill mutant m0f4ea6e3 by sending ether twice and checking depositsCount increments", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit should succeed in both original and mutant
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Get depositsCount after first deposit
    let count = await instance.depositsCount();
    expect(count).to.equal(1n);

    // Second deposit - this should fail in the mutant (since depositsCount+1 <= depositsCount is false)
    // but succeed in the original
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // If mutant is killed, this assertion will fail (count will still be 1)
    count = await instance.depositsCount();
    expect(count).to.equal(2n);
  });
});