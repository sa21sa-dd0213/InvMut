import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m6bb5652f by sending two deposits and expecting both to succeed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first deposit
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx1.wait();

    // Verify depositsCount after first deposit
    let count = await instance.depositsCount();
    expect(count).to.equal(1);

    // Send second deposit
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx2.wait();

    // Verify depositsCount after second deposit
    count = await instance.depositsCount();
    expect(count).to.equal(2);
  });
});